const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Crear servidor HTTP
const server = http.createServer(app);

// Configurar Socket.IO con CORS habilitado
const io = socketIo(server, {
  cors: {
    origin: '*', // En producción, limitar a dominios específicos
    methods: ['GET', 'POST']
  },
  pingTimeout: 10000,
  pingInterval: 5000
});

// Almacenar información de los clientes y salas
const connectedClients = new Map();
const gameRooms = new Map();

// Validar datos de usuario
const validateUserData = (userData) => {
  return userData && 
         typeof userData.username === 'string' && 
         userData.username.length >= 3 && 
         userData.username.length <= 20;
};

// Crear o unirse a una sala de juego
const handleGameRoom = (socket, userData) => {
  const roomId = userData.gameId || `game_${Date.now()}`;
  let room = gameRooms.get(roomId);

  if (!room) {
    room = {
      id: roomId,
      players: new Set(),
      maxPlayers: 2,
      status: 'waiting'
    };
    gameRooms.set(roomId, room);
  }

  if (room.players.size >= room.maxPlayers) {
    socket.emit('room-error', { message: 'La sala está llena' });
    return null;
  }

  room.players.add(socket.id);
  socket.join(roomId);
  return roomId;
};

// Manejar conexiones de Socket.IO
io.on('connection', (socket) => {
  console.log(`Nuevo cliente conectado: ${socket.id}`);
  
  // Sistema de heartbeat
  let heartbeat = setInterval(() => {
    if (connectedClients.has(socket.id)) {
      socket.emit('ping');
    }
  }, 5000);

  socket.on('pong', () => {
    if (connectedClients.has(socket.id)) {
      connectedClients.get(socket.id).lastPong = Date.now();
    }
  });

  // Registrar nuevo cliente
  socket.on('register', (userData) => {
    try {
      if (!validateUserData(userData)) {
        socket.emit('register-error', { message: 'Datos de usuario inválidos' });
        return;
      }

      console.log(`Cliente registrado: ${userData.username}`);
      
      // No asignar automáticamente a una sala, solo registrar al usuario
      connectedClients.set(socket.id, {
        id: socket.id,
        username: userData.username,
        lastPong: Date.now()
      });
      
      // Notificar a todos los clientes sobre la lista actualizada
      io.emit('clients-updated', Array.from(connectedClients.values()));
      
      // Enviar lista de partidas disponibles
      socket.emit('games-list', getPublicGames());
    } catch (error) {
      console.error('Error en registro:', error);
      socket.emit('register-error', { message: 'Error interno del servidor' });
    }
  });
  
  // Obtener lista de clientes conectados
  socket.on('get-clients', () => {
    socket.emit('clients-updated', Array.from(connectedClients.values()));
  });
  
  // Obtener lista de partidas disponibles
  socket.on('get-games', () => {
    // Enviar lista de partidas disponibles al cliente que lo solicitó
    socket.emit('games-list', getPublicGames());
  });
  
  // Crear una nueva partida
  socket.on('create-game', () => {
    try {
      const clientInfo = connectedClients.get(socket.id);
      if (!clientInfo) {
        socket.emit('room-error', { message: 'Usuario no registrado' });
        return;
      }
      
      // Crear una nueva sala
      const roomId = `game_${Date.now()}`;
      const room = {
        id: roomId,
        players: new Set([socket.id]),
        maxPlayers: 2,
        status: 'waiting'
      };
      
      gameRooms.set(roomId, room);
      
      // Actualizar información del cliente
      clientInfo.gameId = roomId;
      
      // Notificar al cliente sobre la sala
      io.to(socket.id).emit('room-updated', {
        id: roomId,
        players: Array.from(room.players).map(id => connectedClients.get(id))
      });
      
      // Notificar a todos sobre la nueva lista de partidas
      io.emit('games-list', getPublicGames());
      
      console.log(`Partida creada: ${roomId} por ${clientInfo.username}`);
    } catch (error) {
      console.error('Error al crear partida:', error);
      socket.emit('room-error', { message: 'Error al crear partida' });
    }
  });
  
  // Unirse a una partida existente
  socket.on('join-game', (data) => {
    try {
      const { gameId } = data;
      const clientInfo = connectedClients.get(socket.id);
      
      if (!clientInfo) {
        socket.emit('room-error', { message: 'Usuario no registrado' });
        return;
      }
      
      const room = gameRooms.get(gameId);
      if (!room) {
        socket.emit('room-error', { message: 'Partida no encontrada' });
        return;
      }
      
      if (room.players.size >= room.maxPlayers) {
        socket.emit('room-error', { message: 'La partida está llena' });
        return;
      }
      
      // Unirse a la sala
      room.players.add(socket.id);
      socket.join(gameId);
      
      // Actualizar información del cliente
      clientInfo.gameId = gameId;
      
      // Notificar a todos los jugadores en la sala
      io.to(gameId).emit('room-updated', {
        id: gameId,
        players: Array.from(room.players).map(id => connectedClients.get(id))
      });
      
      // Actualizar lista de partidas disponibles
      io.emit('games-list', getPublicGames());
      
      console.log(`${clientInfo.username} se unió a la partida: ${gameId}`);
    } catch (error) {
      console.error('Error al unirse a partida:', error);
      socket.emit('room-error', { message: 'Error al unirse a la partida' });
    }
  });
  
  // Manejar mensajes de chat en una sala
  socket.on('chat-message', (data) => {
    try {
      const { roomId, message } = data;
      const clientInfo = connectedClients.get(socket.id);
      
      if (!clientInfo || !roomId) return;
      
      console.log(`Mensaje de chat recibido de ${clientInfo.username} en sala ${roomId}: ${message.substring(0, 30)}...`);
      
      // Obtener la sala
      const room = gameRooms.get(roomId);
      if (!room) {
        console.error(`Error: Sala ${roomId} no encontrada`);
        return;
      }
      
      // Enviar mensaje a todos los jugadores en la sala (incluyendo el remitente)
      io.to(roomId).emit('chat-message', {
        username: clientInfo.username,
        message: message
      });
      
      console.log(`Mensaje enviado a ${room.players.size} jugadores en sala ${roomId}`);
    } catch (error) {
      console.error('Error al procesar mensaje de chat:', error);
      socket.emit('error', { message: 'Error al enviar mensaje' });
    }
  });
  
  // Notificar inicio de juego
  socket.on('game-started', (data) => {
    const { roomId } = data;
    const clientInfo = connectedClients.get(socket.id);
    
    if (!clientInfo) return;
    
    // Notificar a todos los jugadores en la sala
    io.to(roomId).emit('game-launched', {
      username: clientInfo.username
    });
  });
  
  // Manejar solicitud de conexión P2P
  socket.on('connection-request', (data) => {
    const { targetId, offer } = data;
    console.log(`Solicitud de conexión de ${socket.id} a ${targetId}`);
    
    // Reenviar la oferta al cliente objetivo
    io.to(targetId).emit('connection-offer', {
      from: socket.id,
      fromUsername: connectedClients.get(socket.id)?.username,
      offer
    });
  });
  
  // Manejar respuesta a la oferta de conexión
  socket.on('connection-answer', (data) => {
    const { targetId, answer } = data;
    console.log(`Respuesta de conexión de ${socket.id} a ${targetId}`);
    
    // Reenviar la respuesta al cliente que inició la oferta
    io.to(targetId).emit('connection-response', {
      from: socket.id,
      answer
    });
  });
  
  // Manejar intercambio de candidatos ICE
  socket.on('ice-candidate', (data) => {
    const { targetId, candidate } = data;
    
    // Reenviar el candidato ICE al cliente objetivo
    io.to(targetId).emit('ice-candidate', {
      from: socket.id,
      candidate
    });
  });
  
  // Manejar salida de partida
  socket.on('leave-game', (data) => {
    try {
      const { roomId } = data;
      const clientInfo = connectedClients.get(socket.id);
      
      if (!clientInfo) return;
      
      const room = gameRooms.get(roomId);
      if (!room) return;
      
      // Eliminar jugador de la sala
      room.players.delete(socket.id);
      
      // Actualizar información del cliente
      delete clientInfo.gameId;
      
      // Eliminar sala si está vacía
      if (room.players.size === 0) {
        gameRooms.delete(roomId);
      } else {
        // Notificar a los jugadores restantes
        io.to(roomId).emit('room-updated', {
          id: roomId,
          players: Array.from(room.players).map(id => connectedClients.get(id))
        });
      }
      
      // Actualizar lista de partidas
      io.emit('games-list', getPublicGames());
      
      console.log(`${clientInfo.username} abandonó la partida: ${roomId}`);
    } catch (error) {
      console.error('Error al abandonar partida:', error);
    }
  });
  
  // Manejar desconexión
  socket.on('disconnect', () => {
    try {
      console.log(`Cliente desconectado: ${socket.id}`);
      
      // Limpiar heartbeat
      clearInterval(heartbeat);

      // Obtener información del cliente
      const clientInfo = connectedClients.get(socket.id);
      if (clientInfo && clientInfo.gameId) {
        const room = gameRooms.get(clientInfo.gameId);
        if (room) {
          room.players.delete(socket.id);
          
          // Eliminar sala si está vacía
          if (room.players.size === 0) {
            gameRooms.delete(clientInfo.gameId);
          } else {
            // Notificar a los jugadores restantes
            io.to(clientInfo.gameId).emit('room-updated', {
              roomId: clientInfo.gameId,
              players: Array.from(room.players).map(id => connectedClients.get(id))
            });
          }
        }
      }
      
      // Eliminar cliente de la lista
      connectedClients.delete(socket.id);
      
      // Notificar a todos los clientes sobre la lista actualizada
      io.emit('clients-updated', Array.from(connectedClients.values()));
    } catch (error) {
      console.error('Error en desconexión:', error);
    }
  });

  // Manejar reconexión
  socket.on('reconnect-attempt', (userData) => {
    try {
      if (!validateUserData(userData)) {
        socket.emit('reconnect-error', { message: 'Datos de usuario inválidos' });
        return;
      }

      // Intentar reconectar al usuario a su sala anterior
      const existingRoom = Array.from(gameRooms.values())
        .find(room => room.players.has(socket.id));

      if (existingRoom) {
        handleGameRoom(socket, { ...userData, gameId: existingRoom.id });
      }
    } catch (error) {
      console.error('Error en reconexión:', error);
      socket.emit('reconnect-error', { message: 'Error interno del servidor' });
    }
  });
});

// Ruta básica para verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.send('Servidor de señalización para Warcraft P2P funcionando correctamente');
});

// Función para obtener partidas públicas disponibles
function getPublicGames() {
  const games = [];
  
  for (const [id, room] of gameRooms.entries()) {
    // Solo incluir partidas que aún tengan espacio
    if (room.players.size < room.maxPlayers) {
      games.push({
        id,
        players: Array.from(room.players).map(playerId => {
          const player = connectedClients.get(playerId);
          return player ? { id: playerId, username: player.username } : null;
        }).filter(Boolean),
        maxPlayers: room.maxPlayers,
        status: room.status
      });
    }
  }
  
  return games;
}

// Puerto del servidor
const PORT = process.env.PORT || 3000;

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor de señalización ejecutándose en el puerto ${PORT}`);
});
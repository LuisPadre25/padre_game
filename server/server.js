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
      
      // Crear o unirse a sala de juego
      const roomId = handleGameRoom(socket, userData);
      if (!roomId) return;

      // Guardar información del cliente
      connectedClients.set(socket.id, {
        id: socket.id,
        username: userData.username,
        gameId: roomId,
        lastPong: Date.now()
      });
      
      // Notificar actualizaciones
      const roomInfo = gameRooms.get(roomId);
      io.to(roomId).emit('room-updated', {
        roomId,
        players: Array.from(roomInfo.players).map(id => connectedClients.get(id))
      });
      io.emit('clients-updated', Array.from(connectedClients.values()));
    } catch (error) {
      console.error('Error en registro:', error);
      socket.emit('register-error', { message: 'Error interno del servidor' });
    }
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

// Puerto del servidor
const PORT = process.env.PORT || 3000;

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor de señalización ejecutándose en el puerto ${PORT}`);
});
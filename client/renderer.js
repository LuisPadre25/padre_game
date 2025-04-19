// Elementos del DOM
const usernameInput = document.getElementById('username');
const serverUrlInput = document.getElementById('server-url');
const warcraftPathInput = document.getElementById('warcraft-path');
const selectWarcraftPathBtn = document.getElementById('select-warcraft-path');
const connectBtn = document.getElementById('connect-btn');
const connectionStatus = document.getElementById('connection-status');
const refreshPlayersBtn = document.getElementById('refresh-players');
const playersList = document.getElementById('players-list');
const createGameBtn = document.getElementById('create-game');
const gamesList = document.getElementById('games-list');
const gamePlayersList = document.getElementById('game-players-list');
const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat');
const launchGameBtn = document.getElementById('launch-game');
const leaveGameBtn = document.getElementById('leave-game');
const troubleshootingLink = document.getElementById('troubleshooting-link');

// Pestañas
const setupTab = document.getElementById('setup-tab');
const lobbyTab = document.getElementById('lobby-tab');
const gameTab = document.getElementById('game-tab');

// Referencias a Bootstrap para el manejo de pestañas
const setupTabEl = new bootstrap.Tab(setupTab);
const lobbyTabEl = new bootstrap.Tab(lobbyTab);
const gameTabEl = new bootstrap.Tab(gameTab);

// Variables globales
let socket = null;
let currentUser = null;
let currentRoom = null;
let p2pConnections = {};

// Cargar configuración guardada
document.addEventListener('DOMContentLoaded', () => {
    // Cargar la configuración desde localStorage
    const savedUsername = localStorage.getItem('username');
    const savedServerUrl = localStorage.getItem('serverUrl');
    const savedWarcraftPath = localStorage.getItem('warcraftPath');

    if (savedUsername) usernameInput.value = savedUsername;
    if (savedServerUrl) serverUrlInput.value = savedServerUrl;
    if (savedWarcraftPath) warcraftPathInput.value = savedWarcraftPath;
    
    // Verificar si existe una ruta de Warcraft guardada
    updateLaunchButton();
});

// Seleccionar la ruta del ejecutable de Warcraft
selectWarcraftPathBtn.addEventListener('click', async () => {
    const warcraftPath = await window.ipcRenderer.invoke('select-warcraft-exe');
    if (warcraftPath) {
        warcraftPathInput.value = warcraftPath;
        localStorage.setItem('warcraftPath', warcraftPath);
        updateLaunchButton();
    }
});

// Actualizar el estado del botón de inicio de juego
function updateLaunchButton() {
    if (warcraftPathInput.value && currentRoom) {
        launchGameBtn.disabled = false;
    } else {
        launchGameBtn.disabled = true;
    }
}

// Conectar al servidor
connectBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const serverUrl = serverUrlInput.value.trim();
    
    if (!username) {
        alert('Por favor, ingresa un nombre de usuario');
        return;
    }
    
    if (!serverUrl) {
        alert('Por favor, ingresa la URL del servidor');
        return;
    }
    
    // Guardar configuración
    localStorage.setItem('username', username);
    localStorage.setItem('serverUrl', serverUrl);
    
    // Conectar al servidor
    connectToServer(username, serverUrl);
});

// Función para conectar al servidor
function connectToServer(username, serverUrl) {
    try {
        // Desconectar si ya hay una conexión
        if (socket) {
            socket.disconnect();
        }
        
        // Conectar al servidor
        connectionStatus.textContent = 'Conectando...';
        connectionStatus.className = 'status-disconnected';
        
        // Mostrar información de conexión
        console.log(`Intentando conectar a: ${serverUrl}`);
        addChatMessage('Sistema', `Intentando conectar a: ${serverUrl}`);
        
        // Cargar la biblioteca de Socket.IO desde node_modules
        const io = require('./node_modules/socket.io-client/dist/socket.io.js');
        
        // Configurar opciones de conexión con timeout más largo para conexiones remotas
        const socketOptions = {
            reconnectionAttempts: 5,
            timeout: 10000,
            reconnectionDelay: 2000
        };
        
        // Conectar al servidor
        socket = io(serverUrl, socketOptions);
        
        // Configurar eventos de Socket.IO
        setupSocketEvents(username);
        
    } catch (error) {
        console.error('Error al conectar:', error);
        connectionStatus.textContent = 'Error: ' + error.message;
        connectionStatus.className = 'status-disconnected';
        addChatMessage('Sistema', `Error al conectar: ${error.message}`);
    }
}

// Configurar eventos de Socket.IO
function setupSocketEvents(username) {
    // Evento connect
    socket.on('connect', () => {
        connectionStatus.textContent = 'Conectado';
        connectionStatus.className = 'status-connected';
        
        // Registrar usuario
        socket.emit('register', { username });
        
        // Guardar usuario actual
        currentUser = {
            id: socket.id,
            username
        };
        
        // Cambiar a la pestaña de lobby
        lobbyTabEl.show();
        
        // Actualizar lista de jugadores
        refreshPlayers();
    });
    
    // Evento disconnect
    socket.on('disconnect', () => {
        connectionStatus.textContent = 'Desconectado';
        connectionStatus.className = 'status-disconnected';
        
        // Limpiar estado
        currentUser = null;
        currentRoom = null;
        updateLaunchButton();
        
        // Cambiar a la pestaña de configuración
        setupTabEl.show();
    });
    
    // Evento ping para mantener la conexión viva
    socket.on('ping', () => {
        socket.emit('pong');
    });
    
    // Evento de actualización de clientes
    socket.on('clients-updated', (clients) => {
        // Actualizar lista de jugadores conectados
        renderPlayersList(clients);
    });
    
    // Evento de actualización de sala
    socket.on('room-updated', (roomData) => {
        currentRoom = roomData;
        renderGamePlayersList(roomData.players);
        updateLaunchButton();
        
        // Si es el host y hay 2 jugadores, habilitar el botón de lanzamiento
        if (roomData.players.length >= 2) {
            launchGameBtn.disabled = false;
        }
        
        // Cambiar a la pestaña de juego
        gameTabEl.show();
    });
    
    // Evento de error en el registro
    socket.on('register-error', (error) => {
        alert('Error al registrar: ' + error.message);
    });
    
    // Evento de error en la sala
    socket.on('room-error', (error) => {
        alert('Error en la sala: ' + error.message);
    });
    
    // Eventos para P2P WebRTC
    socket.on('connection-offer', async (data) => {
        const { from, fromUsername, offer } = data;
        console.log(`Oferta de conexión recibida de ${fromUsername}`);
        addChatMessage('Sistema', `${fromUsername} quiere conectarse contigo`);
        
        // Crear respuesta a la oferta
        try {
            // Crear conexión P2P para este peer
            const peerConnection = createPeerConnection(from);
            
            // Establecer oferta remota
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Añadir candidatos ICE pendientes
            if (peerConnection.pendingIceCandidates && peerConnection.pendingIceCandidates.length > 0) {
                console.log(`Añadiendo ${peerConnection.pendingIceCandidates.length} candidatos ICE pendientes después de recibir oferta`);
                for (const candidate of peerConnection.pendingIceCandidates) {
                    await peerConnection.addIceCandidate(candidate);
                }
                peerConnection.pendingIceCandidates = [];
            }
            
            // Crear respuesta con restricciones específicas
            const answerOptions = {
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            };
            
            const answer = await peerConnection.createAnswer(answerOptions);
            await peerConnection.setLocalDescription(answer);
            
            // Esperar a que se recojan algunos candidatos ICE antes de enviar la respuesta
            setTimeout(() => {
                // Enviar respuesta al peer
                socket.emit('connection-answer', {
                    targetId: from,
                    answer: peerConnection.localDescription
                });
                
                addChatMessage('Sistema', `Respuesta enviada a ${fromUsername}`);
            }, 1000);
            
        } catch (error) {
            console.error('Error al procesar oferta:', error);
            addChatMessage('Sistema', `Error al procesar oferta: ${error.message}`);
        }
    });
    
    socket.on('connection-response', async (data) => {
        const { from, answer } = data;
        console.log(`Respuesta de conexión recibida de ${from}`);
        
        // Establecer la respuesta como descripción remota
        try {
            const peerConnection = p2pConnections[from];
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                
                // Añadir candidatos ICE pendientes una vez establecida la descripción remota
                if (peerConnection.pendingIceCandidates && peerConnection.pendingIceCandidates.length > 0) {
                    console.log(`Añadiendo ${peerConnection.pendingIceCandidates.length} candidatos ICE pendientes`);
                    for (const candidate of peerConnection.pendingIceCandidates) {
                        await peerConnection.addIceCandidate(candidate);
                    }
                    peerConnection.pendingIceCandidates = [];
                }
            }
        } catch (error) {
            console.error('Error al procesar respuesta:', error);
            addChatMessage('Sistema', `Error en conexión: ${error.message}`);
        }
    });
    
    socket.on('ice-candidate', async (data) => {
        const { from, candidate } = data;
        
        try {
            const peerConnection = p2pConnections[from];
            if (peerConnection) {
                const candidateObj = new RTCIceCandidate(candidate);
                
                // Si ya tenemos una descripción remota, añadimos el candidato
                // Si no, lo guardamos para añadirlo después
                if (peerConnection.currentRemoteDescription) {
                    await peerConnection.addIceCandidate(candidateObj);
                } else {
                    if (!peerConnection.pendingIceCandidates) {
                        peerConnection.pendingIceCandidates = [];
                    }
                    console.log('Guardando candidato ICE para añadirlo más tarde');
                    peerConnection.pendingIceCandidates.push(candidateObj);
                }
            }
        } catch (error) {
            console.error('Error al agregar candidato ICE:', error);
            addChatMessage('Sistema', `Error con candidato ICE: ${error.message}`);
        }
    });
    
    // Eventos para errores y cierre de Warcraft
    window.ipcRenderer.on('warcraft-error', (event, message) => {
        alert('Error al iniciar Warcraft: ' + message);
    });
    
    window.ipcRenderer.on('warcraft-closed', (event, code) => {
        addChatMessage('Sistema', 'Warcraft ha sido cerrado. Código de salida: ' + code);
    });
}

// Crear conexión P2P
function createPeerConnection(peerId) {
    // Configuración de STUN/TURN servers
    const peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    });
    
    // Guardar la conexión en el mapa de conexiones
    p2pConnections[peerId] = peerConnection;
    
    // Manejar cambios de estado de conexión
    peerConnection.onconnectionstatechange = () => {
        console.log(`Estado de conexión con ${peerId}: ${peerConnection.connectionState}`);
        addChatMessage('Sistema', `Estado de conexión: ${peerConnection.connectionState}`);
    };
    
    // Manejar candidatos ICE
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            // Enviar candidato al peer remoto
            socket.emit('ice-candidate', {
                targetId: peerId,
                candidate: event.candidate
            });
        }
    };
    
    // Manejar canal de datos
    peerConnection.ondatachannel = (event) => {
        const dataChannel = event.channel;
        setupDataChannel(dataChannel, peerId);
    };

    // Almacenar los candidatos ICE pendientes
    if (!peerConnection.pendingIceCandidates) {
        peerConnection.pendingIceCandidates = [];
    }
    
    return peerConnection;
}

// Configurar canal de datos
function setupDataChannel(dataChannel, peerId) {
    dataChannel.onopen = () => {
        console.log(`Canal de datos abierto con ${peerId}`);
        addChatMessage('Sistema', `Conexión establecida con otro jugador`);
    };
    
    dataChannel.onclose = () => {
        console.log(`Canal de datos cerrado con ${peerId}`);
        addChatMessage('Sistema', `Conexión cerrada con otro jugador`);
    };
    
    dataChannel.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            
            // Manejar diferentes tipos de mensajes
            switch (message.type) {
                case 'chat':
                    addChatMessage(message.username, message.text);
                    break;
                case 'game-command':
                    // Procesar comandos de juego aquí
                    console.log('Comando de juego recibido:', message);
                    break;
                default:
                    console.log('Mensaje desconocido recibido:', message);
            }
        } catch (error) {
            console.error('Error al procesar mensaje:', error);
        }
    };
}

// Iniciar una conexión P2P con otro jugador
async function connectToPlayer(playerId) {
    try {
        addChatMessage('Sistema', `Intentando conectar con otro jugador...`);
        
        // Crear conexión P2P
        const peerConnection = createPeerConnection(playerId);
        
        // Crear canal de datos
        const dataChannel = peerConnection.createDataChannel('game-data');
        setupDataChannel(dataChannel, playerId);
        peerConnection.dataChannel = dataChannel;
        
        // Crear oferta con restricciones específicas para mejorar compatibilidad
        const offerOptions = {
            offerToReceiveAudio: false,
            offerToReceiveVideo: false
        };
        
        const offer = await peerConnection.createOffer(offerOptions);
        await peerConnection.setLocalDescription(offer);
        
        // Esperar a que se generen los candidatos ICE antes de enviar la oferta
        setTimeout(() => {
            // Enviar oferta al jugador
            socket.emit('connection-request', {
                targetId: playerId,
                offer: peerConnection.localDescription
            });
            
            addChatMessage('Sistema', `Oferta enviada, esperando respuesta...`);
        }, 1000); // Dar tiempo para recopilar candidatos ICE
        
    } catch (error) {
        console.error('Error al conectar con jugador:', error);
        addChatMessage('Sistema', `Error al conectar: ${error.message}`);
    }
}

// Actualizar lista de jugadores
function refreshPlayers() {
    socket.emit('get-clients');
}

// Renderizar lista de jugadores
function renderPlayersList(players) {
    if (!players || players.length === 0) {
        playersList.innerHTML = '<p class="text-muted">No hay jugadores conectados</p>';
        return;
    }
    
    let html = '';
    
    players.forEach(player => {
        // No mostrar al jugador actual
        if (player.id === currentUser?.id) return;
        
        html += `
            <div class="game-card d-flex justify-content-between align-items-center">
                <div>${player.username}</div>
                <button class="btn btn-sm btn-primary connect-player" data-id="${player.id}">Conectar</button>
            </div>
        `;
    });
    
    if (html === '') {
        playersList.innerHTML = '<p class="text-muted">No hay otros jugadores conectados</p>';
    } else {
        playersList.innerHTML = html;
        
        // Agregar eventos a los botones de conexión
        document.querySelectorAll('.connect-player').forEach(button => {
            button.addEventListener('click', (e) => {
                const playerId = e.target.getAttribute('data-id');
                connectToPlayer(playerId);
            });
        });
    }
}

// Renderizar lista de jugadores en la partida
function renderGamePlayersList(players) {
    if (!players || players.length === 0) {
        gamePlayersList.innerHTML = '<p class="text-muted">No hay jugadores en la partida</p>';
        return;
    }
    
    let html = '';
    
    players.forEach(player => {
        const isCurrentUser = player.id === currentUser?.id;
        html += `
            <div class="game-card d-flex justify-content-between align-items-center">
                <div>${player.username} ${isCurrentUser ? '(Tú)' : ''}</div>
                <span class="badge bg-success">Conectado</span>
            </div>
        `;
    });
    
    gamePlayersList.innerHTML = html;
}

// Crear una nueva partida
createGameBtn.addEventListener('click', () => {
    if (!socket || !socket.connected) {
        alert('No estás conectado al servidor');
        return;
    }
    
    addChatMessage('Sistema', 'Creando nueva partida...');
    
    // Crear nueva sala en el servidor
    socket.emit('create-game');
    
    // Notificar al usuario
    alert('Partida creada. Espera a que otros jugadores se unan.');
});

// Actualizar lista de partidas disponibles 
socket.on('games-list', (games) => {
    renderGamesList(games);
});

// Renderizar lista de partidas disponibles
function renderGamesList(games) {
    if (!games || games.length === 0) {
        gamesList.innerHTML = '<p class="text-muted">No hay partidas disponibles</p>';
        return;
    }
    
    let html = '';
    
    games.forEach(game => {
        html += `
            <div class="game-card d-flex justify-content-between align-items-center">
                <div>Partida #${game.id.substring(0, 8)} (${game.players.length}/${game.maxPlayers} jugadores)</div>
                <button class="btn btn-sm btn-primary join-game" data-id="${game.id}">Unirse</button>
            </div>
        `;
    });
    
    gamesList.innerHTML = html;
    
    // Agregar eventos a los botones de unirse
    document.querySelectorAll('.join-game').forEach(button => {
        button.addEventListener('click', (e) => {
            const gameId = e.target.getAttribute('data-id');
            joinGame(gameId);
        });
    });
}

// Unirse a una partida existente
function joinGame(gameId) {
    if (!socket || !socket.connected) {
        alert('No estás conectado al servidor');
        return;
    }
    
    addChatMessage('Sistema', `Uniéndose a la partida #${gameId.substring(0, 8)}...`);
    
    // Enviar solicitud para unirse a la partida
    socket.emit('join-game', { gameId });
}

// Refrescar lista de jugadores
refreshPlayersBtn.addEventListener('click', refreshPlayers);

// Enviar mensaje de chat
sendChatBtn.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (!message) return;
    
    sendChatMessage(message);
    chatInput.value = '';
});

// Al presionar Enter en el chat
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const message = chatInput.value.trim();
        if (!message) return;
        
        sendChatMessage(message);
        chatInput.value = '';
    }
});

// Enviar mensaje de chat a todos los peers
function sendChatMessage(text) {
    if (!currentUser) return;
    
    const message = {
        type: 'chat',
        username: currentUser.username,
        text
    };
    
    // Enviar a todos los peers
    Object.values(p2pConnections).forEach(connection => {
        try {
            // Buscar el canal de datos
            const dataChannel = connection.dataChannel;
            if (dataChannel && dataChannel.readyState === 'open') {
                dataChannel.send(JSON.stringify(message));
            }
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
        }
    });
    
    // Mostrar localmente
    addChatMessage(currentUser.username, text);
}

// Agregar mensaje al chat
function addChatMessage(username, text) {
    const messageEl = document.createElement('div');
    messageEl.className = 'mb-2';
    messageEl.innerHTML = `<strong>${username}:</strong> ${text}`;
    chatBox.appendChild(messageEl);
    
    // Scroll al final
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Lanzar Warcraft
launchGameBtn.addEventListener('click', async () => {
    const warcraftPath = warcraftPathInput.value;
    
    if (!warcraftPath) {
        alert('Por favor, selecciona la ruta del ejecutable de Warcraft');
        return;
    }
    
    try {
        const result = await window.ipcRenderer.invoke('launch-warcraft', warcraftPath);
        
        if (result) {
            // Mostrar mensaje en el chat
            addChatMessage('Sistema', 'Warcraft ha sido iniciado');
        } else {
            alert('Error al iniciar Warcraft');
        }
    } catch (error) {
        alert('Error al iniciar Warcraft: ' + error.message);
    }
});

// Abandonar partida
leaveGameBtn.addEventListener('click', () => {
    if (!socket || !socket.connected) {
        return;
    }
    
    if (currentRoom) {
        socket.emit('leave-game', { roomId: currentRoom.id });
        currentRoom = null;
        updateLaunchButton();
    }
    
    // Cerrar todas las conexiones P2P
    Object.values(p2pConnections).forEach(connection => {
        connection.close();
    });
    p2pConnections = {};
    
    // Cambiar a la pestaña de lobby
    lobbyTabEl.show();
});

// Mostrar solución de problemas
troubleshootingLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.ipcRenderer.invoke('open-troubleshooting');
}); 
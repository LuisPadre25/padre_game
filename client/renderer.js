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
let connectionAttempts = {}; // Rastrear intentos de conexión para evitar duplicados
let isConnecting = false; // Bloquear múltiples intentos simultáneos

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
    // Verificar si tenemos una ruta de Warcraft válida
    const hasWarcraftPath = !!warcraftPathInput.value;
    
    // Habilitar el botón si tenemos la ruta de Warcraft
    if (hasWarcraftPath) {
        launchGameBtn.disabled = false;
        addChatMessage('Sistema', `El botón "Iniciar Warcraft III" ha sido habilitado. Puedes lanzar el juego ahora.`);
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
        
        // Actualizar lista de jugadores y partidas
        refreshPlayers();
        refreshGames();
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
    
    // Evento de actualización de lista de partidas
    socket.on('games-list', (games) => {
        console.log('Lista de partidas recibida:', games);
        renderGamesList(games);
    });
    
    // Evento de actualización de sala
    socket.on('room-updated', (roomData) => {
        console.log('Datos de sala recibidos:', roomData);
        
        // Verificar formato de datos recibidos
        if (!roomData) return;
        
        // Compatibilidad con diferentes formatos
        currentRoom = {
            id: roomData.id || roomData.roomId,
            players: roomData.players || []
        };
        
        console.log('Sala actualizada:', currentRoom);
        
        // Renderizar jugadores en la sala
        renderGamePlayersList(currentRoom.players);
        
        // Habilitar el chat y el botón de lanzar juego inmediatamente
        chatInput.disabled = false;
        sendChatBtn.disabled = false;
        updateLaunchButton();
        
        // Cambiar a la pestaña de juego
        gameTabEl.show();
        
        // Notificar sobre la partida
        addChatMessage('Sistema', 'Estás en una partida. Puedes chatear y lanzar Warcraft III.');
        
        // Actualizar la lista de partidas
        refreshGames();
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
        
        // Evitar procesar ofertas duplicadas en un corto periodo de tiempo
        if (connectionAttempts[from] && (Date.now() - connectionAttempts[from]) < 2000) {
            console.log('Ignorando oferta duplicada');
            return;
        }
        
        connectionAttempts[from] = Date.now();
        addChatMessage('Sistema', `${fromUsername} quiere conectarse contigo`);
        
        // Crear respuesta a la oferta
        try {
            // Cerrar conexión previa si existe
            if (p2pConnections[from]) {
                try {
                    p2pConnections[from].close();
                    delete p2pConnections[from];
                } catch (err) {
                    console.log('Error al cerrar conexión anterior:', err);
                }
            }
            
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
                // Verificar si aún tenemos la conexión
                if (p2pConnections[from]) {
                    // Enviar respuesta al peer
                    socket.emit('connection-answer', {
                        targetId: from,
                        answer: peerConnection.localDescription
                    });
                    
                    addChatMessage('Sistema', `Respuesta enviada a ${fromUsername}`);
                }
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
    
    // Evento de mensaje de chat - mejoramos la identificación del remitente
    socket.on('chat-message', (data) => {
        // Verificar si ya existe una entrada igual en los últimos mensajes para evitar duplicados
        const lastMessages = Array.from(chatBox.querySelectorAll('div')).slice(-5);
        const isDuplicate = lastMessages.some(el => 
            el.innerHTML === `<strong>${data.username}:</strong> ${data.message}`
        );
        
        if (!isDuplicate) {
            // Identificar si el mensaje es propio
            const isOwnMessage = data.username === currentUser?.username;
            
            // Añadir el mensaje al chat con estilo diferente si es propio
            addChatMessage(data.username, data.message, isOwnMessage);
            
            // Scroll al final para asegurar que siempre se vea el último mensaje
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    });
    
    // Evento cuando Warcraft es iniciado
    window.ipcRenderer.on('warcraft-launched', (event, data) => {
        // Mostrar instrucciones específicas basadas en si es host o no
        const roleText = data.isHost ? 'ANFITRIÓN' : 'JUGADOR';
        
        addChatMessage('Sistema', `[${roleText}] ${data.instructions}`);
        addChatMessage('Sistema', `Se ha abierto una ventana con instrucciones paso a paso.`);
        
        // Enviar instrucciones también a través del chat a otros jugadores
        if (currentRoom && currentRoom.id) {
            socket.emit('chat-message', {
                roomId: currentRoom.id,
                message: `[${roleText}] Nombre de partida LAN: ${data.gameName}`
            });
        }
    });
    
    // Evento de notificación de inicio de juego
    socket.on('game-launched', (data) => {
        const isHost = data.isHost;
        const gameName = data.gameName;
        
        if (isHost) {
            addChatMessage('Sistema', `${data.username} ha iniciado Warcraft III como ANFITRIÓN`);
            addChatMessage('Sistema', `Debes buscar la partida LAN con nombre: ${gameName}`);
        } else {
            addChatMessage('Sistema', `${data.username} ha iniciado Warcraft III y se unirá a tu partida`);
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
    // Configuración de STUN/TURN servers mejorada
    const peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceTransportPolicy: 'all',
        iceCandidatePoolSize: 10,
        // Configuración extra para mejorar conexiones con NAT
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
    });
    
    // Guardar la conexión en el mapa de conexiones
    p2pConnections[peerId] = peerConnection;
    
    // Manejar cambios de estado de conexión
    peerConnection.onconnectionstatechange = () => {
        console.log(`Estado de conexión con ${peerId}: ${peerConnection.connectionState}`);
        addChatMessage('Sistema', `Estado de conexión: ${peerConnection.connectionState}`);
        
        // Marcar como no conectando cuando la conexión está establecida o ha fallado
        if (peerConnection.connectionState === 'connected' || 
            peerConnection.connectionState === 'failed' ||
            peerConnection.connectionState === 'disconnected' ||
            peerConnection.connectionState === 'closed') {
            isConnecting = false;
        }
        
        // Limpiar conexión fallida después de un tiempo
        if (peerConnection.connectionState === 'failed' || 
            peerConnection.connectionState === 'disconnected' ||
            peerConnection.connectionState === 'closed') {
            setTimeout(() => {
                if (p2pConnections[peerId] === peerConnection) {
                    delete p2pConnections[peerId];
                    console.log(`Conexión eliminada para ${peerId}`);
                }
            }, 5000);
        }
        
        // Actualizar la interfaz para reflejar el nuevo estado
        refreshPlayers();
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
    
    peerConnection.onicecandidateerror = (event) => {
        console.error('Error de candidato ICE:', event);
    };
    
    peerConnection.oniceconnectionstatechange = () => {
        console.log(`Estado de conexión ICE: ${peerConnection.iceConnectionState}`);
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
    // Almacenar el canal de datos en la conexión
    if (p2pConnections[peerId]) {
        p2pConnections[peerId].dataChannel = dataChannel;
    }
    
    dataChannel.onopen = () => {
        console.log(`Canal de datos abierto con ${peerId}`);
        addChatMessage('Sistema', `Conexión establecida con otro jugador`);
        
        // Cambiar automáticamente a la pestaña de juego
        gameTabEl.show();
        
        // Activar el botón de lanzar juego
        updateLaunchButton();
        
        // Notificar al usuario sobre los siguientes pasos
        addChatMessage('Sistema', `Ya puedes chatear y lanzar Warcraft III. La conexión P2P está activa.`);
        
        // Habilitar el input de chat
        chatInput.disabled = false;
        sendChatBtn.disabled = false;
        
        // Enviar mensaje de prueba
        sendChatMessage('¡Hola! La conexión está establecida.');
    };
    
    dataChannel.onclose = () => {
        console.log(`Canal de datos cerrado con ${peerId}`);
        addChatMessage('Sistema', `Conexión cerrada con otro jugador`);
        
        // Deshabilitar el input de chat
        chatInput.disabled = true;
        sendChatBtn.disabled = true;
        
        // Actualizar el botón de lanzar juego
        updateLaunchButton();
    };
    
    dataChannel.onerror = (error) => {
        console.error(`Error en canal de datos: ${error}`);
        addChatMessage('Sistema', `Error en la conexión: ${error}`);
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
                case 'ping':
                    // Responder al ping para mantener la conexión viva
                    sendP2PMessage(peerId, { type: 'pong', timestamp: Date.now() });
                    break;
                default:
                    console.log('Mensaje desconocido recibido:', message);
            }
        } catch (error) {
            console.error('Error al procesar mensaje:', error);
        }
    };
}

// Función para enviar mensajes P2P
function sendP2PMessage(peerId, message) {
    try {
        const connection = p2pConnections[peerId];
        if (connection && connection.dataChannel && connection.dataChannel.readyState === 'open') {
            connection.dataChannel.send(JSON.stringify(message));
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error al enviar mensaje P2P:', error);
        return false;
    }
}

// Iniciar una conexión P2P con otro jugador
async function connectToPlayer(playerId) {
    try {
        // Evitar múltiples intentos simultáneos
        if (isConnecting) {
            addChatMessage('Sistema', `Ya hay una conexión en curso, espera un momento...`);
            return;
        }
        
        // Evitar conexiones duplicadas
        if (p2pConnections[playerId] && 
            (p2pConnections[playerId].connectionState === 'connected' || 
             p2pConnections[playerId].connectionState === 'connecting')) {
            addChatMessage('Sistema', `Ya existe una conexión con este jugador`);
            return;
        }
        
        // Evitar reconexiones demasiado frecuentes
        if (connectionAttempts[playerId] && (Date.now() - connectionAttempts[playerId]) < 5000) {
            addChatMessage('Sistema', `Espera unos segundos antes de intentar conectarte de nuevo`);
            return;
        }
        
        isConnecting = true;
        connectionAttempts[playerId] = Date.now();
        
        addChatMessage('Sistema', `Intentando conectar con otro jugador...`);
        
        // Cerrar conexión previa si existe
        if (p2pConnections[playerId]) {
            try {
                p2pConnections[playerId].close();
                delete p2pConnections[playerId];
            } catch (err) {
                console.log('Error al cerrar conexión anterior:', err);
            }
        }
        
        // Crear conexión P2P
        const peerConnection = createPeerConnection(playerId);
        
        // Crear canal de datos con configuración optimizada
        const dataChannel = peerConnection.createDataChannel('game-data', {
            ordered: true,
            maxRetransmits: 3
        });
        setupDataChannel(dataChannel, playerId);
        peerConnection.dataChannel = dataChannel;
        
        // Crear oferta con restricciones específicas para mejorar compatibilidad
        const offerOptions = {
            offerToReceiveAudio: false,
            offerToReceiveVideo: false,
            iceRestart: true // Añadido para mejorar reconexiones
        };
        
        const offer = await peerConnection.createOffer(offerOptions);
        await peerConnection.setLocalDescription(offer);
        
        // Esperar a que se generen los candidatos ICE antes de enviar la oferta
        setTimeout(() => {
            // Verificar si aún estamos intentando conectar con este peer
            if (p2pConnections[playerId]) {
                // Enviar oferta al jugador
                socket.emit('connection-request', {
                    targetId: playerId,
                    offer: peerConnection.localDescription
                });
                
                addChatMessage('Sistema', `Oferta enviada, esperando respuesta...`);
                
                // Establecer un timeout para la conexión
                setTimeout(() => {
                    if (p2pConnections[playerId] && p2pConnections[playerId].connectionState !== 'connected') {
                        addChatMessage('Sistema', `La conexión está tardando demasiado. Intenta nuevamente.`);
                        isConnecting = false;
                    }
                }, 15000);
            } else {
                addChatMessage('Sistema', `Conexión cancelada`);
                isConnecting = false;
            }
        }, 1000);
        
    } catch (error) {
        console.error('Error al conectar con jugador:', error);
        addChatMessage('Sistema', `Error al conectar: ${error.message}`);
        isConnecting = false;
    }
}

// Actualizar lista de jugadores
function refreshPlayers() {
    if (socket && socket.connected) {
        socket.emit('get-clients');
    }
}

// Solicitar actualización de lista de partidas
function refreshGames() {
    if (socket && socket.connected) {
        socket.emit('get-games');
    }
}

// Renderizar lista de jugadores
function renderPlayersList(players) {
    if (!players || players.length === 0) {
        playersList.innerHTML = '<p class="text-muted">No hay jugadores conectados</p>';
        return;
    }
    
    let html = `
        <div class="alert alert-info mb-2">
            <small>Esta sección muestra todos los jugadores conectados. Puedes establecer conexiones P2P directas con ellos.</small>
        </div>`;
    
    players.forEach(player => {
        // No mostrar al jugador actual
        if (player.id === currentUser?.id) return;
        
        // Verificar si ya existe una conexión P2P con este jugador
        const connection = p2pConnections[player.id];
        const connectionState = connection ? connection.connectionState : null;
        
        // Determinar el texto y la clase del botón según el estado
        let buttonText = 'Conectar';
        let buttonClass = 'btn-primary';
        let isDisabled = false;
        
        if (connectionState === 'connecting') {
            buttonText = 'Conectando...';
            buttonClass = 'btn-warning';
            isDisabled = true;
        } else if (connectionState === 'connected') {
            buttonText = 'Conectado';
            buttonClass = 'btn-success';
            isDisabled = true;
        } else if (connectionState === 'disconnected' || connectionState === 'failed') {
            buttonText = 'Reconectar';
            buttonClass = 'btn-danger';
        }
        
        // Agregar el botón de conexión con el estado apropiado
        html += `
            <div class="game-card d-flex justify-content-between align-items-center">
                <div>${player.username}</div>
                <button class="btn btn-sm ${buttonClass} connect-player" 
                    data-id="${player.id}" ${isDisabled ? 'disabled' : ''}>
                    ${buttonText}
                </button>
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
                
                // Actualizar inmediatamente el estado visual del botón
                e.target.textContent = 'Conectando...';
                e.target.classList.remove('btn-primary', 'btn-danger');
                e.target.classList.add('btn-warning');
                e.target.disabled = true;
                
                // Programar una actualización de la lista después de un tiempo
                setTimeout(() => refreshPlayers(), 2000);
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
    
    addChatMessage('Sistema', 'Creando nueva partida de juego en el lobby...');
    console.log('Solicitando crear partida');
    
    // Crear nueva sala en el servidor - el servidor enviará automáticamente las actualizaciones
    socket.emit('create-game');
});

// Renderizar lista de partidas disponibles
function renderGamesList(games) {
    console.log('Renderizando lista de partidas:', games);
    
    if (!games || games.length === 0) {
        gamesList.innerHTML = '<p class="text-muted">No hay partidas disponibles</p>';
        return;
    }
    
    let html = '';
    
    games.forEach(game => {
        const playerCount = game.players ? game.players.length : 0;
        const gameIdShort = game.id.substring(0, 8);
        
        // Verificar si el usuario actual es dueño o ya está en esta partida
        const isOwner = game.players.some(player => player.id === currentUser?.id);
        
        html += `
            <div class="game-card d-flex justify-content-between align-items-center">
                <div>Partida #${gameIdShort} (${playerCount}/${game.maxPlayers} jugadores)</div>`;
                
        if (isOwner) {
            // Si es dueño, mostrar un indicador en lugar del botón
            html += `<span class="badge bg-success">Tu partida</span>`;
        } else {
            // Si no es dueño, mostrar el botón para unirse
            html += `<button class="btn btn-sm btn-primary join-game" data-id="${game.id}">Unirse</button>`;
        }
        
        html += `</div>`;
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
    
    // Cambiar a la pestaña de juego
    gameTabEl.show();
}

// Refrescar lista de jugadores
refreshPlayersBtn.addEventListener('click', () => {
    refreshPlayers();
    refreshGames();
});

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
    
    // Si no estamos en una sala, mostrar error
    if (!currentRoom || !currentRoom.id) {
        addChatMessage('Sistema', 'No estás en una partida. Crea o únete a una partida para chatear.');
        return;
    }
    
    console.log('Enviando mensaje a sala:', currentRoom.id);
    
    // Enviar mensaje a través del servidor
    socket.emit('chat-message', {
        roomId: currentRoom.id,
        message: text
    });
    
    // NO mostrar mensaje localmente aquí, se mostrará cuando llegue del servidor
    // Esto evita la duplicación
}

// Agregar mensaje al chat con opción para estilo propio
function addChatMessage(username, text, isOwnMessage = false) {
    const messageEl = document.createElement('div');
    messageEl.className = 'mb-2';
    
    // Añadir clase especial si es un mensaje propio
    if (isOwnMessage) {
        messageEl.className += ' own-message';
    }
    
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
        // Verificar si estamos en una partida
        if (!currentRoom || !currentRoom.id) {
            alert('Debes estar en una partida para iniciar Warcraft');
            return;
        }
        
        // Determinar si somos el host o un jugador que se unió
        const isHost = currentRoom.players && currentRoom.players.length > 0 
                      && currentRoom.players[0].id === currentUser.id;
        
        // Configurar los parámetros para iniciar Warcraft
        const warcraftOptions = {
            path: warcraftPath,
            isHost: isHost,
            gameId: currentRoom.id.substring(0, 8),  // Usar parte del ID como nombre de partida
            playerName: currentUser.username
        };
        
        addChatMessage('Sistema', `Iniciando Warcraft III como ${isHost ? 'host' : 'jugador'}...`);
        
        // Enviar un mensaje a todos los jugadores en la partida
        if (currentRoom && currentRoom.players.length > 1) {
            socket.emit('game-started', { 
                roomId: currentRoom.id,
                isHost: isHost,
                gameName: warcraftOptions.gameId
            });
        }
        
        // Iniciar Warcraft con las opciones configuradas
        const result = await window.ipcRenderer.invoke('launch-warcraft-with-options', warcraftOptions);
        
        if (result) {
            addChatMessage('Sistema', `Warcraft III iniciado correctamente. ${isHost ? 'Creando' : 'Buscando'} partida LAN "${warcraftOptions.gameId}"`);
            
            // Instrucciones específicas según si es host o no
            if (isHost) {
                addChatMessage('Sistema', 'Instrucciones para host: Selecciona "Red local (LAN)" y crea una partida con el nombre indicado.');
            } else {
                addChatMessage('Sistema', 'Instrucciones: Selecciona "Red local (LAN)" y busca la partida con el nombre indicado.');
            }
            
            // Deshabilitar el botón después de iniciar
            launchGameBtn.disabled = true;
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
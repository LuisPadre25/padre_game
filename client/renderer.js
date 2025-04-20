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
let previousConnectionInfo = null; // Almacenar información para reconexión
let reconnectionAttempts = 0; // Contador de intentos de reconexión
const MAX_RECONNECTION_ATTEMPTS = 5; // Máximo de intentos de reconexión
let localStream;
let peerConnections = {}; // Almacena todas las conexiones peer
let dataChannels = {}; // Almacena todos los canales de datos
let myId = null;
let username = ''; 
let roomId = '';
let serverAddress = '';
let reconnectionTimer = null;
let maxReconnectionAttempts = 10;
let reconnectionDelay = 1000; // Tiempo inicial de reintento en ms
let isReconnecting = false;
let networkStatusCheckInterval = null;
let activePeers = new Set(); // Almacena los IDs de los peers activos
let socketReconnecting = false;
let lastConnectionState = {};
let lastPeers = [];
let networkOnline = navigator.onLine;
let hasActiveP2PConnections = false;
let localSocketId;
let warcraftPath = '';
let reconnectAttempt = 0;
let maxReconnectAttempts = 10;
let reconnectInterval = 1000; // Comienza con 1 segundo
let reconnectTimeoutId = null;
let knownPeers = new Set(); // Guarda los IDs de los peers con los que ya teníamos conexión
let lastNetworkState = navigator.onLine;
let heartbeatInterval = null;
let lastReceivedHeartbeat = Date.now();

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
    connectToServer();
});

// Función para conectar al servidor
function connectToServer() {
    // Obtener valores del formulario
    const serverAddress = document.getElementById('server-address').value.trim();
    username = document.getElementById('username').value.trim();
    roomId = document.getElementById('room-id').value.trim();

    // Validación básica
    if (!serverAddress || !username || !roomId) {
        addChatMessage('Por favor, completa todos los campos.', 'error');
        return;
    }

    // Actualizar banner de conexión
    updateConnectionBanner('reconnecting', 'Conectando al servidor...');

    // Deshabilitar el botón de conexión para evitar múltiples intentos
    document.getElementById('connect-button').disabled = true;

    try {
        // Inicializar la conexión de Socket.io
        socket = io(serverAddress, {
            query: { username, roomId },
            reconnectionAttempts: maxReconnectAttempts,
            reconnectionDelay: reconnectInterval,
            reconnectionDelayMax: 10000,
            timeout: 10000
        });

        // Evento al conectar
        socket.on('connect', () => {
            console.log('Conectado al servidor:', serverAddress);
            reconnectAttempt = 0;
            reconnectInterval = 1000;
            isReconnecting = false;
            localSocketId = socket.id;
            
            // Actualizar UI
            document.getElementById('connection-form').style.display = 'none';
            document.getElementById('game-info').style.display = 'block';
            document.getElementById('room-id-display').textContent = roomId;
            document.getElementById('username-display').textContent = username;
            
            // Configurar los eventos del socket
            setupSocketEvents();
            
            // Iniciar heartbeat
            startHeartbeat();
            
            // Actualizar banner de conexión
            updateConnectionBanner('connected', 'Conectado al servidor exitosamente');
            
            // Si teníamos peers conocidos, intentar reconectar
            if (knownPeers.size > 0) {
                setTimeout(() => {
                    reconnectPeers();
                }, 1000);
            }
        });

        // Evento al desconectar
        socket.on('disconnect', (reason) => {
            console.log('Desconectado del servidor:', reason);
            
            // Actualizar banner de conexión
            updateConnectionBanner('disconnected', 'Desconectado del servidor. Intentando reconectar...');
            
            // Detener heartbeat
            clearInterval(heartbeatInterval);
            
            // Si no estamos reconectando manualmente, programar reconexión
            if (!isReconnecting && reason !== 'io client disconnect') {
                scheduleReconnection();
            }
        });

        // Evento al error de conexión
        socket.on('connect_error', (error) => {
            console.error('Error de conexión:', error);
            document.getElementById('connect-button').disabled = false;
            
            // Actualizar banner de conexión
            updateConnectionBanner('disconnected', `Error de conexión: ${error.message}`);
            
            // Programar reconexión
            scheduleReconnection();
        });

    } catch (error) {
        console.error('Error al inicializar Socket.io:', error);
        document.getElementById('connect-button').disabled = false;
        addChatMessage(`Error al conectar: ${error.message}`, 'error');
        
        // Actualizar banner de conexión
        updateConnectionBanner('disconnected', `Error al conectar: ${error.message}`);
    }
}

// Función para programar reconexión con backoff exponencial
function scheduleReconnection() {
    // Limpiar cualquier timeout existente
    if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
    }
    
    // Si ya alcanzamos el máximo de intentos, detener
    if (reconnectAttempt >= maxReconnectAttempts) {
        console.log('Máximo de intentos de reconexión alcanzados.');
        addChatMessage('No se pudo reconectar al servidor después de múltiples intentos. Por favor, recarga la página.', 'error');
        document.getElementById('connect-button').disabled = false;
        return;
    }
    
    // Calcular tiempo de espera con backoff exponencial
    const delay = Math.min(reconnectInterval * Math.pow(2, reconnectAttempt), 30000);
    console.log(`Intentando reconectar en ${delay}ms (intento ${reconnectAttempt + 1}/${maxReconnectAttempts})`);
    
    // Actualizar banner de conexión
    updateConnectionBanner('reconnecting', `Reconectando en ${Math.round(delay/1000)} segundos... (intento ${reconnectAttempt + 1}/${maxReconnectAttempts})`);
    
    // Programar reconexión
    isReconnecting = true;
    reconnectTimeoutId = setTimeout(() => {
        reconnectAttempt++;
        
        // Si hay una conexión socket existente, intentar cerrarla primero
        if (socket && socket.connected) {
            socket.close();
        }
        
        // Reintentar conexión
        try {
            connectToServer();
        } catch (error) {
            console.error('Error al reconectar:', error);
            // Si falla, continuar con el backoff
            scheduleReconnection();
        }
    }, delay);
}

// Detectar cambios en la conexión de red
window.addEventListener('online', () => {
    console.log('Red conectada');
    lastNetworkState = true;
    addChatMessage('La conexión de red ha sido restablecida. Reconectando...', 'info');
    
    // Intentar reconectar inmediatamente si estábamos desconectados
    if (socket && !socket.connected) {
        reconnectAttempt = 0; // Reiniciar contador de intentos
        scheduleReconnection();
    }
});

window.addEventListener('offline', () => {
    console.log('Red desconectada');
    lastNetworkState = false;
    addChatMessage('La conexión de red se ha perdido. Esperando reconexión...', 'warning');
    updateConnectionBanner('disconnected', 'Sin conexión a Internet');
});

// Configurar eventos del socket
function setupSocketEvents() {
    // Evento al unirse a la sala
    socket.on('user-joined', (data) => {
        console.log('Usuario unido:', data);
        addChatMessage(`${data.username} se ha unido a la sala.`, 'info');
        renderPlayersList(data.users);
    });

    // Evento al salir de la sala
    socket.on('user-left', (data) => {
        console.log('Usuario salió:', data);
        addChatMessage(`${data.username} ha salido de la sala.`, 'info');
        
        // Eliminar conexiones con ese usuario
        if (peerConnections[data.socketId]) {
            peerConnections[data.socketId].close();
            delete peerConnections[data.socketId];
        }
        
        if (dataChannels[data.socketId]) {
            delete dataChannels[data.socketId];
        }
        
        knownPeers.delete(data.socketId);
        
        renderPlayersList(data.users);
        updateLaunchButton();
    });

    // Eventos para la señalización WebRTC
    socket.on('webrtc-offer', handleWebRTCOffer);
    socket.on('webrtc-answer', handleWebRTCAnswer);
    socket.on('webrtc-ice-candidate', handleICECandidate);
    
    // Evento para mensajes de chat
    socket.on('chat-message', (data) => {
        addChatMessage(`${data.sender}: ${data.message}`);
    });
    
    // Evento de heartbeat
    socket.on('heartbeat', () => {
        lastReceivedHeartbeat = Date.now();
        socket.emit('heartbeat-response');
    });
}

// Función para reconectar con peers conocidos
function reconnectPeers() {
    if (knownPeers.size === 0) return;
    
    addChatMessage('Intentando reconectar con jugadores conocidos...', 'info');
    
    knownPeers.forEach((peerId) => {
        // Verificar si ya tenemos una conexión activa
        if (peerConnections[peerId] && peerConnections[peerId].connectionState === 'connected') {
            console.log(`Ya conectado con ${peerId}, omitiendo.`);
            return;
        }
        
        // Si la conexión existe pero está cerrada o fallida, eliminarla
        if (peerConnections[peerId]) {
            peerConnections[peerId].close();
            delete peerConnections[peerId];
        }
        
        // Crear nueva conexión
        console.log(`Intentando reconectar con peer: ${peerId}`);
        connectToPeer(peerId);
    });
}

// Función para crear conexión P2P
function createPeerConnection(socketId, isInitiator = false) {
    // Si ya existe una conexión, cerrarla
    if (peerConnections[socketId]) {
        peerConnections[socketId].close();
    }
    
    console.log(`Creando conexión P2P con ${socketId}, iniciador: ${isInitiator}`);
    
    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
    };
    
    // Crear nueva conexión
    const peerConnection = new RTCPeerConnection(configuration);
    peerConnections[socketId] = peerConnection;
    
    // Guardar como peer conocido
    knownPeers.add(socketId);
    
    // Configurar handlers para eventos ICE
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('Enviando candidato ICE:', event.candidate);
            socket.emit('webrtc-ice-candidate', {
                target: socketId,
                candidate: event.candidate
            });
        }
    };
    
    peerConnection.oniceconnectionstatechange = () => {
        console.log(`Estado de conexión ICE con ${socketId}:`, peerConnection.iceConnectionState);
        
        if (peerConnection.iceConnectionState === 'disconnected' || 
            peerConnection.iceConnectionState === 'failed' || 
            peerConnection.iceConnectionState === 'closed') {
            
            addChatMessage(`Conexión con jugador perdida. Estado: ${peerConnection.iceConnectionState}`, 'warning');
            
            // Si es una desconexión, intentar reconectar automáticamente
            if (peerConnection.iceConnectionState === 'disconnected' && knownPeers.has(socketId)) {
                setTimeout(() => {
                    if (peerConnection.iceConnectionState === 'disconnected') {
                        addChatMessage('Intentando restablecer conexión...', 'info');
                        connectToPeer(socketId);
                    }
                }, 5000);
            }
        }
        
        // Actualizar la interfaz
        renderPlayersList();
        updateLaunchButton();
    };
    
    peerConnection.onconnectionstatechange = () => {
        console.log(`Estado de conexión con ${socketId}:`, peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'connected') {
            addChatMessage(`Conexión P2P establecida exitosamente.`, 'success');
            isConnecting = false;
            
            // Mostrar pestaña de juego y actualizar botón
            document.getElementById('game-tab').click();
            updateLaunchButton();
        } else if (peerConnection.connectionState === 'failed' || 
                  peerConnection.connectionState === 'closed') {
            isConnecting = false;
            
            // Actualizar UI
            renderPlayersList();
            updateLaunchButton();
        }
    };
    
    // Configurar canal de datos si somos el iniciador
    if (isInitiator) {
        setupDataChannel(peerConnection, socketId);
    } else {
        peerConnection.ondatachannel = (event) => {
            console.log('Canal de datos recibido:', event.channel);
            setupDataChannel(peerConnection, socketId, event.channel);
        };
    }
    
    return peerConnection;
}

// Función para manejar ofertas WebRTC
function handleWebRTCOffer(data) {
    console.log('Oferta WebRTC recibida:', data);
    
    const peerConnection = createPeerConnection(data.from, false);
    
    peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => {
            console.log('Enviando respuesta WebRTC');
            socket.emit('webrtc-answer', {
                target: data.from,
                answer: peerConnection.localDescription
            });
        })
        .catch(error => {
            console.error('Error al procesar oferta WebRTC:', error);
            addChatMessage(`Error al establecer conexión P2P: ${error.message}`, 'error');
        });
}

// Función para manejar respuestas WebRTC
function handleWebRTCAnswer(data) {
    console.log('Respuesta WebRTC recibida:', data);
    
    const peerConnection = peerConnections[data.from];
    if (peerConnection) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
            .catch(error => {
                console.error('Error al establecer descripción remota:', error);
                addChatMessage(`Error al completar conexión P2P: ${error.message}`, 'error');
            });
    } else {
        console.error('No se encontró la conexión para la respuesta recibida');
    }
}

// Función para manejar candidatos ICE
function handleICECandidate(data) {
    console.log('Candidato ICE recibido:', data);
    
    const peerConnection = peerConnections[data.from];
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
            .catch(error => {
                console.error('Error al agregar candidato ICE:', error);
            });
    } else {
        console.error('No se encontró la conexión para el candidato ICE recibido');
    }
}

// Función para configurar el canal de datos
function setupDataChannel(peerConnection, socketId, channel = null) {
    // Si se proporciona un canal, usarlo; de lo contrario, crear uno nuevo
    const dataChannel = channel || peerConnection.createDataChannel('data');
    dataChannels[socketId] = dataChannel;
    
    dataChannel.onopen = () => {
        console.log(`Canal de datos con ${socketId} abierto`);
        addChatMessage(`Canal de comunicación establecido correctamente.`, 'success');
        
        // Mostrar pestaña de juego automáticamente
        document.getElementById('game-tab').click();
        
        // Actualizar el botón de inicio
        updateLaunchButton();
    };
    
    dataChannel.onclose = () => {
        console.log(`Canal de datos con ${socketId} cerrado`);
    };
    
    dataChannel.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'chat') {
                addChatMessage(`${data.username}: ${data.message}`);
            } else if (data.type === 'system') {
                addChatMessage(data.message, 'info');
            }
        } catch (error) {
            console.error('Error al procesar mensaje:', error);
            addChatMessage(`Mensaje recibido: ${event.data}`);
        }
    };
}

// Función para conectar a un peer
function connectToPeer(socketId) {
    if (isConnecting) {
        console.log('Ya hay una conexión en progreso. Espera un momento.');
        return;
    }
    
    isConnecting = true;
    console.log(`Iniciando conexión con: ${socketId}`);
    
    const peerConnection = createPeerConnection(socketId, true);
    
    // Crear y enviar oferta
    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            console.log('Enviando oferta WebRTC');
            socket.emit('webrtc-offer', {
                target: socketId,
                offer: peerConnection.localDescription
            });
            
            // Actualizar botón en UI
            renderPlayersList();
            
            // Establecer timeout para la conexión
            setTimeout(() => {
                if (peerConnection.connectionState !== 'connected') {
                    console.log('Timeout de conexión alcanzado.');
                    isConnecting = false;
                    
                    if (peerConnection.connectionState === 'connecting' || 
                        peerConnection.connectionState === 'new') {
                        addChatMessage('La conexión ha tardado demasiado. Por favor, intenta nuevamente.', 'warning');
                        peerConnection.close();
                        delete peerConnections[socketId];
                        renderPlayersList();
                    }
                }
            }, 30000);
        })
        .catch(error => {
            console.error('Error al crear oferta WebRTC:', error);
            addChatMessage(`Error al iniciar conexión P2P: ${error.message}`, 'error');
            isConnecting = false;
            renderPlayersList();
        });
}

// Función para enviar mensaje de chat
function sendChatMessage() {
    const messageInput = document.getElementById('chat-input');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Limpiar input
    messageInput.value = '';
    
    // Añadir mensaje local
    addChatMessage(`Tú: ${message}`);
    
    // Enviar a todos los peers conectados
    const activePeerCount = Object.values(peerConnections).filter(pc => 
        pc.connectionState === 'connected' || pc.iceConnectionState === 'connected'
    ).length;
    
    if (activePeerCount === 0) {
        addChatMessage('No hay jugadores conectados para enviar el mensaje.', 'warning');
        return;
    }
    
    // Enviar mensaje a través de todos los canales de datos activos
    Object.entries(dataChannels).forEach(([socketId, channel]) => {
        if (channel.readyState === 'open') {
            channel.send(JSON.stringify({
                type: 'chat',
                username,
                message
            }));
        }
    });
}

// Función para renderizar la lista de jugadores
function renderPlayersList(users = []) {
    const playersListContainer = document.getElementById('players-list');
    
    // Si no se proporciona lista de usuarios, usar la última conocida
    if (!users || users.length === 0) {
        console.log('No hay información de usuarios disponible.');
        return;
    }
    
    // Crear HTML para la lista
    let html = '<div class="list-group">';
    
    users.forEach(user => {
        if (user.socketId === localSocketId) {
            html += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${user.username}</strong> (Tú)
                    </div>
                </div>
            `;
        } else {
            let buttonClass = 'btn-primary';
            let buttonText = 'Conectar';
            let disabled = '';
            
            // Verificar si existe una conexión con este usuario
            if (peerConnections[user.socketId]) {
                const connState = peerConnections[user.socketId].connectionState;
                const iceState = peerConnections[user.socketId].iceConnectionState;
                
                if (connState === 'connected' || iceState === 'connected') {
                    buttonClass = 'btn-success';
                    buttonText = 'Conectado';
                    disabled = 'disabled';
                } else if (connState === 'connecting' || iceState === 'checking') {
                    buttonClass = 'btn-warning';
                    buttonText = 'Conectando...';
                    disabled = 'disabled';
                } else if (connState === 'failed' || connState === 'disconnected' || 
                          iceState === 'failed' || iceState === 'disconnected') {
                    buttonClass = 'btn-danger';
                    buttonText = 'Reconectar';
                }
            }
            
            // Si estamos en proceso de conexión, deshabilitar el botón
            if (isConnecting) {
                disabled = 'disabled';
            }
            
            html += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>${user.username}</div>
                    <button class="btn ${buttonClass} btn-sm connect-button" 
                        data-socket-id="${user.socketId}" ${disabled}>${buttonText}</button>
                </div>
            `;
        }
    });
    
    html += '</div>';
    playersListContainer.innerHTML = html;
    
    // Agregar event listeners a los botones de conexión
    document.querySelectorAll('.connect-button').forEach(button => {
        button.addEventListener('click', () => {
            const socketId = button.getAttribute('data-socket-id');
            if (socketId) {
                connectToPeer(socketId);
                
                // Actualizar aspecto del botón inmediatamente
                button.textContent = 'Conectando...';
                button.classList.remove('btn-primary', 'btn-danger');
                button.classList.add('btn-warning');
                button.disabled = true;
            }
        });
    });
}

// Función para actualizar el botón de inicio
function updateLaunchButton() {
    const launchButton = document.getElementById('launch-button');
    const warcraftPathInput = document.getElementById('warcraft-path');
    warcraftPath = warcraftPathInput.value.trim();
    
    // Verificar si hay al menos una conexión P2P activa
    const hasActiveConnections = Object.values(peerConnections).some(pc => 
        pc.connectionState === 'connected' || pc.iceConnectionState === 'connected'
    );
    
    // Habilitar el botón solo si hay una ruta de Warcraft y al menos una conexión activa
    if (warcraftPath && hasActiveConnections) {
        launchButton.disabled = false;
        addChatMessage('Ahora puedes iniciar Warcraft III para jugar con tu compañero.', 'success');
    } else {
        launchButton.disabled = true;
    }
}

// Función para añadir mensaje al chat
function addChatMessage(message, type = '') {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    
    if (type) {
        messageElement.classList.add(type);
    }
    
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Si no estamos en la pestaña de chat, añadir indicador visual
    if (!document.getElementById('chat-tab').classList.contains('active')) {
        document.getElementById('chat-tab').classList.add('text-danger');
    }
}

// Función para iniciar heartbeat
function startHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    heartbeatInterval = setInterval(() => {
        // Verificar si hemos recibido heartbeat en los últimos 20 segundos
        const now = Date.now();
        if (now - lastReceivedHeartbeat > 20000) {
            console.log('No se ha recibido heartbeat en los últimos 20 segundos.');
            
            // Si el socket parece conectado pero no recibimos heartbeat, forzar reconexión
            if (socket && socket.connected) {
                console.log('Forzando reconexión debido a falta de heartbeat');
                socket.disconnect();
                scheduleReconnection();
            }
        }
    }, 10000);
}

// Función para lanzar Warcraft III
function launchWarcraftIII() {
    if (!warcraftPath) {
        addChatMessage('Por favor, configura la ruta de Warcraft III primero.', 'warning');
        return;
    }
    
    // Verificar si hay al menos una conexión P2P activa
    const hasActiveConnections = Object.values(peerConnections).some(pc => 
        pc.connectionState === 'connected' || pc.iceConnectionState === 'connected'
    );
    
    if (!hasActiveConnections) {
        addChatMessage('Debes estar conectado con al menos un jugador para iniciar el juego.', 'warning');
        return;
    }
    
    // Enviar mensaje a todos los peers
    Object.entries(dataChannels).forEach(([socketId, channel]) => {
        if (channel.readyState === 'open') {
            channel.send(JSON.stringify({
                type: 'system',
                message: `${username} ha iniciado Warcraft III`
            }));
        }
    });
    
    // Iniciar el juego
    addChatMessage('Iniciando Warcraft III...', 'info');
    window.api.send('launch-warcraft', warcraftPath);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Botón de conexión
    document.getElementById('connect-button').addEventListener('click', connectToServer);
    
    // Botón de desconexión
    document.getElementById('disconnect-button').addEventListener('click', () => {
        // Cerrar todas las conexiones P2P
        Object.values(peerConnections).forEach(pc => pc.close());
        peerConnections = {};
        dataChannels = {};
        
        // Desconectar socket
        if (socket) {
            socket.disconnect();
        }
        
        // Restablecer UI
        document.getElementById('connection-form').style.display = 'block';
        document.getElementById('game-info').style.display = 'none';
        document.getElementById('connect-button').disabled = false;
        
        // Limpiar variables
        knownPeers.clear();
        isConnecting = false;
        
        // Detener heartbeat
        clearInterval(heartbeatInterval);
        
        // Detener reconexión programada
        if (reconnectTimeoutId) {
            clearTimeout(reconnectTimeoutId);
            reconnectTimeoutId = null;
        }
        
        updateConnectionBanner('disconnected', 'Desconectado del servidor');
        setTimeout(() => {
            const banner = document.getElementById('connection-banner');
            if (banner) banner.style.display = 'none';
        }, 3000);
    });
    
    // Botón de envío de chat
    document.getElementById('send-button').addEventListener('click', sendChatMessage);
    
    // Enviar mensaje con Enter
    document.getElementById('chat-input').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    // Botón de lanzamiento de Warcraft
    document.getElementById('launch-button').addEventListener('click', launchWarcraftIII);
    
    // Cambio en la ruta de Warcraft
    document.getElementById('warcraft-path').addEventListener('input', updateLaunchButton);
    
    // Cambio de pestaña
    document.querySelectorAll('.nav-link').forEach(tab => {
        tab.addEventListener('click', () => {
            // Si cambiamos a la pestaña de chat, eliminar indicador visual
            if (tab.id === 'chat-tab') {
                tab.classList.remove('text-danger');
            }
        });
    });
    
    // Detección de cambios de red
    setInterval(() => {
        const currentNetworkState = navigator.onLine;
        if (currentNetworkState !== lastNetworkState) {
            lastNetworkState = currentNetworkState;
            if (currentNetworkState) {
                console.log('Red conectada (verificación periódica)');
                // Si el socket está desconectado, intentar reconectar
                if (socket && !socket.connected) {
                    reconnectAttempt = 0;
                    scheduleReconnection();
                }
            } else {
                console.log('Red desconectada (verificación periódica)');
                updateConnectionBanner('disconnected', 'Sin conexión a Internet');
            }
        }
    }, 5000);
});

// Eventos recibidos desde el proceso principal
window.api.receive('warcraft-launched', (success, error) => {
    if (success) {
        addChatMessage('Warcraft III iniciado correctamente.', 'success');
    } else {
        addChatMessage(`Error al iniciar Warcraft III: ${error}`, 'error');
    }
});

// Autoconectar si hay parámetros en la URL
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const autoServer = urlParams.get('server');
    const autoUser = urlParams.get('user');
    const autoRoom = urlParams.get('room');
    
    if (autoServer && autoUser && autoRoom) {
        document.getElementById('server-address').value = autoServer;
        document.getElementById('username').value = autoUser;
        document.getElementById('room-id').value = autoRoom;
        
        // Conectar automáticamente después de un breve retraso
        setTimeout(() => {
            connectToServer();
        }, 500);
    }
}); 
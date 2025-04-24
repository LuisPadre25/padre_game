// Archivo para exponer APIs al contexto del navegador
const { contextBridge, ipcRenderer } = require('electron');

// Lista blanca de canales IPC permitidos
const validChannels = [
  'toMain',
  'fromMain',
  'open-friends-window',
  'open-chat-window',
  'close-chat-window',
  'open-create-game-window',
  'resize-window-create-game',
  'open-waiting-room',
  'game-data',
  'friend-data',
  'minimize-window',
  'maximize-window',
  'close-window',
  'send-chat-message',
  'receive-message',
  'open-profile-window',
  'user-data',
  'close-profile-window'
];

// Función para validar canales
const validateChannel = (channel) => {
  if (!validChannels.includes(channel)) {
    console.warn(`Canal IPC no permitido: ${channel}`);
    return false;
  }
  return true;
};

contextBridge.exposeInMainWorld('api', {
  // Funciones de ventana
  openFriendsWindow: () => ipcRenderer.send('open-friends-window'),
  openChatWindow: (friend) => ipcRenderer.send('open-chat-window', friend),
  closeChatWindow: (friendId) => ipcRenderer.send('close-chat-window', friendId),
  openCreateGameWindow: () => ipcRenderer.send('open-create-game-window'),
  openWaitingRoom: (gameData) => ipcRenderer.send('open-waiting-room', gameData),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  openProfileWindow: (userData) => {
    console.log('Enviando datos de usuario al proceso principal:', userData);
    ipcRenderer.send('open-profile-window', userData);
  },
  closeProfileWindow: () => ipcRenderer.send('close-profile-window'),

  // Funciones de mensajería
  send: (channel, data) => {
    if (validateChannel(channel)) {
      console.log(`Enviando datos por canal ${channel}:`, data);
      ipcRenderer.send(channel, data);
    }
  },
  on: (channel, callback) => {
    if (validateChannel(channel) && typeof callback === 'function') {
      console.log(`Registrando listener para canal ${channel}`);
      const subscription = (event, ...args) => {
        console.log(`Evento recibido en canal ${channel}:`, args);
        callback(...args);
      };
      ipcRenderer.on(channel, subscription);
      // Devolver una función para limpiar el listener
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
  },
  removeListener: (channel, callback) => {
    if (validateChannel(channel) && typeof callback === 'function') {
      console.log(`Removiendo listener del canal ${channel}`);
      ipcRenderer.removeListener(channel, callback);
    }
  },
  resizeWindowCreateGame: (width, height) => {
    console.log('preload: enviando resize con', width, height);
    ipcRenderer.send('resize-window-create-game', { width, height });
  }
});

contextBridge.exposeInMainWorld('electron', {
  sendMessage: (message) => ipcRenderer.send('send-chat-message', message),
  receiveMessage: (callback) => {
    if (typeof callback === 'function') {
      ipcRenderer.on('receive-message', (event, message) => callback(message));
    }
  },
  getFriendData: () => ipcRenderer.invoke('get-friend-data'),
  closeWindow: () => ipcRenderer.send('close-window'),
  ipcRenderer: {
    send: (channel, data) => {
      if (validateChannel(channel)) {
        console.log(`Enviando datos por canal ${channel}:`, data);
        ipcRenderer.send(channel, data);
      }
    },
    on: (channel, func) => {
      if (validateChannel(channel) && typeof func === 'function') {
        console.log(`Registrando listener para canal ${channel}`);
        const subscription = (event, ...args) => {
          console.log(`Evento recibido en canal ${channel}:`, args);
          func(...args);
        };
        ipcRenderer.on(channel, subscription);
        // Devolver una función para limpiar el listener
        return () => {
          ipcRenderer.removeListener(channel, subscription);
        };
      }
    },
    removeListener: (channel, func) => {
      if (validateChannel(channel) && typeof func === 'function') {
        console.log(`Removiendo listener del canal ${channel}`);
        ipcRenderer.removeListener(channel, func);
      }
    }
  }
}); 
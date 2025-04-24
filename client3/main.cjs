const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let friendsWindow = null;
let createGameWindow = null;
let waitingRoomWindow = null;
const chatWindows = new Map();

// Configuración de la ventana de creación de partida
const createGameWindowConfig = {
  width: 600,
  height: 380,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.cjs')
  },
  frame: false,
  transparent: true,
  resizable: false,
  show: false,
  backgroundColor: '#1a1a2e',
  minWidth: 600,
  minHeight: 380
};

// Configuración de la ventana de sala de espera
const waitingRoomConfig = {
  width: 1200,
  height: 800,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.cjs')
  },
  frame: true,
  resizable: true,
  show: false,
  backgroundColor: '#1a1a2e',
  minWidth: 1000,
  minHeight: 700
};

// Configuración de la ventana de chat
const chatWindowConfig = {
  width: 400,
  height: 600,
  minWidth: 350,
  minHeight: 500,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.cjs'),
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false
  },
  frame: true,
  backgroundColor: '#1a1a2e'
};

// Configuración de la ventana de perfil
const profileWindowConfig = {
  width: 800,
  height: 900,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.cjs'),
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false
  },
  frame: false,
  transparent: true,
  resizable: false,
  show: false,
  backgroundColor: '#1a1a2e',
  minWidth: 800,
  minHeight: 900,
  parent: mainWindow,
  modal: true
};

let profileWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 650,
    frame: false,
    minWidth: 1000, 
    minHeight: 650,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true
    },
    backgroundColor: '#1a1a2e',
    show: false
  });

  // En desarrollo, cargar desde el servidor Vite
  const startUrl = 'http://localhost:5173';
  
  mainWindow.loadURL(startUrl);
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  // Abrir DevTools en desarrollo
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
    // Cerrar todas las ventanas de chat cuando se cierra la ventana principal
    chatWindows.forEach(window => window.close());
    chatWindows.clear();
    if (friendsWindow) {
      friendsWindow.close();
      friendsWindow = null;
    }
    if (createGameWindow) {
      createGameWindow.close();
      createGameWindow = null;
    }
  });
}

function createFriendsWindow() {
  if (friendsWindow) {
    friendsWindow.focus();
    return;
  }

  friendsWindow = new BrowserWindow({
    width: 400,
    height: 600,
    parent: mainWindow,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true
    },
    backgroundColor: '#1a1a2e',
    show: false
  });

  friendsWindow.loadURL('http://localhost:5173/friends');
  
  friendsWindow.once('ready-to-show', () => {
    friendsWindow.show();
  });

  friendsWindow.on('closed', () => {
    friendsWindow = null;
  });
}

function createChatWindow(friend) {
  console.log('Creando ventana de chat para:', friend);
  
  if (chatWindows.has(friend.id)) {
    console.log('Ventana de chat existente, enfocando...');
    chatWindows.get(friend.id).focus();
    return;
  }

  const chatWindow = new BrowserWindow({
    ...chatWindowConfig,
    parent: mainWindow,
    frame: false,
    transparent: true,
    resizable: true
  });

  // En desarrollo, cargar desde el servidor Vite
  chatWindow.loadURL('http://localhost:5173/chat');
  
  // Enviar datos del amigo cuando la ventana esté lista
  chatWindow.webContents.on('did-finish-load', () => {
    console.log('Ventana de chat cargada, enviando datos del amigo:', friend);
    // Enviamos datos completos del amigo
    const friendData = {
      id: friend.id,
      name: friend.name || 'Amigo',
      status: friend.status || 'offline',
      color: friend.color || '#00b4db',
      avatar: friend.avatar || null,
      lastSeen: friend.lastSeen || 'Desconectado',
      level: friend.level || 1,
      rank: friend.rank || 'Novato',
      gameStatus: friend.gameStatus || 'Disponible',
      ping: friend.ping || 0
    };
    chatWindow.webContents.send('friend-data', friendData);
    chatWindow.show();
  });

  // Abrir DevTools en desarrollo
  if (process.env.NODE_ENV === 'development') {
    chatWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Limpiar la referencia cuando se cierre la ventana
  chatWindow.on('closed', () => {
    console.log('Ventana de chat cerrada, limpiando referencia');
    chatWindows.delete(friend.id);
  });

  // Guardar la referencia de la ventana
  chatWindows.set(friend.id, chatWindow);
  console.log('Nueva ventana de chat creada y guardada');

  return chatWindow;
}

// Manejo de mensajes IPC
ipcMain.on('open-friends-window', () => {
  createFriendsWindow();
});

// Add this near the top of your file, after the imports
ipcMain.on('*', (event, ...args) => {
  console.log('Received IPC event:', event.type, args);
});

// Manejador para abrir la ventana de chat
ipcMain.on('open-chat-window', (event, friend) => {
  if (chatWindows.has(friend.id)) {
    const window = chatWindows.get(friend.id);
    if (window.isMinimized()) window.restore();
    window.focus();
    return;
  }

  const chatWindow = new BrowserWindow({
    ...chatWindowConfig,
    parent: mainWindow
  });

  // En desarrollo, cargar desde el servidor Vite
  chatWindow.loadURL('http://localhost:5173/chat');
  
  chatWindow.webContents.on('did-finish-load', () => {
    chatWindow.webContents.send('friend-data', friend);
  });

  chatWindow.on('closed', () => {
    chatWindows.delete(friend.id);
  });

  chatWindows.set(friend.id, chatWindow);
});

ipcMain.on('send-chat-message', (event, { friendId, message }) => {
  console.log('Recibido mensaje para enviar:', message, 'a friendId:', friendId);
  const chatWindow = chatWindows.get(friendId);
  if (chatWindow) {
    // Simular respuesta del amigo
    setTimeout(() => {
      const response = {
        id: Date.now(),
        content: `Respuesta automática a: ${message.content}`,
        timestamp: new Date().toISOString(),
        isSelf: false
      };
      console.log('Enviando respuesta automática:', response);
      chatWindow.webContents.send('receive-message', response);
    }, 1000);
  }
});

ipcMain.on('close-chat-window', (event, friendId) => {
  if (chatWindows.has(friendId)) {
    chatWindows.get(friendId).close();
  }
});

// Manejador para abrir la ventana de creación de partida
ipcMain.on('open-create-game-window', () => {
  if (createGameWindow) {
    createGameWindow.focus();
    return;
  }

  createGameWindow = new BrowserWindow({
    ...createGameWindowConfig,
    parent: mainWindow
  });

  // En desarrollo, cargar desde el servidor Vite
  createGameWindow.loadURL('http://localhost:5173/create-game');
  
  createGameWindow.once('ready-to-show', () => {
    // Obtener el tamaño real del contenido
    createGameWindow.webContents.executeJavaScript(`
      document.body.offsetHeight;
    `).then((height) => {
      // Ajustar la altura de la ventana con un margen
      createGameWindow.setSize(createGameWindowConfig.width, createGameWindowConfig.height, true);
      createGameWindow.show();
      // Abrir DevTools para debugging en desarrollo
      if (process.env.NODE_ENV === 'development') {
        createGameWindow.webContents.openDevTools({ mode: 'detach' });
      }
    });
  });

  createGameWindow.on('closed', () => {
    createGameWindow = null;
  });
});
ipcMain.on('resize-window-create-game', (event, data) => {
  console.log('Recibido evento resize-window-create-game:', data);
  if (createGameWindow) {
    console.log('Redimensionando ventana a:', data.width, data.height);
    try {
      // Forzar el redimensionamiento
      createGameWindow.setMinimumSize(data.width, data.height);
      createGameWindow.setSize(data.width, data.height, true);
      createGameWindow.center();
      console.log('Ventana redimensionada correctamente a:', createGameWindow.getSize());
    } catch (error) {
      console.error('Error al redimensionar:', error);
    }
  } else {
    console.log('createGameWindow no está disponible');
  }
});

// Manejador para abrir la ventana de sala de espera
ipcMain.on('open-waiting-room', (event, gameData) => {
  if (waitingRoomWindow) {
    waitingRoomWindow.focus();
    return;
  }

  waitingRoomWindow = new BrowserWindow({
    ...waitingRoomConfig,
    parent: mainWindow
  });

  // En desarrollo, cargar desde el servidor Vite
  waitingRoomWindow.loadURL('http://localhost:5173/waiting-room');
  
  waitingRoomWindow.once('ready-to-show', () => {
    waitingRoomWindow.show();
    // Enviar los datos de la partida a la ventana
    waitingRoomWindow.webContents.send('game-data', gameData);
    // Abrir DevTools para debugging en desarrollo
    if (process.env.NODE_ENV === 'development') {
      waitingRoomWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  waitingRoomWindow.on('closed', () => {
    waitingRoomWindow = null;
  });
});

// Manejadores IPC para el chat
ipcMain.on('request-friend-data', (event) => {
  // Aquí puedes obtener los datos del amigo de tu base de datos o estado
  const friendData = {
    id: 1,
    name: 'Amigo',
    status: 'online',
    color: '#00b4db',
    avatar: null,
    lastSeen: 'En línea',
    level: 5,
    rank: 'Guerrero',
    gameStatus: 'En partida',
    ping: 45
  };
  event.reply('friend-data', friendData);
});

ipcMain.on('send-message', (event, message) => {
  // Aquí puedes guardar el mensaje en tu base de datos
  console.log('Mensaje enviado:', message);
  
  // Simular respuesta del amigo
  setTimeout(() => {
    const response = {
      id: Date.now(),
      content: '¡Gracias por tu mensaje!',
      sender: 'friend',
      timestamp: new Date().toISOString()
    };
    event.reply('chat-message', response);
  }, 1000);
});

// Manejadores para los controles de ventana
ipcMain.on('minimize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.minimize();
  }
});

ipcMain.on('maximize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.close();
  }
});

// Manejador para abrir la ventana de perfil
ipcMain.on('open-profile-window', (event, userData) => {
  console.log('Abriendo ventana de perfil con datos:', userData);
  
  if (profileWindow) {
    console.log('Ventana de perfil ya existe, enfocando...');
    profileWindow.focus();
    // Reenviar los datos del usuario a la ventana existente
    profileWindow.webContents.send('user-data', userData);
    return;
  }

  try {
    profileWindow = new BrowserWindow({
      ...profileWindowConfig,
      parent: mainWindow
    });

    console.log('Cargando URL de perfil...');
    // En desarrollo, cargar desde el servidor Vite
    profileWindow.loadURL('http://localhost:5173/profile');
    
    // Asegurarse de que los datos del usuario tengan la estructura correcta
    const processedUserData = {
      id: userData?.id || 'N/A',
      name: userData?.name || 'Usuario',
      nickname: userData?.nickname || userData?.name || 'Usuario',
      avatar: userData?.avatar || '/default-avatar.png',
      tier: userData?.tier || 'normal',
      clan: userData?.clan || 'Sin clan',
      level: userData?.level || 1,
      rank: userData?.rank || 'Novato',
      status: userData?.status || 'Desconectado',
      lastSeen: userData?.lastSeen || 'Nunca',
      joinDate: userData?.joinDate || 'Desconocido',
      stats: {
        wins: userData?.stats?.wins || 0,
        losses: userData?.stats?.losses || 0,
        kd: userData?.stats?.kd || 0,
        totalGames: (userData?.stats?.wins || 0) + (userData?.stats?.losses || 0),
        winRate: userData?.stats?.wins ? ((userData.stats.wins / ((userData.stats.wins || 0) + (userData.stats.losses || 0))) * 100).toFixed(1) : 0,
        avgKills: userData?.stats?.avgKills || 0,
        avgDeaths: userData?.stats?.avgDeaths || 0,
        highestKillStreak: userData?.stats?.highestKillStreak || 0,
        totalPlayTime: userData?.stats?.totalPlayTime || '0h 0m'
      },
      notes: userData?.notes || 'No hay notas disponibles',
      gallery: userData?.gallery || [],
      achievements: userData?.achievements || [],
      recentGames: userData?.recentGames || [],
      favoriteWeapons: userData?.favoriteWeapons || [],
      friends: userData?.friends || [],
      clanMembers: userData?.clanMembers || []
    };

    console.log('Datos procesados para enviar:', processedUserData);

    // Esperar a que la ventana esté completamente cargada
    profileWindow.webContents.on('did-finish-load', () => {
      console.log('Ventana de perfil completamente cargada, enviando datos...');
      // Enviar los datos del usuario a la ventana
      profileWindow.webContents.send('user-data', processedUserData);
      profileWindow.show();
      
      // Abrir DevTools para debugging en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log('Abriendo DevTools para perfil...');
        profileWindow.webContents.openDevTools({ mode: 'detach' });
      }
    });

    profileWindow.on('closed', () => {
      console.log('Ventana de perfil cerrada');
      profileWindow = null;
    });

    // Manejar errores de carga
    profileWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Error al cargar la ventana de perfil:', errorCode, errorDescription);
    });

  } catch (error) {
    console.error('Error al crear la ventana de perfil:', error);
  }
});

// Manejador para cerrar la ventana de perfil
ipcMain.on('close-profile-window', () => {
  if (profileWindow) {
    profileWindow.close();
    profileWindow = null;
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
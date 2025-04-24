const { contextBridge, ipcRenderer } = require('electron');

// Configurar la política de seguridad de contenido
const csp = `
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self';
`;

// Aplicar la política de seguridad
document.addEventListener('DOMContentLoaded', () => {
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = csp;
  document.head.appendChild(meta);
});

// Exponer la API al renderer
contextBridge.exposeInMainWorld('api', {
  on: (channel, callback) => {
    const validChannels = ['user-data'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(event, ...args));
    }
  },
  requestUserData: () => {
    ipcRenderer.send('request-user-data');
  },
  closeProfileWindow: () => {
    ipcRenderer.send('close-profile-window');
  }
}); 
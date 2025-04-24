// Archivo para exponer APIs al contexto del navegador
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Aquí puedes exponer funciones seguras
  send: (...args) => ipcRenderer.send(...args),
  on: (channel, callback) => ipcRenderer.on(channel, callback),
  requestWindowResize: (height) => ipcRenderer.send('resize-create-game-window', height)

});

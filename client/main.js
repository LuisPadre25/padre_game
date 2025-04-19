const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');

// Desactivar aceleración de hardware para evitar errores en versiones Windows N/KN
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-features', 'MediaFoundation');

// Almacenar la ventana principal globalmente para evitar que se cierre por recolección de basura
let mainWindow;
let warcraftProcess = null;

function createWindow() {
  // Crear la ventana del navegador
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  // Cargar el archivo HTML de la aplicación
  mainWindow.loadFile('index.html');

  // Abrir DevTools en modo desarrollo
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Cuando se cierre la ventana
  mainWindow.on('closed', () => {
    // Cerrar Warcraft si está abierto
    if (warcraftProcess && !warcraftProcess.killed) {
      warcraftProcess.kill();
    }
    mainWindow = null;
  });
}

// Este método se ejecutará cuando Electron haya terminado
// la inicialización y esté listo para crear ventanas del navegador.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // En macOS es común volver a crear una ventana en la aplicación cuando
    // se hace clic en el icono del dock y no hay otras ventanas abiertas.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Salir cuando todas las ventanas estén cerradas, excepto en macOS.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Manejar la selección de la ruta del ejecutable de Warcraft
ipcMain.handle('select-warcraft-exe', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Warcraft III Executable', extensions: ['exe'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  
  return null;
});

// Iniciar Warcraft con la ruta proporcionada
ipcMain.handle('launch-warcraft', async (event, warcraftPath) => {
  try {
    if (warcraftProcess && !warcraftProcess.killed) {
      warcraftProcess.kill();
    }
    
    warcraftProcess = spawn(warcraftPath, {
      detached: false
    });
    
    warcraftProcess.on('error', (error) => {
      mainWindow.webContents.send('warcraft-error', error.message);
      return false;
    });
    
    warcraftProcess.on('close', (code) => {
      mainWindow.webContents.send('warcraft-closed', code);
      warcraftProcess = null;
    });
    
    return true;
  } catch (error) {
    mainWindow.webContents.send('warcraft-error', error.message);
    return false;
  }
});

// Manejar la apertura del documento de solución de problemas
ipcMain.handle('open-troubleshooting', async () => {
  const troubleshootingPath = path.join(__dirname, 'SOLUCION_PROBLEMAS.md');
  
  // Si el sistema puede abrir archivos .md directamente
  try {
    await shell.openPath(troubleshootingPath);
    return true;
  } catch (error) {
    // Si falla, mostrar el contenido en una ventana
    try {
      const content = fs.readFileSync(troubleshootingPath, 'utf8');
      
      const troubleshootWindow = new BrowserWindow({
        width: 800,
        height: 600,
        parent: mainWindow,
        modal: true,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });
      
      // Crear archivo HTML temporal
      const tempHtmlPath = path.join(app.getPath('temp'), 'troubleshooting.html');
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Solución de Problemas</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
            h1 { color: #0059b2; }
            h2 { color: #0069d9; margin-top: 20px; }
            pre { background-color: #f5f5f5; padding: 10px; border-radius: 5px; }
            a { color: #0069d9; }
          </style>
        </head>
        <body>
          <div id="content">${content.replace(/\n/g, '<br>').replace(/\`\`\`(.*?)\`\`\`/g, '<pre>$1</pre>')}</div>
        </body>
        </html>
      `;
      
      fs.writeFileSync(tempHtmlPath, htmlContent);
      troubleshootWindow.loadFile(tempHtmlPath);
      
      return true;
    } catch (fsError) {
      console.error('Error al abrir solución de problemas:', fsError);
      return false;
    }
  }
}); 
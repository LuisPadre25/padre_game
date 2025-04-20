const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');

// Eliminar intentos de cargar robotjs
// const robot = null;  // No más robotjs

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

// Iniciar Warcraft con opciones avanzadas para automatizar la creación o unión a partidas
ipcMain.handle('launch-warcraft-with-options', async (event, options) => {
  try {
    // Extraer las opciones
    const { path: warcraftPath, isHost, gameId, playerName } = options;
    
    // Si hay un proceso de Warcraft en ejecución, cerrarlo
    if (warcraftProcess && !warcraftProcess.killed) {
      warcraftProcess.kill();
    }
    
    // El nombre de usuario para Warcraft debe tener entre 3 y 15 caracteres
    const sanitizedPlayerName = (playerName || 'Player').substring(0, 15);
    
    // El ID de la partida debe tener entre 3 y 12 caracteres
    const sanitizedGameId = (gameId || 'Game').substring(0, 12);
    
    // Preparar los argumentos para Warcraft
    const warcraftArgs = [];
    
    // Crear una ventana de instrucciones detalladas
    const instructionsWindow = new BrowserWindow({
      width: 600,
      height: 500,
      parent: mainWindow,
      modal: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });
    
    // Crear contenido HTML con instrucciones detalladas
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Instrucciones para Warcraft III</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background-color: #0a1929; 
            color: #ddd;
          }
          h1 { color: #4caf50; text-align: center; }
          h2 { color: #ff9800; margin-top: 20px; }
          .step { 
            margin-bottom: 15px; 
            padding: 15px; 
            background-color: #132f4c;
            border-radius: 5px;
            border-left: 5px solid #0059b2;
          }
          .important {
            background-color: #302a24;
            border-left: 5px solid #ff9800;
            padding: 10px;
            margin: 15px 0;
          }
          img { max-width: 100%; margin: 10px 0; }
          .close-btn {
            display: block;
            width: 80%;
            margin: 20px auto;
            padding: 10px;
            background-color: #0059b2;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
          }
          .close-btn:hover {
            background-color: #0069d9;
          }
        </style>
      </head>
      <body>
        <h1>${isHost ? 'Crear partida LAN' : 'Unirse a partida LAN'}</h1>
        
        <div class="important">
          <p><strong>IMPORTANTE:</strong> Warcraft III se iniciará automáticamente. Sigue estos pasos exactamente.</p>
        </div>
        
        <h2>Paso 1: Configurar tu nombre de jugador</h2>
        <div class="step">
          <p>1. Haz clic en el botón <strong>Opciones</strong> del menú principal</p>
          <p>2. Haz clic en la pestaña <strong>Configuración del jugador</strong></p>
          <p>3. Escribe tu nombre: <strong>${sanitizedPlayerName}</strong></p>
          <p>4. Haz clic en <strong>Aceptar</strong> para guardar los cambios</p>
          <p>5. Vuelve al <strong>Menú principal</strong></p>
        </div>
        
        <h2>Paso 2: ${isHost ? 'Crear una partida' : 'Unirse a la partida'}</h2>
        <div class="step">
          <p>1. Haz clic en el botón <strong>Red local (LAN)</strong></p>
          ${isHost ?
            `<p>2. Haz clic en <strong>Crear partida</strong></p>
             <p>3. Escribe el nombre exacto: <strong>${sanitizedGameId}</strong></p>
             <p>4. Haz clic en <strong>Crear</strong></p>
             <p>5. <strong>¡Importante!</strong> Espera a que los demás jugadores se unan</p>` :
            
            `<p>2. Haz clic en <strong>Unirse a partida</strong></p>
             <p>3. Busca y selecciona la partida con el nombre: <strong>${sanitizedGameId}</strong></p>
             <p>4. Si no aparece inmediatamente, espera unos segundos y haz clic en <strong>Actualizar</strong></p>
             <p>5. Haz clic en <strong>Unirse</strong> cuando encuentres la partida</p>`
          }
        </div>
        
        <div class="important">
          <p><strong>Nota:</strong> Estas instrucciones se mantendrán visibles mientras configuras Warcraft III.</p>
          <p>Puedes cerrar esta ventana una vez que hayas completado los pasos.</p>
        </div>
        
        <button class="close-btn" onclick="window.close()">Cerrar cuando hayas completado los pasos</button>
      </body>
      </html>
    `;
    
    // Crear archivo HTML temporal
    const tempHtmlPath = path.join(app.getPath('temp'), 'warcraft-instructions.html');
    fs.writeFileSync(tempHtmlPath, htmlContent);
    
    // Cargar las instrucciones
    instructionsWindow.loadFile(tempHtmlPath);
    instructionsWindow.setAlwaysOnTop(true);
    
    // Iniciar Warcraft
    warcraftProcess = spawn(warcraftPath, warcraftArgs, {
      detached: false
    });
    
    // Manejar errores
    warcraftProcess.on('error', (error) => {
      mainWindow.webContents.send('warcraft-error', error.message);
      return false;
    });
    
    // Manejar cierre
    warcraftProcess.on('close', (code) => {
      mainWindow.webContents.send('warcraft-closed', code);
      warcraftProcess = null;
      
      // Cerrar ventana de instrucciones si sigue abierta
      if (!instructionsWindow.isDestroyed()) {
        instructionsWindow.close();
      }
    });
    
    // Enviar instrucciones al usuario
    mainWindow.webContents.send('warcraft-launched', {
      isHost: isHost,
      gameName: sanitizedGameId,
      playerName: sanitizedPlayerName,
      instructions: isHost 
        ? 'Sigue las instrucciones para crear una partida LAN con nombre: ' + sanitizedGameId
        : 'Sigue las instrucciones para buscar la partida LAN con nombre: ' + sanitizedGameId
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
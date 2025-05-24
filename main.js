// main.js
const { app, BrowserWindow, Menu, Tray, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let tray = null;
let isQuiting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true  // 👈 necessário para que <webview> funcione
  },
    icon: path.join(__dirname, 'icons', 'app.png')
  });

  mainWindow.loadFile('index.html');
  Menu.setApplicationMenu(null); // Remove menu padrão

  mainWindow.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

app.whenReady().then(() => {
  createWindow();

  tray = new Tray(path.join(__dirname, 'icons', 'app.png'));
  tray.setToolTip('IA Hub');
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Mostrar',
      click: () => mainWindow.show()
    },
    {
      label: 'Sair',
      click: () => {
        isQuiting = true;
        app.quit();
      }
    }
  ]));

  tray.on('click', () => {
    mainWindow.show();
  });

  ipcMain.on('reload-tab', (event, tabId) => {
    mainWindow.webContents.send('reload-tab', tabId);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

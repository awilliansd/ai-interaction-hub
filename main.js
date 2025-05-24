// main.js
const { app, BrowserWindow, Menu, Tray, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow;
let tray = null;
let isQuiting = false;
let minimizeToTray = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true  // 👈 necessário para que <webview> funcione
    },
    icon: path.join(__dirname, 'icons', 'app.png')
  });

  mainWindow.loadFile('index.html');
  Menu.setApplicationMenu(null); // Remove menu padrão

  mainWindow.on('close', (event) => {
    if (!isQuiting && minimizeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

app.whenReady().then(() => {
  createWindow();

  tray = new Tray(path.join(__dirname, 'icons', 'app.png'));
  tray.setToolTip('AI Interaction Hub');
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

  // IPC handlers
  ipcMain.on('reload-tab', (event, tabId) => {
    mainWindow.webContents.send('reload-tab', tabId);
  });

  ipcMain.on('exit-app', () => {
    isQuiting = true;
    app.quit();
  });

  ipcMain.on('open-github', () => {
    shell.openExternal('https://github.com/awilliansd');
  });

  ipcMain.on('set-minimize-to-tray', (event, value) => {
    minimizeToTray = value;
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

const fs = require('fs');
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

function saveSettings(settings) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath));
  } catch {
    return { minimizeToTray: false };
  }
}

ipcMain.on('set-minimize-to-tray', (event, value) => {
  const currentSettings = loadSettings();
  currentSettings.minimizeToTray = value;
  saveSettings(currentSettings);
});

ipcMain.on("app:close", () => {
  app.quit();
});

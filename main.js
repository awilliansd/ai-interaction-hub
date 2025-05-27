// main.js
const { app, BrowserWindow, Menu, Tray, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow;
let tray = null;
let isQuiting = false;
let minimizeToTray = loadSettings().minimizeToTray ?? false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    },
    icon: path.join(__dirname, 'icons', 'app.png')
  });

  mainWindow.loadFile('index.html');

  mainWindow.webContents.on('did-finish-load', () => {
    const settings = loadSettings();
    mainWindow.webContents.send('init-settings', settings);
  });

  Menu.setApplicationMenu(null);

  mainWindow.on('close', (event) => {
    if (!isQuiting && minimizeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
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
    const settings = loadSettings();
    mainWindow.webContents.send('init-settings', settings);
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
    const currentSettings = loadSettings();
    currentSettings.minimizeToTray = value;
    saveSettings(currentSettings);
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

ipcMain.on("app:close", () => {
  app.quit();
});

ipcMain.handle('get-app-version', () => {
  return require('./package.json').version;
});
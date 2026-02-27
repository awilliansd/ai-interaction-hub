// modules/windowManager.js
const { BrowserWindow, Menu } = require("electron");
const path = require("path");

let mainWindow = null;

function sendCommandToRenderer(command) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send(command);
  }
}

function createWindow(app, settings) {
  if (!app) {
    throw new Error("WindowManager: Instância do 'app' do Electron é necessária.");
  }

  let windowIconPath;
  if (app.isPackaged) {
    windowIconPath = path.join(process.resourcesPath, 'icons', 'hicolor', '512x512', 'apps', 'aiinteractionhub.png');
  } else {
    windowIconPath = path.join(app.getAppPath(), 'icons', 'app.png');
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "AI Interaction Hub",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(app.getAppPath(), "assets/js/preload.js"),
      webviewTag: true,
      spellcheck: true
    },
    icon: windowIconPath
  });

  mainWindow.loadFile(path.join(app.getAppPath(), "index.html"));

  mainWindow.webContents.on("did-finish-load", () => {
    const currentSettings = require("./settingsManager").loadSettings();
    mainWindow.webContents.send("init-settings", currentSettings);
  });

  const menuTemplate = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Configurações',
          click: () => sendCommandToRenderer('command:show-settings')
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: 'Alt+F4',
          click: () => sendCommandToRenderer('command:exit-app')
        }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Desfazer' },
        { role: 'redo', label: 'Refazer' },
        { type: 'separator' },
        { role: 'cut', label: 'Recortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Colar' },
        { role: 'selectAll', label: 'Selecionar Tudo' },
        { type: 'separator' },
        { role: 'toggleSpellChecker', label: 'Verificação Ortográfica' }
      ]
    },
    {
      label: 'Ferramentas',
      submenu: [
        {
          label: 'Recarregar Aba Ativa',
          accelerator: 'CmdOrCtrl+R',
          click: () => sendCommandToRenderer('command:reload-active-tab')
        },
        {
          label: 'Buscar na Aba Ativa',
          accelerator: 'CmdOrCtrl+F',
          click: () => sendCommandToRenderer('command:find-in-active-tab')
        },
        { type: 'separator' },
        {
          label: 'Limpar Cache e Reiniciar',
          click: () => {
            const { ipcMain } = require('electron');
            ipcMain.emit('clear-app-cache');
          }
        },
        { role: 'toggleDevTools', label: 'Alternar Ferramentas de Desenvolvedor' }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre',
          click: () => sendCommandToRenderer('command:show-about')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.setMenuBarVisibility(true);
  mainWindow.setAutoHideMenuBar(false);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

function showWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

function hideWindow() {
  if (mainWindow) mainWindow.hide();
}

module.exports = {
  createWindow,
  getMainWindow,
  showWindow,
  hideWindow
};

// modules/windowManager.js
const { BrowserWindow, Menu } = require("electron");
const path = require("path");
const Channels = require("./ipc-channels");
const { resolveWindowIconPath } = require("./iconResolver");

let mainWindow = null;
let baseWindowTitle = "AI Interaction Hub";
let currentTabName = null;

const WINDOW_DEFAULTS = {
  width: 1200,
  height: 800,
  backgroundColor: "#1e1e1e",
};

function buildWindowTitle(tabName) {
  if (!tabName) return baseWindowTitle;
  return `${baseWindowTitle} - ${tabName}`;
}

function sendCommandToRenderer(command) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send(command);
  }
}

function attachWindowListeners(win) {
  win.webContents.on("did-finish-load", () => {
    const currentSettings = require("./settingsManager").loadSettings();
    win.webContents.send(Channels.INIT_SETTINGS, currentSettings);
    setWindowTitle(currentTabName);
  });

  win.on("closed", () => {
    mainWindow = null;
  });
}

function buildAppMenu(actions = {}) {
  const menuTemplate = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Configurações',
          click: () => sendCommandToRenderer(Channels.CMD_SHOW_SETTINGS)
        },
        {
          label: 'Modo da Aplicação',
          submenu: [
            {
              label: 'Alternar Modo',
              click: () => sendCommandToRenderer(Channels.CMD_TOGGLE_APP_MODE)
            },
            { type: 'separator' },
            {
              label: 'Pessoal',
              click: () => sendCommandToRenderer(Channels.CMD_SET_APP_MODE_PERSONAL)
            },
            {
              label: 'Desenvolvedor',
              click: () => sendCommandToRenderer(Channels.CMD_SET_APP_MODE_DEVELOPER)
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: 'Alt+F4',
          click: () => sendCommandToRenderer(Channels.CMD_EXIT_APP)
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
          click: () => sendCommandToRenderer(Channels.CMD_RELOAD_ACTIVE_TAB)
        },
        {
          label: 'Buscar na Aba Ativa',
          accelerator: 'CmdOrCtrl+F',
          click: () => sendCommandToRenderer(Channels.CMD_FIND_IN_ACTIVE_TAB)
        },
        { type: 'separator' },
        {
          label: 'Limpar Cache e Reiniciar',
          click: () => {
            const { ipcMain } = require('electron');
            ipcMain.emit(Channels.CLEAR_APP_CACHE);
          }
        },
        { role: 'toggleDevTools', label: 'Alternar Ferramentas de Desenvolvedor' }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Verificar Atualizações',
          click: () => {
            if (typeof actions.checkForUpdates === "function") {
              actions.checkForUpdates(true);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Sobre',
          click: () => sendCommandToRenderer(Channels.CMD_SHOW_ABOUT)
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

function createWindow(app, settings, actions = {}) {
  if (!app) {
    throw new Error("WindowManager: Instância do 'app' do Electron é necessária.");
  }
  const appVersion = app.getVersion();
  baseWindowTitle = `AI Interaction Hub - v${appVersion}`;

  mainWindow = new BrowserWindow({
    width: WINDOW_DEFAULTS.width,
    height: WINDOW_DEFAULTS.height,
    title: buildWindowTitle(null),
    backgroundColor: WINDOW_DEFAULTS.backgroundColor,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(app.getAppPath(), "assets/js/preload.js"),
      spellcheck: true
    },
    icon: resolveWindowIconPath(app)
  });

  mainWindow.loadFile(path.join(app.getAppPath(), "index.html"));
  attachWindowListeners(mainWindow);
  buildAppMenu(actions);

  mainWindow.setMenuBarVisibility(true);
  mainWindow.setAutoHideMenuBar(false);

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

function setWindowTitle(tabName) {
  currentTabName = tabName || null;
  if (mainWindow) {
    mainWindow.setTitle(buildWindowTitle(currentTabName));
  }
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
  setWindowTitle,
  showWindow,
  hideWindow
};
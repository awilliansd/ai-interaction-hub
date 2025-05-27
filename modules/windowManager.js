// modules/windowManager.js
const { BrowserWindow, Menu } = require("electron"); // Removido app daqui
const path = require("path");

let mainWindow = null;

// Recebe 'app' como parâmetro
function createWindow(app, settings) {
  if (!app) {
    throw new Error("WindowManager: Instância do 'app' do Electron é necessária.");
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Usa app.getAppPath() passado como parâmetro
      preload: path.join(app.getAppPath(), "assets/js/preload.js"),
      webviewTag: true
    },
    // Usa app.getAppPath() passado como parâmetro
    icon: path.join(app.getAppPath(), "icons", "app.png")
  });

  // Usa app.getAppPath() passado como parâmetro
  mainWindow.loadFile(path.join(app.getAppPath(), "index.html"));

  mainWindow.webContents.on("did-finish-load", () => {
    // Carrega as configurações mais recentes ao terminar de carregar
    // É melhor buscar as configurações do settingsManager diretamente aqui ou via IPC
    const currentSettings = require("./settingsManager").loadSettings();
    mainWindow.webContents.send("init-settings", currentSettings);
  });

  Menu.setApplicationMenu(null);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // O manipulador 'close' será adicionado externamente (em main.js ou appLifecycle)
  // para melhor coordenação com a lógica de 'isQuiting'.

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

function showWindow() {
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
    }
}

function hideWindow() {
    if (mainWindow) {
        mainWindow.hide();
    }
}

module.exports = {
  createWindow,
  getMainWindow,
  showWindow,
  hideWindow
};
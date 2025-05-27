// modules/windowManager.js
const { BrowserWindow, Menu, app } = require("electron"); // Adicionado app
const path = require("path");

let mainWindow = null;

function createWindow(settings) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Assumindo que 'assets' está na raiz do app (app.getAppPath())
      preload: path.join(app.getAppPath(), "assets", "js", "preload.js"),
      webviewTag: true
    },
    // Assumindo que 'icons' está na raiz do app
    icon: path.join(app.getAppPath(), "icons", "app.png")
  });

  // Assumindo que 'index.html' está na raiz do app
  mainWindow.loadFile(path.join(app.getAppPath(), "index.html"));

  // Envia configurações iniciais após o carregamento
  mainWindow.webContents.on("did-finish-load", () => {
    // Recarrega as configurações mais recentes ao terminar de carregar
    const currentSettings = require("./settingsManager").loadSettings();
    mainWindow.webContents.send("init-settings", currentSettings);
  });

  // Remove o menu padrão
  Menu.setApplicationMenu(null);

  // O manipulador 'close' foi movido para main.js para melhor controle com appLifecycle

  mainWindow.on("closed", () => {
    // Remove a referência quando a janela é realmente fechada
    mainWindow = null;
  });

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
// modules/ipcHandlers.js
const { ipcMain, shell } = require("electron");

function initializeIpcHandlers(mainWindow, app, settingsManager) {
  if (!mainWindow) {
    console.error("IPC Handlers: mainWindow não está definida.");
    return;
  }

  // Recarregar uma aba específica (lógica do lado do renderer)
  ipcMain.on("reload-tab", (event, tabId) => {
    if (mainWindow) {
      mainWindow.webContents.send("reload-tab", tabId);
    }
  });

  // Sair da aplicação
  ipcMain.on("exit-app", () => {
    const appLifecycle = require("./appLifecycle"); // Importa dinamicamente ou passa como dependência
    appLifecycle.setIsQuiting(true);
    app.quit();
  });

  // Abrir link externo (GitHub)
  ipcMain.on("open-github", () => {
    shell.openExternal("https://github.com/awilliansd");
  });

  // Definir se minimiza para a bandeja
  ipcMain.on("set-minimize-to-tray", (event, value) => {
    const currentSettings = settingsManager.loadSettings();
    currentSettings.minimizeToTray = value;
    settingsManager.saveSettings(currentSettings);
    // Talvez notificar o appLifecycle ou windowManager sobre a mudança?
    // Depende de como a lógica de fechar/minimizar é gerenciada.
  });

  // Fechar a aplicação (alternativa a 'exit-app')
  ipcMain.on("app:close", () => {
    const appLifecycle = require("./appLifecycle");
    appLifecycle.setIsQuiting(true);
    app.quit();
  });

  // Obter a versão da aplicação
  ipcMain.handle("get-app-version", () => {
    try {
      // Ajuste o caminho para package.json se necessário
      const packageJsonPath = path.join(app.getAppPath(), "package.json");
      return require(packageJsonPath).version;
    } catch (error) {
      console.error("Erro ao ler package.json:", error);
      return "N/A";
    }
  });

  // Handler para carregar configurações (pode ser útil para o renderer)
  ipcMain.handle("get-settings", () => {
      return settingsManager.loadSettings();
  });

  // Handler para salvar configurações (pode ser útil para o renderer)
  ipcMain.handle("save-settings", (event, settings) => {
      settingsManager.saveSettings(settings);
  });

  console.log("Manipuladores IPC inicializados.");
}

module.exports = {
  initializeIpcHandlers
};
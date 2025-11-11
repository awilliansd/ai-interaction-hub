// modules/ipcHandlers.js
const { ipcMain, shell } = require("electron");
const path = require("path"); // path pode ser necessário para outras coisas, manter por enquanto

// Recebe mainWindow, app, e settingsManager como dependências
function initializeIpcHandlers(mainWindow, app, settingsManager) {
  if (!app) {
    console.error("IPC Handlers: Instância do 'app' não fornecida.");
    return;
  }
  if (!mainWindow) {
    // Alguns handlers podem não precisar da mainWindow imediatamente,
    // mas é bom avisar se ela não estiver disponível.
    console.warn("IPC Handlers: mainWindow não está definida na inicialização.");
  }
  if (!settingsManager) {
    console.error("IPC Handlers: settingsManager não fornecido.");
    return;
  }

  // Recarregar uma aba específica (lógica do lado do renderer)
  ipcMain.on("reload-tab", (event, tabId) => {
    const win = require("./windowManager").getMainWindow();
    if (win) {
      win.webContents.send("reload-tab", tabId);
    } else {
      console.warn("IPC reload-tab: Janela principal não encontrada.");
    }
  });

  // Sair da aplicação
  ipcMain.on("exit-app", () => {
    const appLifecycle = require("./appLifecycle");
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
    // Notificar outros módulos se necessário (ex: appLifecycle para lógica de fechar)
  });

  // Fechar a aplicação (alternativa a 'exit-app')
  ipcMain.on("app:close", () => {
    const appLifecycle = require("./appLifecycle");
    appLifecycle.setIsQuiting(true);
    app.quit();
  });

  // --- Correção do Handler get-app-version ---
  // Remove o handler antigo se existir para evitar duplicação
  ipcMain.removeHandler("get-app-version");
  // Registra o novo handler usando app.getVersion()
  ipcMain.handle("get-app-version", () => {
    try {
      // A forma padrão e mais segura no Electron
      const version = app.getVersion();
      console.log(`IPC get-app-version: Retornando versão ${version}`);
      return version;
    } catch (error) {
      console.error("Erro ao obter versão da aplicação via app.getVersion():", error);
      return "N/A"; // Retorna um valor padrão em caso de erro
    }
  });
  // --- Fim da Correção ---

  // Handler para carregar configurações
  ipcMain.removeHandler("get-settings");
  ipcMain.handle("get-settings", () => {
    return settingsManager.loadSettings();
  });

  // Handler para salvar configurações
  ipcMain.removeHandler("save-settings");
  ipcMain.handle("save-settings", (event, settings) => {
    settingsManager.saveSettings(settings);
    // Pode retornar sucesso ou falha
    return true;
  });

  ipcMain.on("clear-app-cache", async () => {
    try {
      const win = require("./windowManager").getMainWindow();
      if (win) {
        const ses = win.webContents.session;
        await ses.clearCache();
        await ses.clearStorageData({
          storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
        });
        console.log("[IPC Handler] Cache e dados de armazenamento limpos.");
        // Recarrega a aplicação para refletir a limpeza
        win.reload();
      }
    } catch (error) {
      console.error("Erro ao limpar o cache:", error);
    }
  });

  console.log("Manipuladores IPC inicializados.");
}

module.exports = {
  initializeIpcHandlers
};
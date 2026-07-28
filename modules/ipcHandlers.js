// modules/ipcHandlers.js
const { ipcMain, shell, Menu, MenuItem } = require("electron");
const Channels = require("./ipc-channels");

const GITHUB_URL = "https://github.com/awilliansd";

// Recebe mainWindow, app, e settingsManager como dependências
function initializeIpcHandlers(mainWindow, app, settingsManager) {
  if (!app) {
    console.error("IPC Handlers: Instância do 'app' não fornecida.");
    return;
  }
  if (!mainWindow) {
    console.warn("IPC Handlers: mainWindow não está definida na inicialização.");
  }
  if (!settingsManager) {
    console.error("IPC Handlers: settingsManager não fornecido.");
    return;
  }

  // Recarregar uma aba específica (lógica do lado do renderer)
  ipcMain.on(Channels.RELOAD_TAB, (event, tabId) => {
    const win = require("./windowManager").getMainWindow();
    if (win) {
      win.webContents.send(Channels.RELOAD_TAB, tabId);
    } else {
      console.warn("IPC reload-tab: Janela principal não encontrada.");
    }
  });

  // Atualizar o título da janela com o nome da aba atual
  ipcMain.on(Channels.SET_WINDOW_TITLE, (event, tabName) => {
    const windowManager = require("./windowManager");
    windowManager.setWindowTitle(tabName);
  });

  // Sair da aplicação
  ipcMain.on(Channels.EXIT_APP, () => {
    const appLifecycle = require("./appLifecycle");
    appLifecycle.setIsQuiting(true);
    app.quit();
  });

  // Abrir link externo (GitHub)
  ipcMain.on(Channels.OPEN_GITHUB, () => {
    shell.openExternal(GITHUB_URL);
  });

  // Definir se minimiza para a bandeja
  ipcMain.on(Channels.SET_MINIMIZE_TO_TRAY, (event, value) => {
    const currentSettings = settingsManager.loadSettings();
    currentSettings.minimizeToTray = value;
    settingsManager.saveSettings(currentSettings);
  });

  // Definir se mantém as abas ativas (modo de alta performance)
  ipcMain.on(Channels.SET_KEEP_TABS_ACTIVE, (event, value) => {
    const currentSettings = settingsManager.loadSettings();
    currentSettings.keepTabsActive = value;
    settingsManager.saveSettings(currentSettings);
    console.log(`Configuração 'keepTabsActive' salva como: ${value}`);
  });

  // Definir o modo da aplicação (personal/developer)
  ipcMain.on(Channels.SET_APP_MODE, (event, value) => {
    const currentSettings = settingsManager.loadSettings();
    currentSettings.appMode = value;
    settingsManager.saveSettings(currentSettings);
    console.log(`Configuração 'appMode' salva como: ${value}`);
  });

  // Fechar a aplicação (alternativa a 'exit-app')
  ipcMain.on("app:close", () => {
    const appLifecycle = require("./appLifecycle");
    appLifecycle.setIsQuiting(true);
    app.quit();
  });

  // --- Handler get-app-version ---
  ipcMain.removeHandler(Channels.GET_APP_VERSION);
  ipcMain.handle(Channels.GET_APP_VERSION, () => {
    try {
      const version = app.getVersion();
      console.log(`IPC get-app-version: Retornando versão ${version}`);
      return version;
    } catch (error) {
      console.error("Erro ao obter versão da aplicação via app.getVersion():", error);
      return "N/A";
    }
  });

  // Handler para carregar configurações
  ipcMain.removeHandler(Channels.GET_SETTINGS);
  ipcMain.handle(Channels.GET_SETTINGS, () => {
    return settingsManager.loadSettings();
  });

  // Handler para salvar configurações (retorna sucesso/falha da persistência)
  ipcMain.removeHandler(Channels.SAVE_SETTINGS);
  ipcMain.handle(Channels.SAVE_SETTINGS, (event, settings) => {
    return settingsManager.saveSettings(settings);
  });

  // Menu de contexto nativo das abas da sidebar
  ipcMain.handle(Channels.SHOW_TAB_CONTEXT_MENU, (event, tabId, x, y) => {
    const windowManager = require("./windowManager");
    const win = windowManager.getMainWindow();
    if (!win) return;

    const menu = new Menu();
    menu.append(new MenuItem({
      label: "Recarregar",
      click: () => {
        win.webContents.send(Channels.RELOAD_TAB, tabId);
      },
    }));

    menu.popup({ window: win, x, y });
  });

  ipcMain.on(Channels.CLEAR_APP_CACHE, async () => {
    try {
      const win = require("./windowManager").getMainWindow();
      if (win) {
        const ses = win.webContents.session;
        await ses.clearCache();
        await ses.clearStorageData({
          storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
        });
        console.log("[IPC Handler] Cache e dados de armazenamento limpos.");
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
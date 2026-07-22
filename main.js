// main.js
const { app, session, ipcMain } = require("electron");
const log = require("electron-log");

// Importa os módulos
const windowManager = require("./modules/windowManager");
const trayManager = require("./modules/trayManager");
const ipcHandlers = require("./modules/ipcHandlers");
const settingsManager = require("./modules/settingsManager");
const appLifecycle = require("./modules/appLifecycle");
const updaterManager = require("./modules/updaterManager");
const webviewHost = require("./modules/webviewHost");
const Channels = require("./modules/ipc-channels");

// --- Implementação do Single Instance Lock ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log("Outra instância já está rodando. Fechando esta.");
  app.quit();
} else {
  app.on("second-instance", () => {
    console.log("Tentativa de abrir segunda instância detectada.");
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      windowManager.showWindow();
    }
  });

  // Inicializa o gerenciador de configurações
  settingsManager.initialize(app);
  const initialSettings = settingsManager.loadSettings();

  // Inicializa o ciclo de vida da aplicação
  let updaterApi = { checkForUpdates: async () => {} };
  const createWindowWithOptions = (settings) =>
    windowManager.createWindow(app, settings, {
      checkForUpdates: (userInitiated = false) => updaterApi.checkForUpdates(userInitiated)
    });
  appLifecycle.initializeAppLifecycle(app, createWindowWithOptions, settingsManager);

  app.whenReady().then(() => {
    // Flags de linha de comando essenciais
    app.commandLine.appendSwitch('lang', 'pt-BR');
    // Impede o flag "navigator.webdriver" de ser definido nas pages (real fix
    // para detecção de automação, substituindo o preload contextIsolated).
    app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

    // Intercepta e modifica o cabeçalho Accept-Language
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['Accept-Language'] = 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7';
      callback({ requestHeaders: details.requestHeaders });
    });

    // Cria a janela principal
    const mainWindow = createWindowWithOptions(initialSettings);

    // Inicializa o host de WebContentsView (E1)
    webviewHost.initializeHost(mainWindow);

    // Registra canais do host
    ipcMain.on(Channels.HOST_SHOW_TAB, (_e, payload) => webviewHost.showTab(payload));
    ipcMain.on(Channels.HOST_RELOAD_TAB, (_e, payload) => webviewHost.reloadTab(payload));
    ipcMain.on(Channels.HOST_RECREATE_TAB, (_e, payload) => webviewHost.recreateTab(payload));
    ipcMain.on(Channels.HOST_RESET_ALL, () => webviewHost.destroyAllTabs());
    ipcMain.on(Channels.HOST_SET_OVERLAY, (_e, active) => webviewHost.setOverlay(active));
    ipcMain.on(Channels.HOST_FIND_OPEN, (_e, payload) => webviewHost.findOpen(payload));
    ipcMain.on(Channels.HOST_FIND_INPUT, (_e, payload) => webviewHost.findInput(payload));
    ipcMain.on(Channels.HOST_FIND_NEXT, (_e, payload) => webviewHost.findNext(payload));
    ipcMain.on(Channels.HOST_FIND_CLOSE, (_e, payload) => webviewHost.findClose(payload));
    ipcMain.on(Channels.HOST_CLEAR_TAB_CACHE, (_e, payload) => webviewHost.clearTabCache(payload));

    // Adiciona o manipulador de evento 'close'
    mainWindow.on("close", (event) => {
      const currentSettings = settingsManager.loadSettings();
      if (!appLifecycle.getIsQuiting() && currentSettings.minimizeToTray) {
        event.preventDefault();
        windowManager.hideWindow();
      }
    });

    // Cria o ícone da bandeja
    trayManager.createTray(app, mainWindow, settingsManager);

    // Inicializa os manipuladores IPC
    ipcHandlers.initializeIpcHandlers(mainWindow, app, settingsManager);

    // Inicializa o auto-update (somente app empacotado)
    updaterApi = updaterManager.initializeAutoUpdater(app, () => windowManager.getMainWindow());
  });

  app.on("activate", () => {
    if (windowManager.getMainWindow() === null) {
      createWindowWithOptions(settingsManager.loadSettings());
    }
  });
}
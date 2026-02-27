// main.js
const { app, session, Menu, MenuItem, ipcMain } = require("electron");
const path = require("path");

// Importa os módulos
const windowManager = require("./modules/windowManager");
const trayManager = require("./modules/trayManager");
const ipcHandlers = require("./modules/ipcHandlers");
const settingsManager = require("./modules/settingsManager");
const appLifecycle = require("./modules/appLifecycle");
const configuredWebviewSessions = new WeakSet();

// --- Implementação do Single Instance Lock ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log("Outra instância já está rodando. Fechando esta.");
  app.quit();
} else {
  app.on("second-instance", (_event, _commandLine, _workingDirectory) => {
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
  const createWindowWithOptions = (settings) => windowManager.createWindow(app, settings);
  appLifecycle.initializeAppLifecycle(app, createWindowWithOptions, settingsManager);
  const deepseekUserAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;

  // Handler IPC para obter o User-Agent do Grok
  ipcMain.handle('get-grok-user-agent', () => {
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
  });

  // Handler IPC para mostrar o menu de contexto da webview
  ipcMain.handle('show-webview-context-menu', (_event, params) => {
    const menu = new Menu();
    if (params.misspelledWord) {
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(new MenuItem({
          label: suggestion,
          click: () => _event.sender.replaceMisspelling(suggestion)
        }));
      }
      if (params.dictionarySuggestions.length > 0) {
        menu.append(new MenuItem({ type: 'separator' }));
      }
      menu.append(new MenuItem({
        label: 'Adicionar ao dicionário',
        click: () => _event.sender.session.addWordToSpellCheckerDictionary(params.misspelledWord)
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }
    if (params.isEditable) {
      if (params.selectionText) {
        menu.append(new MenuItem({ role: 'cut', label: 'Recortar' }));
        menu.append(new MenuItem({ role: 'copy', label: 'Copiar' }));
      }
      menu.append(new MenuItem({ role: 'paste', label: 'Colar' }));
      menu.append(new MenuItem({ type: 'separator' }));
    }
    if (params.selectionText) {
      menu.append(new MenuItem({ role: 'copy', label: 'Copiar' }));
      menu.append(new MenuItem({ type: 'separator' }));
    }
    menu.append(new MenuItem({ role: 'selectAll', label: 'Selecionar tudo' }));
    menu.popup();
  });

  app.whenReady().then(() => {
    // Flags de linha de comando essenciais
    app.commandLine.appendSwitch('lang', 'pt-BR');

    // Intercepta e modifica o cabeçalho Accept-Language
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['Accept-Language'] = 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7';
      callback({ requestHeaders: details.requestHeaders });
    });

    // Cria a janela principal
    const mainWindow = windowManager.createWindow(app, initialSettings);

    // Configuração de segurança para WebContents
    app.on('web-contents-created', (event, contents) => {
      if (contents.getType() === 'webview') {
        contents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
          callback(true); // Permitir permissões para WebViews
        });
        if (!configuredWebviewSessions.has(contents.session)) {
          contents.session.webRequest.onBeforeSendHeaders({ urls: ['*://*.deepseek.com/*'] }, (details, callback) => {
            const requestHeaders = details.requestHeaders;
            requestHeaders['User-Agent'] = deepseekUserAgent;
            callback({ requestHeaders });
          });
          configuredWebviewSessions.add(contents.session);
        }
      }
    });

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
  });

  app.on("activate", () => {
    if (windowManager.getMainWindow() === null) {
      windowManager.createWindow(app, settingsManager.loadSettings());
    }
  });
}

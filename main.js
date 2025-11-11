// main.js (Refatorado, Corrigido e com User-Agent Dinâmico)
const { app, session, Menu, MenuItem } = require("electron");
const path = require("path");

// Importa os módulos
const windowManager = require("./modules/windowManager");
const trayManager = require("./modules/trayManager");
const ipcHandlers = require("./modules/ipcHandlers");
const settingsManager = require("./modules/settingsManager");
const appLifecycle = require("./modules/appLifecycle");

// --- Implementação do Single Instance Lock ---
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log("Outra instância já está rodando. Fechando esta.");
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
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

  // --- INÍCIO DA NOVA ABORDAGEM: USER-AGENT DINÂMICO ---
  // Obtém a versão do Chromium que o Electron está usando.
  const chromeVersion = process.versions.chrome;
  // Cria um template de User-Agent moderno (baseado no Windows 11)
  const userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
  
  // Define o User-Agent globalmente para a aplicação.
  // Isso é mais eficaz e limpo do que interceptar cada requisição.
  app.userAgentFallback = userAgent;
  console.log(`[Main Process] User-Agent definido como: ${userAgent}`);
  // --- FIM DA NOVA ABORDAGEM ---

  app.whenReady().then(() => {
    // 1. Configura as flags de linha de comando para idioma
    app.commandLine.appendSwitch('lang', 'pt-BR');
    app.commandLine.appendSwitch('accept-lang', 'pt-BR');

    // 2. Intercepta e modifica o cabeçalho Accept-Language
    // Não precisamos mais modificar o User-Agent aqui, pois o app.userAgentFallback já cuida disso.
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['Accept-Language'] = 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7';
      callback({ requestHeaders: details.requestHeaders });
    });

    // Cria a janela principal
    const mainWindow = windowManager.createWindow(app, initialSettings);

    // Configurar webviews quando forem anexadas
    mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
      console.log("[Main Process] Webview attached, configuring spellcheck and context menu");
      
      // Habilitar verificação ortográfica
      webContents.session.setSpellCheckerLanguages(['pt-BR']);
      webContents.session.setSpellCheckerEnabled(true);
      
      // Configurar menu de contexto para webviews
      webContents.on('context-menu', (event, params) => {
        const menu = new Menu();
        
        if (params.misspelledWord) {
          for (const suggestion of params.dictionarySuggestions) {
            menu.append(new MenuItem({
              label: suggestion,
              click: () => webContents.replaceMisspelling(suggestion)
            }));
          }
          if (params.dictionarySuggestions.length > 0) {
            menu.append(new MenuItem({ type: 'separator' }));
          }
          menu.append(new MenuItem({
            label: 'Adicionar ao dicionário',
            click: () => webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
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
    });

    // Adiciona o manipulador de evento 'close'
    mainWindow.on("close", (event) => {
      const currentSettings = settingsManager.loadSettings();
      if (!appLifecycle.getIsQuiting() && currentSettings.minimizeToTray) {
        event.preventDefault();
        windowManager.hideWindow();
        console.log("Janela minimizada para a bandeja.");
      } else {
        console.log("Fechando a janela principal.");
      }
    });

    // Cria o ícone da bandeja
    trayManager.createTray(app, mainWindow, settingsManager);

    // Inicializa os manipuladores IPC
    ipcHandlers.initializeIpcHandlers(mainWindow, app, settingsManager);

    console.log("Aplicação (instância única) iniciada e módulos carregados.");
  });

  // Tratamento para evento 'activate' (macOS)
  app.on("activate", () => {
    if (windowManager.getMainWindow() === null) {
      windowManager.createWindow(app, settingsManager.loadSettings());
    }
  });

} // Fecha o else do gotTheLock
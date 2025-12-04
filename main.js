// main.js (Refatorado - User-Agent apenas para Grok)
const { app, session, Menu, MenuItem, ipcMain } = require("electron");
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

  // --- USER-AGENT PERSONALIZADO APENAS PARA GROK ---
  // User-Agent personalizado para Grok
  const grokUserAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
  console.log(`[Main Process] User-Agent do Grok preparado: ${grokUserAgent}`);
  // NÃO definimos app.userAgentFallback globalmente

  // Handler IPC para obter o User-Agent do Grok
  ipcMain.handle('get-grok-user-agent', () => {
    return grokUserAgent;
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
    // 1. Configura as flags de linha de comando para idioma
    app.commandLine.appendSwitch('lang', 'pt-BR');
    app.commandLine.appendSwitch('accept-lang', 'pt-BR');

    // 2. Intercepta e modifica o cabeçalho Accept-Language
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders['Accept-Language'] = 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7';
      callback({ requestHeaders: details.requestHeaders });
    });

    // Cria a janela principal
    const mainWindow = windowManager.createWindow(app, initialSettings);

    function configureWebviewSecurity(webContents) {
      const url = webContents.getURL();

      // Para serviços que bloqueiam ambientes não-oficiais
      if (url.includes('deepseek.com') || url.includes('google.com') || url.includes('gemini.google.com')) {
        console.log(`[Main Process] Configurando políticas de segurança para: ${url}`);

        // Conceder todas as permissões
        webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
          console.log(`[Main Process] Permissão concedida para ${permission}`);
          callback(true);
        });

        // Adicionar headers que fazem parecer um navegador normal
        webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
          const newHeaders = {
            ...details.requestHeaders,
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-User': '?1',
            'Sec-Fetch-Dest': 'document',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
          };
          callback({ requestHeaders: newHeaders });
        });

        // Ignorar erros de certificado (apenas para desenvolvimento)
        webContents.session.setCertificateVerifyProc((_request, callback) => {
          callback(0); // Sempre valida certificados
        });
      }
    }

    // NOTA: O listener 'did-attach-webview' foi removido, pois as webviews são criadas e destruídas
    // dinamicamente no processo de renderização para otimização de memória.
    // As configurações de segurança e contexto de menu devem ser aplicadas
    // diretamente na webview no processo de renderização, se necessário,
    // ou o código deve ser adaptado para usar o webContents da janela principal
    // para configurações globais.

    // Mantendo a função configureWebviewSecurity, caso seja útil para a janela principal
    // ou se for necessário reintroduzir a lógica de webview.
    // Por enquanto, o código de segurança e menu de contexto específico de webview
    // foi removido do processo principal.

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
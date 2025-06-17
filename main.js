// main.js (Refatorado, Corrigido e com Single Instance Lock)
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
  // Se não conseguiu a trava, significa que outra instância já está rodando.
  // Fecha esta instância imediatamente.
  console.log("Outra instância já está rodando. Fechando esta.");
  app.quit();
} else {
  // Esta é a primeira instância ou a única instância.
  // Configura o listener para o evento 'second-instance'.
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Alguém tentou rodar uma segunda instância. Foca a janela da nossa instância.
    console.log("Tentativa de abrir segunda instância detectada.");
    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      // Se a janela estiver minimizada ou escondida, restaura e foca.
      windowManager.showWindow(); // Usa a função do windowManager que já lida com isso
    }
  });

  // Continua com a inicialização normal da aplicação...

  // Inicializa o gerenciador de configurações, passando 'app'
  settingsManager.initialize(app);
  const initialSettings = settingsManager.loadSettings();

  // Inicializa o ciclo de vida da aplicação
  const createWindowWithOptions = (settings) => windowManager.createWindow(app, settings);
  appLifecycle.initializeAppLifecycle(app, createWindowWithOptions, settingsManager);

  app.whenReady().then(() => {
    // 1. Configura as flags de linha de comando para idioma
    // Isso influencia como o Chromium se comporta em relação ao idioma
    app.commandLine.appendSwitch('lang', 'pt-BR');
    app.commandLine.appendSwitch('accept-lang', 'pt-BR');

    // 2. Intercepta e modifica o cabeçalho Accept-Language para todas as requisições
    // Isso garante que o navegador envie explicitamente a preferência por português do Brasil
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      // Define o cabeçalho Accept-Language
      // pt-BR: Português do Brasil (alta prioridade)
      // pt: Português genérico (prioridade média)
      // en-US: Inglês dos EUA (baixa prioridade)
      // en: Inglês genérico (ainda mais baixa prioridade)
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
        
        // Adicionar opções de correção ortográfica se houver sugestões
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
        
        // Adicionar opções padrão de edição
        if (params.isEditable) {
          if (params.selectionText) {
            menu.append(new MenuItem({
              label: 'Recortar',
              role: 'cut'
            }));
            menu.append(new MenuItem({
              label: 'Copiar',
              role: 'copy'
            }));
          }
          
          menu.append(new MenuItem({
            label: 'Colar',
            role: 'paste'
          }));
          
          menu.append(new MenuItem({ type: 'separator' }));
        }
        
        // Opções para texto selecionado
        if (params.selectionText) {
          menu.append(new MenuItem({
            label: 'Copiar',
            role: 'copy'
          }));
          menu.append(new MenuItem({ type: 'separator' }));
        }
        
        // Opções gerais
        menu.append(new MenuItem({
          label: 'Selecionar tudo',
          role: 'selectAll'
        }));
        
        // Mostrar o menu de contexto
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
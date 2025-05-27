// main.js (Refatorado, Corrigido e com Single Instance Lock)
const { app } = require("electron");
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
    // Cria a janela principal
    const mainWindow = windowManager.createWindow(app, initialSettings);

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
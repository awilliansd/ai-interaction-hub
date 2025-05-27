// main.js (Refatorado e Corrigido)
const { app } = require("electron");
const path = require("path");

// Importa os módulos
const windowManager = require("./modules/windowManager");
const trayManager = require("./modules/trayManager");
const ipcHandlers = require("./modules/ipcHandlers");
const settingsManager = require("./modules/settingsManager");
const appLifecycle = require("./modules/appLifecycle");

// Inicializa o gerenciador de configurações, passando 'app'
settingsManager.initialize(app);
const initialSettings = settingsManager.loadSettings();

// Inicializa o ciclo de vida da aplicação, passando 'app', a função de criar janela e o settingsManager
// Note que createWindow agora precisa de 'app', então passamos uma função que inclui 'app'
const createWindowWithOptions = (settings) => windowManager.createWindow(app, settings);
appLifecycle.initializeAppLifecycle(app, createWindowWithOptions, settingsManager);

app.whenReady().then(() => {
  // Cria a janela principal, passando 'app' e as configurações iniciais
  const mainWindow = windowManager.createWindow(app, initialSettings);

  // Adiciona o manipulador de evento 'close' aqui para ter acesso a appLifecycle
  mainWindow.on("close", (event) => {
    const currentSettings = settingsManager.loadSettings();
    if (!appLifecycle.getIsQuiting() && currentSettings.minimizeToTray) {
      event.preventDefault(); // Previne o fechamento real
      windowManager.hideWindow(); // Apenas esconde a janela
      console.log("Janela minimizada para a bandeja.");
    } else {
      // Se estiver saindo ou não for minimizar, permite fechar (o appLifecycle cuidará do quit)
      console.log("Fechando a janela principal.");
    }
  });


  // Cria o ícone da bandeja, passando 'app', a janela principal e o settingsManager
  trayManager.createTray(app, mainWindow, settingsManager);

  // Inicializa os manipuladores IPC, passando dependências necessárias ('app' incluído)
  ipcHandlers.initializeIpcHandlers(mainWindow, app, settingsManager);

  console.log("Aplicação iniciada e módulos carregados.");
});

// Tratamento para evento 'activate' (macOS)
app.on("activate", () => {
  // Recria a janela se não houver nenhuma aberta
  if (windowManager.getMainWindow() === null) {
    // Passa 'app' ao recriar a janela
    windowManager.createWindow(app, settingsManager.loadSettings());
  }
});
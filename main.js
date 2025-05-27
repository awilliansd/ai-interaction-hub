// main.js (Refatorado)
const { app } = require("electron");
const path = require("path");

// Importa os módulos
const windowManager = require("./modules/windowManager");
const trayManager = require("./modules/trayManager");
const ipcHandlers = require("./modules/ipcHandlers");
const settingsManager = require("./modules/settingsManager");
const appLifecycle = require("./modules/appLifecycle");

// Inicializa o gerenciador de configurações
settingsManager.initialize(app);
const initialSettings = settingsManager.loadSettings();

// Inicializa o ciclo de vida da aplicação
appLifecycle.initializeAppLifecycle(app, windowManager.createWindow, settingsManager);

app.whenReady().then(() => {
  // Cria a janela principal, passando as configurações iniciais
  const mainWindow = windowManager.createWindow(initialSettings);

  // Cria o ícone da bandeja, passando a janela principal
  trayManager.createTray(mainWindow);

  // Inicializa os manipuladores IPC, passando dependências necessárias
  ipcHandlers.initializeIpcHandlers(mainWindow, app, settingsManager);

  console.log("Aplicação iniciada e módulos carregados.");
});

// Tratamento para evento 'activate' (macOS)
app.on("activate", () => {
  // Recria a janela se não houver nenhuma aberta
  if (windowManager.getMainWindow() === null) {
    windowManager.createWindow(settingsManager.loadSettings());
  }
});
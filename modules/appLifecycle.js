// modules/appLifecycle.js
const { app } = require("electron");

let isQuiting = false;
let createWindowFunction = null;
let settingsManagerInstance = null;

// Função para inicializar o módulo com dependências
function initializeAppLifecycle(appInstance, createWinFunc, settingsMgr) {
  if (!appInstance || !createWinFunc || !settingsMgr) {
    throw new Error("AppLifecycle: Dependências (app, createWindow, settingsManager) são necessárias.");
  }
  createWindowFunction = createWinFunc;
  settingsManagerInstance = settingsMgr;

  // Lógica para fechar a aplicação quando todas as janelas são fechadas
  // (exceto no macOS)
  appInstance.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      appInstance.quit();
    }
  });

  // Lógica executada antes de o aplicativo começar a fechar as janelas
  appInstance.on("before-quit", () => {
    isQuiting = true;
    console.log("Sinalizador isQuiting definido como true antes de sair.");
  });

  console.log("Ciclo de vida da aplicação inicializado.");
}

function setIsQuiting(value) {
  isQuiting = !!value; // Garante que seja booleano
}

function getIsQuiting() {
  return isQuiting;
}

module.exports = {
  initializeAppLifecycle,
  setIsQuiting,
  getIsQuiting
};
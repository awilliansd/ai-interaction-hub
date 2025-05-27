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

  // Lógica para lidar com o evento 'close' da janela principal
  // Isso pode ser acoplado ao windowManager, mas centralizar aqui pode ser mais claro
  // para a lógica de sair vs minimizar.
  // Precisamos garantir que a mainWindow seja acessível ou que o windowManager
  // chame uma função deste módulo.

  // Exemplo: Se o windowManager emitir um evento ou chamar uma função:
  // eventEmitter.on('main-window-close-request', (event) => {
  //   const settings = settingsManagerInstance.loadSettings();
  //   if (!isQuiting && settings.minimizeToTray) {
  //     event.preventDefault(); // Previne o fechamento
  //     // A ação de esconder a janela (mainWindow.hide()) deve ser feita pelo windowManager
  //     console.log("Prevenindo fechamento da janela, minimizando para a bandeja.");
  //   } else {
  //     console.log("Permitindo fechamento da janela.");
  //     // Não previne o fechamento, o app eventualmente sairá
  //   }
  // });

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
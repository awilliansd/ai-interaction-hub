// modules/windowManager.js
const { BrowserWindow, Menu } = require("electron");
const path = require("path");

let mainWindow = null;

// Função auxiliar para enviar comando para o renderer
function sendCommandToRenderer(command) {
  if (mainWindow && mainWindow.webContents) {
    // Log explícito no processo principal para confirmar o envio
    console.log(`[Main Process] Attempting to send command: ${command}`);
    mainWindow.webContents.send(command);
  } else {
    console.error(`[Main Process] Cannot send command: ${command}. MainWindow or WebContents not available.`);
  }
}

// Recebe 'app' como parâmetro
function createWindow(app, settings) {
  if (!app) {
    throw new Error("WindowManager: Instância do 'app' do Electron é necessária.");
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(app.getAppPath(), "assets/js/preload.js"),
      webviewTag: true,
      spellcheck: true // Habilita verificação ortográfica globalmente
    },
    icon: path.join(app.getAppPath(), "icons", "app.png")
  });

  mainWindow.loadFile(path.join(app.getAppPath(), "index.html"));

  // Reativar DevTools para diagnóstico (comentar após testes)
  // console.log("[Main Process] Opening DevTools automatically for diagnostics.");
  // mainWindow.webContents.openDevTools();

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("[Main Process] Window finished loading. Sending initial settings.");
    const currentSettings = require("./settingsManager").loadSettings();
    mainWindow.webContents.send("init-settings", currentSettings);
  });

  // --- Criação do Menu com Aceleradores ---
  const menuTemplate = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Configurações',
          click: () => {
            console.log("[Main Process] Menu: Configurações clicked");
            sendCommandToRenderer('command:show-settings');
          }
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: 'Alt+F4',
          click: () => {
            console.log("[Main Process] Menu: Sair clicked");
            sendCommandToRenderer('command:exit-app');
          }
        }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Desfazer' },
        { role: 'redo', label: 'Refazer' },
        { type: 'separator' },
        { role: 'cut', label: 'Recortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Colar' },
        { role: 'selectAll', label: 'Selecionar Tudo' },
        { type: 'separator' },
        { role: 'toggleSpellChecker', label: 'Verificação Ortográfica' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        {
          label: 'Recarregar Aba Ativa',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            console.log("[Main Process] Accelerator CmdOrCtrl+R triggered.");
            sendCommandToRenderer('command:reload-active-tab');
          }
        },
        {
          label: 'Buscar na Aba Ativa',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            console.log("[Main Process] Accelerator CmdOrCtrl+F triggered.");
            sendCommandToRenderer('command:find-in-active-tab');
          }
        },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Alternar Ferramentas de Desenvolvedor' }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre',
          click: () => {
            console.log("[Main Process] Menu: Sobre clicked");
            sendCommandToRenderer('command:show-about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
  console.log("[Main Process] Application menu set.");

  // Configurar o menu para estar sempre visível
  mainWindow.setMenuBarVisibility(true);
  mainWindow.setAutoHideMenuBar(false);
  console.log("[Main Process] Menu bar set to always visible.");

  mainWindow.on("closed", () => {
    console.log("[Main Process] Main window closed.");
    mainWindow = null;
  });

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

function showWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  }
}

function hideWindow() {
  if (mainWindow) {
    mainWindow.hide();
  }
}

module.exports = {
  createWindow,
  getMainWindow,
  showWindow,
  hideWindow
};
// modules/trayManager.js
const { Tray, Menu } = require("electron");
const { resolveTrayIconPath } = require("./iconResolver");

let tray = null;

// Recebe 'app' como parâmetro (mainWindow/settingsManager mantidos por compatibilidade de API)
function createTray(app, mainWindow) {
  if (!app) {
    throw new Error("TrayManager: Instância do 'app' do Electron é necessária.");
  }

  if (!mainWindow) {
    console.warn("TrayManager: mainWindow não fornecida na criação da bandeja.");
  }

  const iconPath = resolveTrayIconPath(app);
  if (!iconPath) {
    console.error("Erro ao criar Tray: nenhum ícone encontrado nos caminhos esperados.");
    return null; // Não foi possível criar a bandeja
  }

  try {
    tray = new Tray(iconPath);
  } catch (error) {
    console.error(`Erro ao criar Tray com ícone em ${iconPath}:`, error);
    return null; // Não foi possível criar a bandeja
  }

  tray.setToolTip("AI Interaction Hub");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Mostrar",
      click: () => {
        // Usa o windowManager para mostrar a janela
        const windowManager = require("./windowManager");
        windowManager.showWindow();
      }
    },
    {
      label: "Sair",
      click: () => {
        // Sinaliza que o usuário quer sair explicitamente
        const appLifecycle = require("./appLifecycle");
        appLifecycle.setIsQuiting(true);
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    // Ao clicar no ícone, mostra a janela
    const windowManager = require("./windowManager");
    windowManager.showWindow();
    // O envio de 'init-settings' deve ocorrer quando a janela é mostrada ou criada,
    // tratado pelo windowManager ou IPC.
  });

  console.log("Ícone da bandeja criado.");
  return tray;
}

module.exports = {
  createTray
};

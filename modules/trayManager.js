// modules/trayManager.js
const { Tray, Menu } = require("electron");
const path = require("path");

let tray = null;

function createTray(mainWindow, app, settingsManager) {
  // Ajuste o caminho do ícone para refletir a nova estrutura
  const iconPath = path.join(app.getAppPath(), "icons", "app.png");
  tray = new Tray(iconPath);

  tray.setToolTip("AI Interaction Hub");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Mostrar",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      }
    },
    {
      label: "Sair",
      click: () => {
        // Sinaliza que o usuário quer sair explicitamente
        const appLifecycle = require("./appLifecycle"); // Importa dinamicamente ou passa como dependência
        appLifecycle.setIsQuiting(true);
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    // Ao clicar no ícone, mostra a janela e atualiza as configurações (se necessário)
    if (mainWindow) {
      mainWindow.show();
      // O envio de 'init-settings' pode ser centralizado ou ocorrer em outro ponto
      // mainWindow.webContents.send('init-settings', settingsManager.loadSettings());
    }
  });

  return tray;
}

module.exports = {
  createTray
};
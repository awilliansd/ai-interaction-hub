// modules/trayManager.js
const { Tray, Menu } = require("electron");
const path = require("path");

let tray = null;

// Recebe 'app' como parâmetro
function createTray(app, mainWindow, settingsManager) {
  if (!app) {
    throw new Error("TrayManager: Instância do 'app' do Electron é necessária.");
  }
  if (!mainWindow) {
      console.warn("TrayManager: mainWindow não fornecida na criação da bandeja.");
      // Pode continuar sem mainWindow se a bandeja não precisar interagir diretamente com ela inicialmente
  }

    // Escolhe o ícone correto dependendo se a app está empacotada
    let iconPath;
    if (app.isPackaged) {
    // Quando empacotado, os ícones gerados devem estar em process.resourcesPath/icons/hicolor/.../apps
    iconPath = path.join(process.resourcesPath, "icons", "hicolor", "512x512", "apps", "aiinteractionhub.png");
    } else {
    // Em desenvolvimento, usa o ícone local
    iconPath = path.join(app.getAppPath(), "icons", "app.png");
    }

    try {
      tray = new Tray(iconPath);
    } catch (error) {
      console.error(`Erro ao criar Tray com ícone em ${iconPath}:`, error);
      // Tenta criar com um ícone de fallback relativo ao código
      try {
        tray = new Tray(path.join(__dirname, "..", "icons", "default_icon.png"));
      } catch (fallbackError) {
        console.error("Erro ao criar Tray com ícone de fallback:", fallbackError);
        return null; // Não foi possível criar a bandeja
      }
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
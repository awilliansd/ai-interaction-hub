// modules/trayManager.js
const { Tray, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

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
  // Windows Tray funciona melhor com .ico (suporta transparência sem fundo)
  const isWindows = process.platform === "win32";
  const iconCandidates = [];

  if (app.isPackaged) {
    if (isWindows) {
      iconCandidates.push(path.join(process.resourcesPath, "icons", "app.ico"));
    } else {
      iconCandidates.push(
        path.join(process.resourcesPath, "icons", "hicolor", "512x512", "apps", "aiinteractionhub.png")
      );
    }
  } else {
    if (isWindows) {
      iconCandidates.push(path.join(app.getAppPath(), "icons", "app.ico"));
    } else {
      iconCandidates.push(path.join(app.getAppPath(), "icons", "app.png"));
    }
  }

  // Fallbacks conhecidos no projeto
  iconCandidates.push(
    path.join(app.getAppPath(), "icons", "app.ico"),
    path.join(app.getAppPath(), "icons", "app.png"),
    path.join(app.getAppPath(), "icons", "aiinteractionhub.png")
  );

  const iconPath = iconCandidates.find((candidate) => fs.existsSync(candidate));
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

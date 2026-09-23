// modules/ipcHandlers.js
const { ipcMain, shell, Menu, MenuItem, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const Channels = require("./ipc-channels");

const GITHUB_URL = "https://github.com/awilliansd";

// Recebe mainWindow, app, e settingsManager como dependências
function initializeIpcHandlers(mainWindow, app, settingsManager) {
  if (!app) {
    console.error("IPC Handlers: Instância do 'app' não fornecida.");
    return;
  }
  if (!mainWindow) {
    console.warn("IPC Handlers: mainWindow não está definida na inicialização.");
  }
  if (!settingsManager) {
    console.error("IPC Handlers: settingsManager não fornecido.");
    return;
  }

  // Atualizar o título da janela com o nome da aba atual
  ipcMain.on(Channels.SET_WINDOW_TITLE, (event, tabName) => {
    const windowManager = require("./windowManager");
    windowManager.setWindowTitle(tabName);
  });

  // Sair da aplicação
  ipcMain.on(Channels.EXIT_APP, () => {
    const appLifecycle = require("./appLifecycle");
    appLifecycle.setIsQuiting(true);
    app.quit();
  });

  // Abrir link externo (GitHub)
  ipcMain.on(Channels.OPEN_GITHUB, () => {
    shell.openExternal(GITHUB_URL);
  });

  // Definir se minimiza para a bandeja
  ipcMain.on(Channels.SET_MINIMIZE_TO_TRAY, (event, value) => {
    const currentSettings = settingsManager.loadSettings();
    currentSettings.minimizeToTray = value;
    settingsManager.saveSettings(currentSettings);
  });

  // Definir se mantém as abas ativas (modo de alta performance)
  ipcMain.on(Channels.SET_KEEP_TABS_ACTIVE, (event, value) => {
    const currentSettings = settingsManager.loadSettings();
    currentSettings.keepTabsActive = value;
    settingsManager.saveSettings(currentSettings);
    const webviewHost = require("./webviewHost");
    webviewHost.setKeepTabsActive(value);
    console.log(`Configuração 'keepTabsActive' salva como: ${value}`);
  });

  // Definir o modo da aplicação (personal/developer)
  ipcMain.on(Channels.SET_APP_MODE, (event, value) => {
    const currentSettings = settingsManager.loadSettings();
    currentSettings.appMode = value;
    settingsManager.saveSettings(currentSettings);
    console.log(`Configuração 'appMode' salva como: ${value}`);
  });

  // --- Handler get-app-version ---
  ipcMain.removeHandler(Channels.GET_APP_VERSION);
  ipcMain.handle(Channels.GET_APP_VERSION, () => {
    try {
      const version = app.getVersion();
      console.log(`IPC get-app-version: Retornando versão ${version}`);
      return version;
    } catch (error) {
      console.error("Erro ao obter versão da aplicação via app.getVersion():", error);
      return "N/A";
    }
  });

  // Handler para carregar configurações
  ipcMain.removeHandler(Channels.GET_SETTINGS);
  ipcMain.handle(Channels.GET_SETTINGS, () => {
    return settingsManager.loadSettings();
  });

  // Handler para salvar configurações (retorna sucesso/falha da persistência)
  ipcMain.removeHandler(Channels.SAVE_SETTINGS);
  ipcMain.handle(Channels.SAVE_SETTINGS, (event, settings) => {
    return settingsManager.saveSettings(settings);
  });

  // Menu de contexto nativo das abas da sidebar
  ipcMain.handle(Channels.SHOW_TAB_CONTEXT_MENU, (event, tabId, x, y, kind) => {
    const windowManager = require("./windowManager");
    const win = windowManager.getMainWindow();
    if (!win) return;

    const send = (channel, ...args) => win.webContents.send(channel, ...args);
    const menu = new Menu();
    menu.append(new MenuItem({
      label: "Recarregar",
      click: () => {
        const webviewHost = require("./webviewHost");
        webviewHost.reloadTab({ id: tabId });
      },
    }));

    if (kind === "base") {
      menu.append(new MenuItem({ type: "separator" }));
      menu.append(new MenuItem({
        label: "Adicionar conta…",
        click: () => send(Channels.CMD_ADD_ACCOUNT, tabId),
      }));
    } else if (kind === "custom") {
      menu.append(new MenuItem({ type: "separator" }));
      menu.append(new MenuItem({
        label: "Editar aba…",
        click: () => send(Channels.CMD_EDIT_CUSTOM_TAB, tabId),
      }));
      menu.append(new MenuItem({
        label: "Remover aba",
        click: () => send(Channels.CMD_REMOVE_CUSTOM_TAB, tabId),
      }));
    } else if (kind === "account") {
      menu.append(new MenuItem({ type: "separator" }));
      menu.append(new MenuItem({
        label: "Renomear conta…",
        click: () => send(Channels.CMD_RENAME_ACCOUNT, tabId),
      }));
      menu.append(new MenuItem({
        label: "Remover conta…",
        click: () => send(Channels.CMD_REMOVE_ACCOUNT, tabId),
      }));
    }

    menu.popup({ window: win, x, y });
  });

  // Seletor de imagem de ícone para abas customizadas (devolve data URL)
  ipcMain.removeHandler(Channels.PICK_TAB_ICON);
  ipcMain.handle(Channels.PICK_TAB_ICON, async () => {
    const win = require("./windowManager").getMainWindow();
    const result = await dialog.showOpenDialog(win || undefined, {
      title: "Escolher ícone da aba",
      properties: ["openFile"],
      filters: [{ name: "Imagens", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico"] }],
    });
    if (result.canceled || !result.filePaths?.[0]) return null;
    try {
      const filePath = result.filePaths[0];
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).slice(1).toLowerCase() || "png";
      const mime = ext === "jpg" ? "jpeg" : ext;
      return `data:image/${mime};base64,${data.toString("base64")}`;
    } catch (error) {
      console.error("Erro ao ler ícone:", error);
      return null;
    }
  });

  // Limpa a partição de uma conta removida (só após confirmação do renderer)
  ipcMain.on(Channels.CLEAR_PARTITION, async (_event, partition) => {
    if (typeof partition !== "string" || !partition) return;
    try {
      const { session } = require("electron");
      const ses = session.fromPartition(partition);
      await ses.clearCache();
      await ses.clearStorageData({
        storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
      });
      console.log(`[IPC Handler] Partição '${partition}' limpa.`);
    } catch (error) {
      console.error("Erro ao limpar partição:", error);
    }
  });

  ipcMain.on(Channels.CLEAR_APP_CACHE, async (_event, partitions) => {
    try {
      const webviewHost = require("./webviewHost");
      const win = require("./windowManager").getMainWindow();
      if (win) {
        // Sessão padrão (sidebar/renderer)
        const ses = win.webContents.session;
        await ses.clearCache();
        await ses.clearStorageData({
          storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
        });
        console.log("[IPC Handler] Cache da sessão padrão limpo.");
      }
      // Sessões de partição das abas de IA (ex: persist:kimi) — é aqui que
      // ficam os logins; sem isso o "Limpar Cache e Reiniciar" não zerava nada.
      await webviewHost.clearAllPartitions(partitions);
      // Descarta todas as views para serem recriadas do zero.
      webviewHost.destroyAllTabs();
      console.log("[IPC Handler] Cache e dados de armazenamento limpos.");
      if (win) win.reload();
    } catch (error) {
      console.error("Erro ao limpar o cache:", error);
    }
  });

  console.log("Manipuladores IPC inicializados.");
}

module.exports = {
  initializeIpcHandlers
};
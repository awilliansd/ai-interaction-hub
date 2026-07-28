const { contextBridge, ipcRenderer } = require("electron");

// Nomes de canais mantidos em sincronia com modules/ipc-channels.js.
// Literais no preload evitam dependência de path entre o preload empacotado e a pasta modules.
contextBridge.exposeInMainWorld("electronAPI", {
  app: {
    exit: () => ipcRenderer.send("exit-app"),
    getVersion: () => ipcRenderer.invoke("get-app-version"),
    clearCache: () => ipcRenderer.send("clear-app-cache"),
    setWindowTitle: (tabName) => ipcRenderer.send("set-window-title", tabName)
  },
  settings: {
    setMinimizeToTray: (value) => ipcRenderer.send("set-minimize-to-tray", value),
    setKeepTabsActive: (value) => ipcRenderer.send("set-keep-tabs-active", value),
    setAppMode: (value) => ipcRenderer.send("set-app-mode", value),
    onInit: (callback) => ipcRenderer.on("init-settings", (event, settings) => callback(settings)),
  },
  links: {
    openGitHub: () => ipcRenderer.send("open-github"),
  },
  // Host de WebContentsView (E1)
  tabs: {
    show: (tab) => ipcRenderer.send("host:show-tab", tab),
    reload: (tabId) => ipcRenderer.send("host:reload-tab", { id: tabId }),
    recreate: (tabId) => ipcRenderer.send("host:recreate-tab", { id: tabId }),
    resetAll: () => ipcRenderer.send("host:reset-all"),
    setOverlay: (active) => ipcRenderer.send("host:set-overlay", active),
    findOpen: (tabId) => ipcRenderer.send("host:find-open", { id: tabId }),
    findInput: (tabId, query) => ipcRenderer.send("host:find-input", { id: tabId, query }),
    findNext: (tabId, query, forward) => ipcRenderer.send("host:find-next", { id: tabId, query, forward }),
    findClose: (tabId) => ipcRenderer.send("host:find-close", { id: tabId }),
    clearTabCache: (tabId) => ipcRenderer.send("host:clear-tab-cache", { id: tabId }),
    showContextMenu: (tabId, x, y) => ipcRenderer.invoke("show-tab-context-menu", tabId, x, y),
    onLoading: (callback) => ipcRenderer.on("tab:loading", (_e, id, loading) => callback(id, loading)),
    onRecoveryToast: (callback) => ipcRenderer.on("tab:recovery-toast", (_e, id, msg) => callback(id, msg)),
    onFound: (callback) => ipcRenderer.on("tab:found", (_e, id, active, matches) => callback(id, active, matches)),
    onReady: (callback) => ipcRenderer.on("tab:ready", (_e, id) => callback(id)),
  },
  commands: {
    onReloadActiveTab: (callback) => ipcRenderer.on("command:reload-active-tab", () => callback()),
    onFindInActiveTab: (callback) => ipcRenderer.on("command:find-in-active-tab", () => callback()),
    onShowSettings: (callback) => ipcRenderer.on("command:show-settings", () => callback()),
    onToggleAppMode: (callback) => ipcRenderer.on("command:toggle-app-mode", () => callback()),
    onSetAppModePersonal: (callback) => ipcRenderer.on("command:set-app-mode-personal", () => callback()),
    onSetAppModeDeveloper: (callback) => ipcRenderer.on("command:set-app-mode-developer", () => callback()),
    onShowAbout: (callback) => ipcRenderer.on("command:show-about", () => callback()),
    onExitApp: (callback) => ipcRenderer.on("command:exit-app", () => callback()),
  }
});

console.log("Preload script loaded and APIs exposed.");
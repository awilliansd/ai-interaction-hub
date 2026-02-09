const { contextBridge, ipcRenderer } = require("electron");

// Expor APIs seguras para o processo de renderização
contextBridge.exposeInMainWorld("electronAPI", {
  // Funções relacionadas à aplicação
  app: {
    close: () => ipcRenderer.send("app:close"),
    exit: () => ipcRenderer.send("exit-app"),
    onEvent: (callback) => ipcRenderer.on("app:event", callback), // Exemplo genérico
    getVersion: () => ipcRenderer.invoke('get-app-version'),
    getGrokUserAgent: () => ipcRenderer.invoke('get-grok-user-agent'),
    showWebviewContextMenu: (params) => ipcRenderer.invoke('show-webview-context-menu', params),
    clearCache: () => ipcRenderer.send('clear-app-cache')
  },
  // Funções relacionadas às configurações
  settings: {
    setMinimizeToTray: (value) => ipcRenderer.send("set-minimize-to-tray", value),
    setKeepTabsActive: (value) => ipcRenderer.send("set-keep-tabs-active", value),
    onInit: (callback) => ipcRenderer.on("init-settings", (event, settings) => callback(settings)),
  },
  // Funções relacionadas a links externos
  links: {
    openGitHub: () => ipcRenderer.send("open-github"),
  },
  // Funções relacionadas às abas/webviews (mantendo o exemplo anterior)
  tabs: {
    onReload: (callback) => ipcRenderer.on("reload-tab", (event, tabId) => callback(tabId)), // Pode ser removido se não usado
  },
  // Funções para receber comandos do menu (processo principal)
  commands: {
    onReloadActiveTab: (callback) => ipcRenderer.on("command:reload-active-tab", () => callback()),
    onFindInActiveTab: (callback) => ipcRenderer.on("command:find-in-active-tab", () => callback()),
    onStopFindInActiveTab: (callback) => ipcRenderer.on("command:stop-find-in-active-tab", () => callback()),
    onShowSettings: (callback) => ipcRenderer.on("command:show-settings", () => callback()),
    onShowAbout: (callback) => ipcRenderer.on("command:show-about", () => callback()),
    onExitApp: (callback) => ipcRenderer.on("command:exit-app", () => callback()),
    onOpenGitHub: (callback) => ipcRenderer.on("command:open-github", () => callback())
  }
});

console.log("Preload script loaded and APIs exposed.");
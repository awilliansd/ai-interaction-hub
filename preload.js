const { contextBridge, ipcRenderer } = require("electron");

window.addEventListener("DOMContentLoaded", () => {
  // Placeholder para comunicação futura
});

contextBridge.exposeInMainWorld("electronAPI", {
  app: {
    close: () => ipcRenderer.send("app:close"),
    exit: () => ipcRenderer.send("exit-app"),
    onEvent: (callback) => ipcRenderer.on("app:event", callback),
  },
  settings: {
    setMinimizeToTray: (value) => ipcRenderer.send("set-minimize-to-tray", value),
    onInit: (callback) => ipcRenderer.on("init-settings", (event, settings) => callback(settings)),
  },
  links: {
    openGitHub: () => ipcRenderer.send("open-github"),
  },
  tabs: {
    onReload: (callback) => ipcRenderer.on("reload-tab", (event, tabId) => callback(tabId)),
  }
});

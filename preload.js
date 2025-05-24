window.addEventListener('DOMContentLoaded', () => {
  // Placeholder para comunicação futura
});

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  closeApp: () => ipcRenderer.send("app:close"),
  onAppEvent: (callback) => ipcRenderer.on("app:event", callback)
});

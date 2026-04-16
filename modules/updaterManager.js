const { dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

let isInitialized = false;
let intervalId = null;

function initializeAutoUpdater(app, getMainWindow) {
  if (isInitialized) {
    return { checkForUpdates };
  }

  if (!app || typeof getMainWindow !== "function") {
    throw new Error("UpdaterManager: dependencias invalidas para inicializar o auto update.");
  }

  isInitialized = true;

  log.transports.file.level = "info";
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    log.info("[auto-update] Verificando atualizacoes...");
  });

  autoUpdater.on("update-available", (info) => {
    log.info("[auto-update] Atualizacao disponivel:", info?.version);
  });

  autoUpdater.on("update-not-available", (info) => {
    log.info("[auto-update] Nenhuma atualizacao disponivel:", info?.version);
  });

  autoUpdater.on("download-progress", (progressObj) => {
    const percent = Number(progressObj?.percent ?? 0).toFixed(2);
    log.info(`[auto-update] Download em andamento: ${percent}%`);
  });

  autoUpdater.on("update-downloaded", async (info) => {
    log.info("[auto-update] Atualizacao baixada:", info?.version);

    const mainWindow = getMainWindow();
    const result = await dialog.showMessageBox(mainWindow || null, {
      type: "info",
      buttons: ["Reiniciar agora", "Depois"],
      defaultId: 0,
      cancelId: 1,
      title: "Atualizacao pronta",
      message: `A versao ${info?.version || "mais recente"} foi baixada.`,
      detail: "Reinicie o AI Interaction Hub para concluir a instalacao."
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });

  autoUpdater.on("error", (error) => {
    log.error("[auto-update] Erro durante atualizacao:", error);
  });

  setTimeout(() => {
    checkForUpdates(false).catch((error) => {
      log.error("[auto-update] Falha na verificacao inicial:", error);
    });
  }, 10_000);

  intervalId = setInterval(() => {
    checkForUpdates(false).catch((error) => {
      log.error("[auto-update] Falha na verificacao recorrente:", error);
    });
  }, 6 * 60 * 60 * 1000);

  app.on("before-quit", () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  });

  return { checkForUpdates };
}

async function checkForUpdates(userInitiated = false) {
  if (!autoUpdater) return;

  const { app } = require("electron");
  if (!app.isPackaged) {
    if (userInitiated) {
      await dialog.showMessageBox({
        type: "info",
        title: "Atualizacao indisponivel",
        message: "Verificacao de atualizacoes funciona apenas no app empacotado."
      });
    }
    return;
  }

  try {
    await autoUpdater.checkForUpdates();
    if (userInitiated) {
      log.info("[auto-update] Verificacao manual executada.");
    }
  } catch (error) {
    log.error("[auto-update] Erro ao verificar atualizacoes:", error);
    if (userInitiated) {
      await dialog.showMessageBox({
        type: "error",
        title: "Falha ao verificar atualizacoes",
        message: "Nao foi possivel verificar atualizacoes agora.",
        detail: error?.message || "Erro desconhecido."
      });
    }
  }
}

module.exports = {
  initializeAutoUpdater,
  checkForUpdates
};

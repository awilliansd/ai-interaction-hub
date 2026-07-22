// modules/iconResolver.js
const path = require("path");
const fs = require("fs");

// Resolve o caminho do ícone da janela principal (sem fallback existsSync).
function resolveWindowIconPath(app) {
  const isWindows = process.platform === "win32";
  if (app.isPackaged) {
    return isWindows
      ? path.join(process.resourcesPath, "icons", "app.ico")
      : path.join(process.resourcesPath, "icons", "hicolor", "512x512", "apps", "aiinteractionhub.png");
  }
  return isWindows
    ? path.join(app.getAppPath(), "icons", "app.ico")
    : path.join(app.getAppPath(), "icons", "app.png");
}

// Resolve o caminho do ícone da bandeja com fallbacks conhecidos no projeto.
function resolveTrayIconPath(app) {
  const isWindows = process.platform === "win32";
  const candidates = [];

  if (app.isPackaged) {
    if (isWindows) {
      candidates.push(path.join(process.resourcesPath, "icons", "app.ico"));
    } else {
      candidates.push(
        path.join(process.resourcesPath, "icons", "hicolor", "512x512", "apps", "aiinteractionhub.png")
      );
    }
  } else {
    if (isWindows) {
      candidates.push(path.join(app.getAppPath(), "icons", "app.ico"));
    } else {
      candidates.push(path.join(app.getAppPath(), "icons", "app.png"));
    }
  }

  // Fallbacks conhecidos no projeto
  candidates.push(
    path.join(app.getAppPath(), "icons", "app.ico"),
    path.join(app.getAppPath(), "icons", "app.png"),
    path.join(app.getAppPath(), "icons", "aiinteractionhub.png")
  );

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

module.exports = {
  resolveWindowIconPath,
  resolveTrayIconPath,
};
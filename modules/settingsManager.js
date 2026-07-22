// modules/settingsManager.js
const fs = require("fs");
const path = require("path");

// Configurações padrão (única fonte de verdade para os defaults).
// appMode passa a ser persistido aqui (Etapa C4) para que settings.json seja
// a fonte única, substituindo o uso divergente de localStorage no renderer.
const DEFAULT_SETTINGS = {
  minimizeToTray: false,
  keepTabsActive: false,
  appMode: "personal",
};

const APP_MODES = ["personal", "developer"];

let settingsPath = null;
let appInstance = null;

// Função para inicializar o módulo com a instância do app
function initialize(app) {
  if (!app) {
    throw new Error("SettingsManager: Instância do 'app' do Electron é necessária para inicialização.");
  }
  appInstance = app;
  settingsPath = path.join(appInstance.getPath("userData"), "settings.json");
  console.log(`Caminho das configurações definido para: ${settingsPath}`);
}

function getDefaultSettings() {
  return { ...DEFAULT_SETTINGS };
}

// Normaliza um objeto de configurações mesclando com os defaults e validando tipos.
function normalizeSettings(raw) {
  const base = getDefaultSettings();
  if (!raw || typeof raw !== "object") return base;

  if (typeof raw.minimizeToTray === "boolean") {
    base.minimizeToTray = raw.minimizeToTray;
  }
  if (typeof raw.keepTabsActive === "boolean") {
    base.keepTabsActive = raw.keepTabsActive;
  }
  if (typeof raw.appMode === "string" && APP_MODES.includes(raw.appMode)) {
    base.appMode = raw.appMode;
  }
  return base;
}

// Função para carregar as configurações
function loadSettings() {
  if (!settingsPath) {
    console.error("SettingsManager: Módulo não inicializado. Chame initialize(app) primeiro.");
    return getDefaultSettings();
  }
  try {
    if (fs.existsSync(settingsPath)) {
      const rawData = fs.readFileSync(settingsPath, "utf-8");
      // Mescla com os defaults para garantir chaves ausentes (ex: appMode em arquivos antigos).
      return normalizeSettings(JSON.parse(rawData));
    }
    console.log("Arquivo de configurações não encontrado, retornando padrão.");
    return getDefaultSettings();
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
    return getDefaultSettings();
  }
}

// Função para salvar as configurações.
// Retorna true em caso de sucesso e false caso a validação/escrita falhe.
function saveSettings(settings) {
  if (!settingsPath) {
    console.error("SettingsManager: Módulo não inicializado. Chame initialize(app) primeiro.");
    return false;
  }
  const normalized = normalizeSettings(settings);
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(normalized, null, 2), "utf-8");
    console.log("Configurações salvas com sucesso.");
    return true;
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    return false;
  }
}

module.exports = {
  initialize,
  loadSettings,
  saveSettings,
  getDefaultSettings
};
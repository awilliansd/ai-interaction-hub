// modules/settingsManager.js
const fs = require("fs");
const path = require("path");

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

// Função para carregar as configurações
function loadSettings() {
  if (!settingsPath) {
    console.error("SettingsManager: Módulo não inicializado. Chame initialize(app) primeiro.");
    // Retorna um objeto de configurações padrão ou lança um erro
    return { minimizeToTray: false, keepTabsActive: false }; // Retorno padrão com nova configuração
  }
  try {
    // Verifica se o arquivo existe antes de tentar ler
    if (fs.existsSync(settingsPath)) {
      const rawData = fs.readFileSync(settingsPath, "utf-8");
      return JSON.parse(rawData);
    } else {
      // Se o arquivo não existe, retorna as configurações padrão
      console.log("Arquivo de configurações não encontrado, retornando padrão.");
      return { minimizeToTray: false, keepTabsActive: false };
    }
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
    // Em caso de erro (ex: JSON inválido), retorna as configurações padrão
    return { minimizeToTray: false, keepTabsActive: false };
  }
}

// Função para salvar as configurações
function saveSettings(settings) {
  if (!settingsPath) {
    console.error("SettingsManager: Módulo não inicializado. Chame initialize(app) primeiro.");
    return; // Ou lança um erro
  }
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
    console.log("Configurações salvas com sucesso.");
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
  }
}

module.exports = {
  initialize,
  loadSettings,
  saveSettings
};
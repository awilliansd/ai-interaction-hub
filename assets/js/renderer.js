// Configuração das abas
const tabConfigs = {
  gemini: { url: "https://gemini.google.com/app", partition: "persist:gemini" },
  chatgpt: { url: "https://chat.openai.com", partition: "persist:chatgpt" },
  claude: { url: "https://claude.ai", partition: "persist:claude" },
  deepseek: { url: "https://chat.deepseek.com", partition: "persist:deepseek" },
  grok: { url: "https://grok.com", partition: "persist:grok" },
  manus: { url: "https://manus.im/app", partition: "persist:manus" },
  replit: { url: "https://replit.com/", partition: "persist:replit" },
  copilot: { url: "https://copilot.microsoft.com", partition: "persist:copilot" },
  metaai: { url: "https://www.meta.ai", partition: "persist:metaai" },
  perplexity: { url: "https://www.perplexity.ai", partition: "persist:perplexity" },
  kimi: { url: "https://www.kimi.com/", partition: "persist:kimi" },
  zai: { url: "https://chat.z.ai/", partition: "persist:zai" },
};

const APP_MODES = {
  PERSONAL: "personal",
  DEVELOPER: "developer",
};

const personalTabs = [
  "gemini",
  "chatgpt",
  "claude",
  "deepseek",
  "grok",
  "copilot",
  "metaai",
  "perplexity",
  "kimi",
];

const developerTabs = ["manus", "replit", "zai"];

const tabsByMode = {
  [APP_MODES.PERSONAL]: personalTabs,
  [APP_MODES.DEVELOPER]: developerTabs,
};

let activeWebview = null;
let currentTabId = null;
let keepTabsActive = localStorage.getItem("keepTabsActive") === "true";
let minimizeToTray = localStorage.getItem("minimizeToTray") === "true";
let appMode = localStorage.getItem("appMode") === APP_MODES.DEVELOPER ? APP_MODES.DEVELOPER : APP_MODES.PERSONAL;

function getAllowedTabs() {
  return tabsByMode[appMode] || tabsByMode[APP_MODES.PERSONAL];
}

function isTabAllowed(tabId) {
  return getAllowedTabs().includes(tabId);
}

function applyAppMode() {
  const allowedTabs = getAllowedTabs();

  document.querySelectorAll("#sidebar .sidebar-top button[id^='btn-']").forEach((button) => {
    const tabId = button.id.replace("btn-", "");
    button.style.display = allowedTabs.includes(tabId) ? "" : "none";
  });

  document.querySelectorAll("#webview-container webview[id]").forEach((webview) => {
    webview.style.display = allowedTabs.includes(webview.id) ? "" : "none";
  });
}

function toggleMenu(menuId) {
  document.querySelectorAll(".dropdown-menu").forEach(menu => {
    if (menu.id !== menuId + "-menu") menu.classList.remove("show");
  });
  const menu = document.getElementById(menuId + "-menu");
  if (menu) menu.classList.toggle("show");
}

function exitApp() { window.electronAPI.app.exit(); }
function openGitHub() { window.electronAPI.links.openGitHub(); }
function getCurrentYear() { return new Date().getFullYear(); }

function showAbout() {
  const modal = document.getElementById("about-modal");
  if (modal) modal.style.display = "block";
  hideAllMenus();
}

function hideAbout() {
  const modal = document.getElementById("about-modal");
  if (modal) modal.style.display = "none";
}

function showSettings() {
  const modal = document.getElementById("settings-modal");
  if (modal) {
    modal.style.display = "block";
    const minimizeCheckbox = document.getElementById("minimize-to-tray");
    if (minimizeCheckbox) minimizeCheckbox.checked = minimizeToTray;
    const keepActiveCheckbox = document.getElementById("keep-tabs-active");
    if (keepActiveCheckbox) keepActiveCheckbox.checked = keepTabsActive;
    const appModeSelect = document.getElementById("app-mode");
    if (appModeSelect) appModeSelect.value = appMode;
  }
  hideAllMenus();
}

function hideSettings() {
  const modal = document.getElementById("settings-modal");
  if (modal) modal.style.display = "none";
}

function toggleMinimizeToTray() {
  const checkbox = document.getElementById("minimize-to-tray");
  minimizeToTray = checkbox.checked;
  localStorage.setItem("minimizeToTray", minimizeToTray.toString());
  window.electronAPI.settings.setMinimizeToTray(minimizeToTray);
}

function toggleKeepTabsActive() {
  const checkbox = document.getElementById("keep-tabs-active");
  keepTabsActive = checkbox.checked;
  localStorage.setItem("keepTabsActive", keepTabsActive.toString());
  window.electronAPI.settings.setKeepTabsActive(keepTabsActive);
  window.location.reload();
}

function toggleAppMode() {
  const appModeSelect = document.getElementById("app-mode");
  const selectedMode = appModeSelect && appModeSelect.value === APP_MODES.DEVELOPER
    ? APP_MODES.DEVELOPER
    : APP_MODES.PERSONAL;

  if (selectedMode === appMode) return;

  appMode = selectedMode;
  localStorage.setItem("appMode", appMode);
  applyAppMode();

  if (!isTabAllowed(currentTabId)) {
    if (activeWebview) {
      activeWebview.remove();
      activeWebview = null;
    }
    const fallbackTab = getAllowedTabs()[0];
    if (fallbackTab) showTab(fallbackTab);
  }
}

function showTabContextMenu(event, tabId) {
  if (!isTabAllowed(tabId)) return;
  event.preventDefault();
  event.stopPropagation();
  document.body.setAttribute("data-current-tab", tabId);
  const menu = document.getElementById("tab-context-menu");
  menu.style.left = `${event.pageX}px`;
  menu.style.top = `${event.pageY}px`;
  menu.style.display = "block";
}

function hideTabContextMenu() {
  const menu = document.getElementById("tab-context-menu");
  if (menu) menu.style.display = "none";
}

function hideAllMenus() {
  document.querySelectorAll(".dropdown-menu").forEach(menu => menu.classList.remove("show"));
}

function reloadCurrentTab() {
  const webview = getActiveWebview();
  if (webview) {
    webview.reload();
    hideTabContextMenu();
  }
}

function clearAppCache() {
  if (confirm("Isso irá limpar todo o cache e dados de navegação (incluindo logins) e reiniciar a aplicação. Deseja continuar?")) {
    window.electronAPI.app.clearCache();
  }
}

function attachWebviewListeners(webview) {
  const hideMenus = () => {
    hideAllMenus();
    hideTabContextMenu();
  };
  webview.addEventListener("focus", hideMenus);
  webview.addEventListener("mousedown", hideMenus);
  
  webview.addEventListener('dom-ready', () => {
    webview.setSpellCheckerLanguages(['pt-BR']);
    webview.setSpellCheckerEnabled(true);
    
    webview.addEventListener('context-menu', (_event, params) => {
      window.electronAPI.app.showWebviewContextMenu(params);
    });
  });
}

function showTab(tabId) {
  if (!isTabAllowed(tabId)) return;
  if (currentTabId === tabId && keepTabsActive) return;

  const container = document.getElementById("webview-container");
  if (!container) return;

  // 1. Desativar aba anterior
  if (currentTabId) {
    const prevWebview = document.getElementById(currentTabId);
    if (prevWebview) prevWebview.classList.remove("active");
  }

  currentTabId = tabId;
  document.body.setAttribute("data-current-tab", tabId);

  if (keepTabsActive) {
    // Modo Estático
    let webview = document.getElementById(tabId);
    if (!webview) {
      webview = createWebviewElement(tabId);
      container.appendChild(webview);
    }
    webview.classList.add("active");
    activeWebview = webview;
  } else {
    // Modo Dinâmico (Otimizado)
    if (activeWebview) {
      activeWebview.remove();
      activeWebview = null;
    }
    const webview = createWebviewElement(tabId);
    container.appendChild(webview);
    webview.classList.add("active");
    activeWebview = webview;
  }

  // Atualizar botões
  document.querySelectorAll("#sidebar button").forEach(btn => btn.classList.remove("active-button"));
  const activeBtn = document.getElementById(`btn-${tabId}`);
  if (activeBtn) activeBtn.classList.add("active-button");
}

function createWebviewElement(tabId) {
  const config = tabConfigs[tabId];
  const webview = document.createElement("webview");
  webview.id = tabId;
  webview.src = config.url;
  webview.partition = config.partition;
  webview.setAttribute("allowpopups", "");
  if (tabId === "deepseek") {
    const cleanUserAgent = navigator.userAgent.replace(/\sElectron\/[^\s]+/i, "");
    webview.setAttribute("useragent", cleanUserAgent);
    webview.setAttribute("preload", "./assets/js/deepseek-preload.js");
  }

  attachWebviewListeners(webview);
  return webview;
}

function getActiveWebview() {
  return activeWebview;
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  applyAppMode();

  // Carregar primeira aba
  showTab('gemini');
  
  // Listeners globais
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown")) hideAllMenus();
    if (!e.target.closest("#tab-context-menu")) hideTabContextMenu();
  });

  // Comandos do processo principal
  if (window.electronAPI && window.electronAPI.commands) {
    window.electronAPI.commands.onReloadActiveTab(() => reloadCurrentTab());
    window.electronAPI.commands.onShowSettings(() => showSettings());
    window.electronAPI.commands.onShowAbout(() => showAbout());
    window.electronAPI.commands.onExitApp(() => exitApp());
  }
});

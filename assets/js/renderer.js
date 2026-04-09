// Configuração das abas
const tabConfigs = {
  gemini: { url: "https://gemini.google.com/app", partition: "persist:gemini" },
  chatgpt: { url: "https://chat.openai.com", partition: "persist:chatgpt" },
  claude: { url: "https://claude.ai", partition: "persist:claude" },
  deepseek: { url: "https://chat.deepseek.com", partition: "persist:deepseek" },
  grok: { url: "https://grok.com", partition: "persist:grok" },
  manus: { url: "https://manus.im/app", partition: "persist:manus" },
  replit: { url: "https://replit.com/", partition: "persist:replit" },
  groq: { url: "https://console.groq.com/playground", partition: "persist:groq" },
  copilot: { url: "https://copilot.microsoft.com", partition: "persist:copilot" },
  metaai: { url: "https://www.meta.ai", partition: "persist:metaai" },
  perplexity: { url: "https://www.perplexity.ai", partition: "persist:perplexity" },
  kimi: { url: "https://www.kimi.com/", partition: "persist:kimi" },
  zai: { url: "https://chat.z.ai/", partition: "persist:zai" },
};

const tabLabels = {
  gemini: "Gemini",
  chatgpt: "ChatGPT",
  claude: "Claude",
  deepseek: "DeepSeek",
  grok: "Grok",
  manus: "Manus",
  replit: "Replit",
  groq: "Groq",
  copilot: "MS Copilot",
  metaai: "Meta AI",
  perplexity: "Perplexity",
  kimi: "Kimi",
  zai: "Z.ai",
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

const developerTabs = ["claude", "manus", "replit", "groq", "zai"];

const tabsByMode = {
  [APP_MODES.PERSONAL]: personalTabs,
  [APP_MODES.DEVELOPER]: developerTabs,
};

let activeWebview = null;
let currentTabId = null;
let keepTabsActive = localStorage.getItem("keepTabsActive") === "true";
let minimizeToTray = localStorage.getItem("minimizeToTray") === "true";
let appMode = localStorage.getItem("appMode") === APP_MODES.DEVELOPER ? APP_MODES.DEVELOPER : APP_MODES.PERSONAL;
const WEBVIEW_MAX_AUTO_RETRIES = 3;
const WEBVIEW_MAX_AUTO_RECREATES = 1;
const WEBVIEW_LOAD_WATCHDOG_MS = 75000;
const WEBVIEW_RECOVERY_TOAST_MS = 4500;
const webviewRetryState = new Map();
const webviewRecreateState = new Map();
const webviewLoadWatchdogs = new Map();
let recoveryToastEl = null;

function getCleanChromeUserAgent() {
  return navigator.userAgent
    .replace(/\sElectron\/[^\s]+/i, "")
    .replace(/\sAI-Interaction-Hub\/[^\s]+/i, "");
}

function showWebviewRecoveryToast(message) {
  if (!message) return;
  if (!recoveryToastEl) {
    recoveryToastEl = document.createElement("div");
    recoveryToastEl.id = "webview-recovery-toast";
    recoveryToastEl.style.position = "fixed";
    recoveryToastEl.style.right = "14px";
    recoveryToastEl.style.bottom = "14px";
    recoveryToastEl.style.zIndex = "9999";
    recoveryToastEl.style.maxWidth = "340px";
    recoveryToastEl.style.padding = "8px 10px";
    recoveryToastEl.style.borderRadius = "6px";
    recoveryToastEl.style.background = "rgba(30, 30, 30, 0.9)";
    recoveryToastEl.style.color = "#e9e9e9";
    recoveryToastEl.style.fontSize = "12px";
    recoveryToastEl.style.lineHeight = "1.4";
    recoveryToastEl.style.pointerEvents = "none";
    recoveryToastEl.style.opacity = "0";
    recoveryToastEl.style.transition = "opacity 0.18s ease";
    document.body.appendChild(recoveryToastEl);
  }

  recoveryToastEl.textContent = message;
  recoveryToastEl.style.opacity = "1";

  if (recoveryToastEl._hideTimer) {
    window.clearTimeout(recoveryToastEl._hideTimer);
  }
  recoveryToastEl._hideTimer = window.setTimeout(() => {
    if (recoveryToastEl) recoveryToastEl.style.opacity = "0";
  }, WEBVIEW_RECOVERY_TOAST_MS);
}

function scheduleWebviewRetry(webview, reason) {
  if (!webview || !webview.id || !webview.isConnected) return;

  const tabId = webview.id;
  const currentRetry = webviewRetryState.get(tabId) || 0;
  if (currentRetry >= WEBVIEW_MAX_AUTO_RETRIES) {
    // Evita recriar agressivamente em erros de carga comuns; tenta apenas em travamento/crash.
    const shouldRecreate = reason.includes("render-process-gone") || reason.includes("watchdog-timeout");
    if (shouldRecreate) {
      console.warn(`[${tabId}] retry limit reached after ${reason}; attempting recreate.`);
      attemptWebviewRecreate(tabId, `retry-limit (${reason})`);
    } else {
      console.warn(`[${tabId}] retry limit reached after ${reason}.`);
      showWebviewRecoveryToast(`${tabLabels[tabId] || tabId}: conexão instável. Tente recarregar a aba.`);
    }
    return;
  }

  const nextRetry = currentRetry + 1;
  webviewRetryState.set(tabId, nextRetry);
  const delayMs = Math.min(8000, 1000 * Math.pow(2, nextRetry - 1));
  console.warn(`[${tabId}] scheduling retry #${nextRetry} in ${delayMs}ms due to ${reason}.`);

  window.setTimeout(() => {
    const currentWebview = document.getElementById(tabId);
    if (!currentWebview || !currentWebview.isConnected) return;
    if (currentTabId !== tabId && !keepTabsActive) return;

    try {
      currentWebview.reloadIgnoringCache();
    } catch (_error) {
      currentWebview.reload();
    }
  }, delayMs);
}

function resetWebviewRetry(webview) {
  if (!webview || !webview.id) return;
  webviewRetryState.set(webview.id, 0);
  webviewRecreateState.set(webview.id, 0);
}

function clearWebviewWatchdog(tabId) {
  const timerId = webviewLoadWatchdogs.get(tabId);
  if (!timerId) return;
  window.clearTimeout(timerId);
  webviewLoadWatchdogs.delete(tabId);
}

function startWebviewWatchdog(webview) {
  if (!webview || !webview.id) return;
  const tabId = webview.id;

  clearWebviewWatchdog(tabId);
  const timerId = window.setTimeout(() => {
    const currentWebview = document.getElementById(tabId);
    if (!currentWebview || !currentWebview.isConnected) return;
    if (currentTabId !== tabId && !keepTabsActive) return;
    if (currentWebview.isLoading && currentWebview.isLoading()) {
      attemptWebviewRecreate(tabId, "watchdog-timeout");
    }
  }, WEBVIEW_LOAD_WATCHDOG_MS);
  webviewLoadWatchdogs.set(tabId, timerId);
}

function attemptWebviewRecreate(tabId, reason) {
  const currentRecreate = webviewRecreateState.get(tabId) || 0;
  if (currentRecreate >= WEBVIEW_MAX_AUTO_RECREATES) {
    console.warn(`[${tabId}] recreate limit reached after ${reason}.`);
    return;
  }

  const oldWebview = document.getElementById(tabId);
  if (!oldWebview || !oldWebview.isConnected) return;
  const container = document.getElementById("webview-container");
  if (!container) return;
  if (!keepTabsActive && currentTabId !== tabId) return;

  webviewRecreateState.set(tabId, currentRecreate + 1);
  webviewRetryState.set(tabId, 0);
  clearWebviewWatchdog(tabId);

  const newWebview = createWebviewElement(tabId);
  if (oldWebview.classList.contains("active")) {
    newWebview.classList.add("active");
  }

  oldWebview.replaceWith(newWebview);
  if (currentTabId === tabId) {
    activeWebview = newWebview;
  }

  console.warn(`[${tabId}] webview recreated due to ${reason}.`);
  showWebviewRecoveryToast(`${tabLabels[tabId] || tabId}: sessão reiniciada para recuperação.`);
}

function updateWindowTitleForTab(tabId) {
  if (window.electronAPI && window.electronAPI.app && window.electronAPI.app.setWindowTitle) {
    const tabName = tabLabels[tabId] || tabId;
    window.electronAPI.app.setWindowTitle(tabName);
  }
}

function updateWindowTitleForCurrentTab() {
  const tabId = currentTabId || getAllowedTabs()[0];
  if (tabId) updateWindowTitleForTab(tabId);
}

function getAllowedTabs() {
  return tabsByMode[appMode] || tabsByMode[APP_MODES.PERSONAL];
}

function isTabAllowed(tabId) {
  return getAllowedTabs().includes(tabId);
}

function updateAppModeControls() {
  const appModeSelect = document.getElementById("app-mode");
  if (appModeSelect) appModeSelect.value = appMode;

  const appModeIndicator = document.getElementById("app-mode-indicator");
  if (appModeIndicator) {
    appModeIndicator.textContent = appMode === APP_MODES.DEVELOPER ? "D" : "P";
  }

  const modeButton = document.getElementById("btn-app-mode");
  if (modeButton) {
    const modeLabel = appMode === APP_MODES.DEVELOPER ? "Desenvolvedor" : "Pessoal";
    modeButton.title = `Alternar modo: ${modeLabel}`;
  }
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

  updateAppModeControls();
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

async function initializeAboutInfo() {
  const appName = "AI Interaction Hub";
  const yearElement = document.getElementById("current-year");
  if (yearElement) yearElement.textContent = String(getCurrentYear());

  const versionElement = document.getElementById("app-version");
  if (!versionElement) return;

  try {
    const version = await window.electronAPI.app.getVersion();
    const resolvedVersion = version || "N/A";
    versionElement.textContent = resolvedVersion;
    document.title = `${appName} - v${resolvedVersion}`;
  } catch (_error) {
    versionElement.textContent = "N/A";
    document.title = appName;
  }
}

function showAbout() {
  const modal = document.getElementById("about-modal");
  if (modal) modal.style.display = "flex";
  hideAllMenus();
}

function hideAbout() {
  const modal = document.getElementById("about-modal");
  if (modal) modal.style.display = "none";
}

function showSettings() {
  const modal = document.getElementById("settings-modal");
  if (modal) {
    modal.style.display = "flex";
    const minimizeCheckbox = document.getElementById("minimize-to-tray");
    if (minimizeCheckbox) minimizeCheckbox.checked = minimizeToTray;
    const keepActiveCheckbox = document.getElementById("keep-tabs-active");
    if (keepActiveCheckbox) keepActiveCheckbox.checked = keepTabsActive;
    updateAppModeControls();
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

function setAppMode(mode) {
  const selectedMode = mode === APP_MODES.DEVELOPER ? APP_MODES.DEVELOPER : APP_MODES.PERSONAL;
  if (selectedMode === appMode) {
    updateAppModeControls();
    return;
  }

  appMode = selectedMode;
  localStorage.setItem("appMode", appMode);
  resetAllWebviews();
  applyAppMode();

  const firstTabForMode = getAllowedTabs()[0];
  if (firstTabForMode) showTab(firstTabForMode);
}

function toggleAppMode() {
  const appModeSelect = document.getElementById("app-mode");
  const selectedMode = appModeSelect && appModeSelect.value === APP_MODES.DEVELOPER
    ? APP_MODES.DEVELOPER
    : APP_MODES.PERSONAL;
  setAppMode(selectedMode);
}

function cycleAppMode() {
  const nextMode = appMode === APP_MODES.PERSONAL ? APP_MODES.DEVELOPER : APP_MODES.PERSONAL;
  setAppMode(nextMode);
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
  
  webview.addEventListener("did-start-loading", () => {
    startWebviewWatchdog(webview);
  });

  webview.addEventListener("did-stop-loading", () => {
    clearWebviewWatchdog(webview.id);
  });

  webview.addEventListener("destroyed", () => {
    clearWebviewWatchdog(webview.id);
  });

  webview.addEventListener('dom-ready', () => {
    webview.setSpellCheckerLanguages(['pt-BR']);
    webview.setSpellCheckerEnabled(true);
    resetWebviewRetry(webview);
  });

  webview.addEventListener('context-menu', (_event, params) => {
    window.electronAPI.app.showWebviewContextMenu(params);
  });

  webview.addEventListener("did-fail-load", (event) => {
    if (event.errorCode === -3) return; // ERR_ABORTED (navigation interrupted intentionally)
    if (!event.isMainFrame) return;
    clearWebviewWatchdog(webview.id);
    showWebviewRecoveryToast(`${tabLabels[webview.id] || webview.id}: falha de carregamento, tentando recuperar...`);
    scheduleWebviewRetry(webview, `did-fail-load (${event.errorCode})`);
  });

  webview.addEventListener("render-process-gone", (event) => {
    clearWebviewWatchdog(webview.id);
    const reason = event && event.details && event.details.reason ? event.details.reason : "unknown";
    showWebviewRecoveryToast(`${tabLabels[webview.id] || webview.id}: processo da aba reiniciado (${reason}).`);
    scheduleWebviewRetry(webview, `render-process-gone (${reason})`);
  });

  webview.addEventListener("unresponsive", () => {
    clearWebviewWatchdog(webview.id);
    showWebviewRecoveryToast(`${tabLabels[webview.id] || webview.id}: aba sem resposta, tentando recuperar...`);
    scheduleWebviewRetry(webview, "unresponsive");
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
  updateWindowTitleForTab(tabId);

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
  const cleanUserAgent = getCleanChromeUserAgent();

  if (tabId === "deepseek") {
    webview.setAttribute("useragent", cleanUserAgent);
    webview.setAttribute("preload", "./assets/js/deepseek-preload.js");
  }

  attachWebviewListeners(webview);
  return webview;
}

function getActiveWebview() {
  return activeWebview;
}

function resetAllWebviews() {
  const container = document.getElementById("webview-container");
  if (!container) return;

  webviewLoadWatchdogs.forEach((timerId) => window.clearTimeout(timerId));
  webviewLoadWatchdogs.clear();
  if (recoveryToastEl && recoveryToastEl._hideTimer) {
    window.clearTimeout(recoveryToastEl._hideTimer);
  }
  container.querySelectorAll("webview").forEach((webview) => webview.remove());
  activeWebview = null;
  currentTabId = null;
  document.body.removeAttribute("data-current-tab");
  document.querySelectorAll("#sidebar button").forEach((btn) => btn.classList.remove("active-button"));
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  // Garante o título com a aba após o init-settings (enviado no did-finish-load)
  if (window.electronAPI && window.electronAPI.settings && window.electronAPI.settings.onInit) {
    window.electronAPI.settings.onInit(() => {
      updateWindowTitleForCurrentTab();
    });
  }

  initializeAboutInfo();
  // Remove webviews estáticas do HTML para evitar instâncias duplicadas/IDs duplicados.
  resetAllWebviews();
  applyAppMode();

  // Carregar primeira aba disponível do modo atual
  const initialTab = getAllowedTabs()[0];
  if (initialTab) showTab(initialTab);
  setTimeout(() => updateWindowTitleForCurrentTab(), 200);
  
  // Listeners globais
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown")) hideAllMenus();
    if (!e.target.closest("#tab-context-menu")) hideTabContextMenu();
  });


  // Comandos do processo principal
  if (window.electronAPI && window.electronAPI.commands) {
    window.electronAPI.commands.onReloadActiveTab(() => reloadCurrentTab());
    window.electronAPI.commands.onShowSettings(() => showSettings());
    window.electronAPI.commands.onToggleAppMode(() => cycleAppMode());
    window.electronAPI.commands.onSetAppModePersonal(() => setAppMode(APP_MODES.PERSONAL));
    window.electronAPI.commands.onSetAppModeDeveloper(() => setAppMode(APP_MODES.DEVELOPER));
    window.electronAPI.commands.onShowAbout(() => showAbout());
    window.electronAPI.commands.onExitApp(() => exitApp());
  }
});

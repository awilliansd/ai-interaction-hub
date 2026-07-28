// assets/js/renderer.js (ES module)
// Renderer passou a comandar o host de WebContentsView (processo principal).
// Não há mais <webview> no DOM; a UI cuida apenas de sidebar, modais, find bar e
// indicadores de carregamento/recuperação.
import { TAB_CONFIGS, TAB_BY_ID, APP_MODES, getTabsByMode, getAllowedTabIds, DEFAULT_SETTINGS } from "./tabs.config.js";

// --- Estado de runtime ---
let currentTabId = null;
let minimizeToTray = DEFAULT_SETTINGS.minimizeToTray;
let keepTabsActive = DEFAULT_SETTINGS.keepTabsActive;
let appMode = DEFAULT_SETTINGS.appMode;
let overlayActive = false;
let settingsReady = false;

// --- Find in page ---
let findBarEl = null;
let findInputEl = null;
let findResultsEl = null;
let findActive = false;

// --- Toast de recuperação ---
let recoveryToastEl = null;
const WEBVIEW_RECOVERY_TOAST_MS = 4500;

// --- Helpers de config ---
function tabLabel(id) { return (TAB_BY_ID[id] && TAB_BY_ID[id].label) || id; }
function getAllowedTabs() { return getTabsByMode(appMode); }
function isTabAllowed(tabId) { return getAllowedTabs().some((t) => t.id === tabId); }

// User-Agent "limpo" para abas que pedem (ex: DeepSeek).
function getCleanChromeUserAgent() {
  return navigator.userAgent
    .replace(/\sElectron\/[^\s]+/i, "")
    .replace(/\sAI-Interaction-Hub\/[^\s]+/i, "");
}

// Constrói o descritor enviado ao webviewHost (main).
function buildHostTab(tabId) {
  const tab = TAB_BY_ID[tabId];
  if (!tab) return null;
  const descriptor = {
    id: tab.id,
    label: tab.label,
    url: tab.url,
    partition: tab.partition,
  };
  if (tab.preload) descriptor.preload = tab.preload;
  if (tab.userAgent === "clean-chrome") descriptor.userAgent = getCleanChromeUserAgent();
  return descriptor;
}

// --- Toast ---
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
  if (recoveryToastEl._hideTimer) window.clearTimeout(recoveryToastEl._hideTimer);
  recoveryToastEl._hideTimer = window.setTimeout(() => {
    if (recoveryToastEl) recoveryToastEl.style.opacity = "0";
  }, WEBVIEW_RECOVERY_TOAST_MS);
}

// --- Overlay (modais/find bar): avisa o host para esconder a IA ativa ---
function setOverlay(active) {
  overlayActive = active;
  window.electronAPI?.tabs?.setOverlay?.(active);
}

// --- Título da janela ---
function updateWindowTitleForTab(tabId) {
  window.electronAPI?.app?.setWindowTitle?.(tabLabel(tabId));
}
function updateWindowTitleForCurrentTab() {
  const tabId = currentTabId || getAllowedTabs()[0]?.id;
  if (tabId) updateWindowTitleForTab(tabId);
}

// --- Modo da aplicação ---
function updateAppModeControls() {
  const appModeSelect = document.getElementById("app-mode");
  if (appModeSelect) appModeSelect.value = appMode;
  const appModeIndicator = document.getElementById("app-mode-indicator");
  if (appModeIndicator) appModeIndicator.textContent = appMode === APP_MODES.DEVELOPER ? "D" : "P";
  const modeButton = document.getElementById("btn-app-mode");
  if (modeButton) {
    const modeLabel = appMode === APP_MODES.DEVELOPER ? "Desenvolvedor" : "Pessoal";
    modeButton.title = `Alternar modo: ${modeLabel}`;
  }
}

function applyAppMode() {
  const allowedIds = getAllowedTabs().map((t) => t.id);
  document.querySelectorAll("#sidebar .sidebar-top button[id^='btn-']").forEach((button) => {
    const tabId = button.id.replace("btn-", "");
    button.style.display = allowedIds.includes(tabId) ? "" : "none";
  });
  updateAppModeControls();
}

function setAppMode(mode) {
  const selectedMode = mode === APP_MODES.DEVELOPER ? APP_MODES.DEVELOPER : APP_MODES.PERSONAL;
  appMode = selectedMode;
  window.electronAPI?.settings?.setAppMode?.(selectedMode);
  applyAppMode();
  // Descarta as views atuais e abre a primeira aba do novo modo.
  window.electronAPI?.tabs?.resetAll?.();
  const firstTab = getAllowedTabs()[0];
  if (firstTab) showTab(firstTab.id);
}

function cycleAppMode() {
  setAppMode(appMode === APP_MODES.PERSONAL ? APP_MODES.DEVELOPER : APP_MODES.PERSONAL);
}

// --- Sidebar dinâmica ---
function buildSidebar() {
  const container = document.getElementById("sidebar-top");
  if (!container) return;
  container.innerHTML = "";
  for (const tab of TAB_CONFIGS) {
    const button = document.createElement("button");
    button.id = `btn-${tab.id}`;
    button.title = tab.label;
    button.addEventListener("click", () => showTab(tab.id));
    button.addEventListener("contextmenu", (event) => showTabContextMenu(event, tab.id));
    const img = document.createElement("img");
    img.src = tab.icon;
    img.alt = tab.label;
    img.width = 32;
    img.height = 32;
    button.appendChild(img);
    container.appendChild(button);
  }
}

// --- Menu de contexto das abas (nativo via Electron Menu) ---
function showTabContextMenu(event, tabId) {
  if (!isTabAllowed(tabId)) return;
  event.preventDefault();
  event.stopPropagation();
  document.body.setAttribute("data-current-tab", tabId);
  currentTabId = tabId;
  window.electronAPI?.tabs?.showContextMenu?.(tabId, event.x, event.y);
}
function hideAllMenus() {
  document.querySelectorAll(".dropdown-menu").forEach((m) => m.classList.remove("show"));
}

// --- Modais (overlay) ---
function showAbout() {
  const modal = document.getElementById("about-modal");
  if (modal) modal.style.display = "flex";
  hideAllMenus();
  setOverlay(true);
}
function hideAbout() {
  const modal = document.getElementById("about-modal");
  if (modal) modal.style.display = "none";
  setOverlay(false);
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
  setOverlay(true);
}
function hideSettings() {
  const modal = document.getElementById("settings-modal");
  if (modal) modal.style.display = "none";
  setOverlay(false);
}

function exitApp() { window.electronAPI?.app?.exit?.(); }
function openGitHub() { window.electronAPI?.links?.openGitHub?.(); }
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
  } catch (_e) {
    versionElement.textContent = "N/A";
    document.title = appName;
  }
}

// --- Ações ---
function reloadCurrentTab() {
  const tabId = currentTabId || document.body.getAttribute("data-current-tab");
  if (!tabId) return;
  window.electronAPI?.tabs?.reload?.(tabId);
}
function clearAppCache() {
  if (confirm("Isso irá limpar todo o cache e dados de navegação (incluindo logins) e reiniciar a aplicação. Deseja continuar?")) {
    window.electronAPI?.app?.clearCache?.();
    // Destrói e recria a aba atual após limpar.
    const tabId = currentTabId;
    if (tabId) {
      window.electronAPI?.tabs?.recreate?.(tabId);
    }
  }
}

// --- Troca de abas (delegada ao host) ---
function showTab(tabId) {
  if (!isTabAllowed(tabId)) return;
  currentTabId = tabId;
  document.body.setAttribute("data-current-tab", tabId);
  updateWindowTitleForTab(tabId);
  const descriptor = buildHostTab(tabId);
  if (descriptor) window.electronAPI?.tabs?.show?.(descriptor);
  document.querySelectorAll("#sidebar button").forEach((btn) => btn.classList.remove("active-button"));
  const activeBtn = document.getElementById(`btn-${tabId}`);
  if (activeBtn) activeBtn.classList.add("active-button");
}

// --- Find in Page ---
function ensureFindBarRefs() {
  findBarEl = document.getElementById("find-in-page-bar");
  findInputEl = document.getElementById("find-input");
  findResultsEl = document.getElementById("find-results");
}

function openFindBar() {
  if (!currentTabId) return;
  ensureFindBarRefs();
  if (!findBarEl) return;
  findActive = true;
  findBarEl.style.display = "flex";
  if (findInputEl) {
    findInputEl.value = "";
    findInputEl.focus();
  }
  if (findResultsEl) findResultsEl.textContent = "0/0";
  setOverlay(true);
  window.electronAPI?.tabs?.findOpen?.(currentTabId);
}

function closeFindBar() {
  if (!findBarEl) return;
  findActive = false;
  if (currentTabId) window.electronAPI?.tabs?.findClose?.(currentTabId);
  findBarEl.style.display = "none";
  if (findInputEl) findInputEl.value = "";
  if (findResultsEl) findResultsEl.textContent = "0/0";
  setOverlay(false);
}

function runFind(forward) {
  if (!currentTabId || !findActive) return;
  const query = findInputEl?.value || "";
  if (!forward) {
    window.electronAPI?.tabs?.findNext?.(currentTabId, query, false);
  } else {
    window.electronAPI?.tabs?.findInput?.(currentTabId, query);
  }
}

function wireFindBar() {
  ensureFindBarRefs();
  if (!findBarEl) return;
  document.getElementById("find-next-btn")?.addEventListener("click", () => runFind(true));
  document.getElementById("find-prev-btn")?.addEventListener("click", () => runFind(false));
  document.getElementById("close-find-bar-btn")?.addEventListener("click", closeFindBar);
  findInputEl?.addEventListener("input", () => runFind(true));
}

// --- Aplica configurações vindas do processo principal (fonte única) ---
function applySettings(settings) {
  if (settings && typeof settings.keepTabsActive === "boolean") keepTabsActive = settings.keepTabsActive;
  if (settings && typeof settings.minimizeToTray === "boolean") minimizeToTray = settings.minimizeToTray;
  if (settings && typeof settings.appMode === "string" && (settings.appMode === APP_MODES.PERSONAL || settings.appMode === APP_MODES.DEVELOPER)) {
    appMode = settings.appMode;
  }
  applyAppMode();
}

function initializeWithSettings(settings) {
  applySettings(settings);
  settingsReady = true;
  const firstTab = getAllowedTabs()[0];
  if (firstTab) showTab(firstTab.id);
  setTimeout(updateWindowTitleForCurrentTab, 200);
}

// --- Toggles de configurações ---
function toggleMinimizeToTray() {
  const checkbox = document.getElementById("minimize-to-tray");
  minimizeToTray = !!checkbox?.checked;
  window.electronAPI?.settings?.setMinimizeToTray?.(minimizeToTray);
}

function toggleKeepTabsActive() {
  const checkbox = document.getElementById("keep-tabs-active");
  keepTabsActive = !!checkbox?.checked;
  window.electronAPI?.settings?.setKeepTabsActive?.(keepTabsActive);
  // Reconstrói a aba atual para reaplicar a estratégia (best-effort).
  if (currentTabId) {
    window.electronAPI?.tabs?.resetAll?.();
    showTab(currentTabId);
  }
}

function toggleAppMode() {
  const appModeSelect = document.getElementById("app-mode");
  const selectedMode = appModeSelect && appModeSelect.value === APP_MODES.DEVELOPER
    ? APP_MODES.DEVELOPER
    : APP_MODES.PERSONAL;
  setAppMode(selectedMode);
}

// --- Inicialização ---
document.addEventListener("DOMContentLoaded", () => {
  buildSidebar();
  wireFindBar();
  initializeAboutInfo();
  applyAppMode();

  if (window.electronAPI?.settings?.onInit) {
    window.electronAPI.settings.onInit((settings) => initializeWithSettings(settings));
  }
  // Fallback caso init-settings não chegue.
  window.setTimeout(() => {
    if (!settingsReady) initializeWithSettings(DEFAULT_SETTINGS);
  }, 1500);

  // Listeners globais de UI
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown")) hideAllMenus();
    if (e.target.classList?.contains("modal")) {
      e.target.style.display = "none";
      setOverlay(false);
    }
  });

  document.querySelectorAll(".close[data-close]").forEach((el) => {
    el.addEventListener("click", () => {
      const which = el.getAttribute("data-close");
      if (which === "settings") hideSettings();
      else if (which === "about") hideAbout();
    });
  });

  // Botões da sidebar inferior
  document.getElementById("btn-app-mode")?.addEventListener("click", cycleAppMode);
  document.getElementById("btn-clear-cache")?.addEventListener("click", clearAppCache);
  document.getElementById("btn-settings")?.addEventListener("click", showSettings);

  // Configurações
  document.getElementById("minimize-to-tray")?.addEventListener("change", toggleMinimizeToTray);
  document.getElementById("keep-tabs-active")?.addEventListener("change", toggleKeepTabsActive);
  document.getElementById("app-mode")?.addEventListener("change", toggleAppMode);

  // Sobre
  document.getElementById("github-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    openGitHub();
  });

  // ESC fecha busca/modais
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (findActive) { closeFindBar(); return; }
    hideSettings();
    hideAbout();
    setOverlay(false);
  });

  // Eventos do host (main -> renderer)
  window.electronAPI?.tabs?.onRecoveryToast?.((_id, message) => showWebviewRecoveryToast(message));
  window.electronAPI?.tabs?.onFound?.((_id, active, matches) => {
    if (findResultsEl) findResultsEl.textContent = `${active}/${matches}`;
  });

  // Comandos do menu principal
  if (window.electronAPI?.commands) {
    window.electronAPI.commands.onReloadActiveTab?.(() => reloadCurrentTab());
    window.electronAPI.commands.onFindInActiveTab?.(() => openFindBar());
    window.electronAPI.commands.onShowSettings?.(() => showSettings());
    window.electronAPI.commands.onToggleAppMode?.(() => cycleAppMode());
    window.electronAPI.commands.onSetAppModePersonal?.(() => setAppMode(APP_MODES.PERSONAL));
    window.electronAPI.commands.onSetAppModeDeveloper?.(() => setAppMode(APP_MODES.DEVELOPER));
    window.electronAPI.commands.onShowAbout?.(() => showAbout());
    window.electronAPI.commands.onExitApp?.(() => exitApp());
  }
});
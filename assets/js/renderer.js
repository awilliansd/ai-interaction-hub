// assets/js/renderer.js (ES module)
// Renderer passa a comandar o host de WebContentsView (processo principal).
// Não há mais <webview> no DOM; a UI cuida apenas de sidebar, modais, find bar e
// indicadores de carregamento/recuperação.
import { TAB_CONFIGS, TAB_BY_ID, APP_MODES, getTabsByMode } from "./tabs.config.js";

// Fallback apenas se init-settings não chegar; a fonte dos defaults é settingsManager.
const FALLBACK_SETTINGS = {
  minimizeToTray: false,
  keepTabsActive: false,
  appMode: APP_MODES.PERSONAL,
};

// --- Estado de runtime ---
let currentTabId = null;
let minimizeToTray = FALLBACK_SETTINGS.minimizeToTray;
let keepTabsActive = FALLBACK_SETTINGS.keepTabsActive;
let appMode = FALLBACK_SETTINGS.appMode;
let settingsReady = false;
let customTabs = [];
let accounts = [];

// --- Find in page ---
let findBarEl = null;
let findInputEl = null;
let findResultsEl = null;
let findActive = false;

// --- Toast de recuperação ---
let recoveryToastEl = null;
const WEBVIEW_RECOVERY_TOAST_MS = 4500;

// --- Indicadores da sidebar (spinner + badge de não lido) ---
const loadingTabs = new Set();
const unreadTabs = new Map();

function parseUnreadCount(title) {
  const match = /\((\d+)\)/.exec(title || "");
  return match ? parseInt(match[1], 10) : 0;
}

function refreshTabButton(tabId) {
  const btn = document.getElementById(`btn-${tabId}`);
  if (!btn) return;
  btn.classList.toggle("is-loading", loadingTabs.has(tabId));
  const count = unreadTabs.get(tabId) || 0;
  if (count > 0 && tabId !== currentTabId) {
    btn.dataset.badge = String(count);
  } else {
    delete btn.dataset.badge;
  }
}

// --- Helpers de config ---
// Lista unificada: abas base (tabs.config) + customizadas + contas extras,
// já filtradas pelo modo atual. Fonte de verdade para sidebar/atalhos/host.
function getAvailableTabs() {
  const base = getTabsByMode(appMode);
  const result = [];
  for (const tab of base) {
    result.push({ ...tab, kind: "base" });
    for (const acc of accounts) {
      if (acc.baseTabId !== tab.id) continue;
      result.push({
        id: acc.id,
        label: acc.label,
        url: tab.url,
        partition: acc.partition,
        icon: tab.icon,
        modes: tab.modes,
        userAgent: tab.userAgent,
        preload: tab.preload,
        kind: "account",
        baseTabId: tab.id,
      });
    }
  }
  for (const tab of customTabs) {
    if (!Array.isArray(tab.modes) || !tab.modes.includes(appMode)) continue;
    result.push({ ...tab, kind: "custom" });
  }
  return result;
}

function findAvailableTab(tabId) {
  return getAvailableTabs().find((t) => t.id === tabId) || null;
}

function tabLabel(id) {
  return findAvailableTab(id)?.label || (TAB_BY_ID[id] && TAB_BY_ID[id].label) || id;
}
function getAllowedTabs() { return getAvailableTabs(); }
function isTabAllowed(tabId) { return findAvailableTab(tabId) !== null; }

// User-Agent "limpo" para abas que pedem (ex: DeepSeek).
function getCleanChromeUserAgent() {
  return navigator.userAgent
    .replace(/\sElectron\/[^\s]+/i, "")
    .replace(/\sAI-Interaction-Hub\/[^\s]+/i, "");
}

// Constrói o descritor enviado ao webviewHost (main).
function buildHostTab(tabId) {
  const tab = findAvailableTab(tabId) || TAB_BY_ID[tabId];
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
  buildSidebar();
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

// --- Atalhos de troca de abas ---
// Ctrl+1..9 ativa a N-ésima aba do modo atual; Ctrl+Tab / Ctrl+Shift+Tab
// circular entre elas. O listener no host cobre a aba focada; o de keydown
// cobre o foco na UI (sidebar/modais).
function activateTabByNumber(n) {
  const tab = getAllowedTabs()[n - 1];
  if (tab) showTab(tab.id);
}

function cycleTab(forward) {
  const tabs = getAllowedTabs();
  if (tabs.length === 0) return;
  const idx = tabs.findIndex((t) => t.id === currentTabId);
  const next = forward
    ? (idx + 1) % tabs.length
    : (idx - 1 + tabs.length) % tabs.length;
  showTab(tabs[next].id);
}

function handleTabShortcutKey(e) {
  if ((!e.ctrlKey && !e.metaKey) || e.altKey) return false;
  if (/^[1-9]$/.test(e.key)) {
    e.preventDefault();
    activateTabByNumber(parseInt(e.key, 10));
    return true;
  }
  if (e.key === "Tab") {
    e.preventDefault();
    cycleTab(!e.shiftKey);
    return true;
  }
  return false;
}

// --- Sidebar dinâmica ---
function buildSidebar() {
  const container = document.getElementById("sidebar-top");
  if (!container) return;
  container.innerHTML = "";
  for (const tab of getAvailableTabs()) {
    const button = document.createElement("button");
    button.id = `btn-${tab.id}`;
    button.title = tab.kind === "account" ? `${tab.label} (conta extra)` : tab.label;
    button.addEventListener("click", () => showTab(tab.id));
    button.addEventListener("contextmenu", (event) => showTabContextMenu(event, tab.id, tab.kind));
    if (tab.icon) {
      const img = document.createElement("img");
      img.src = tab.icon;
      img.alt = tab.label;
      img.width = 32;
      img.height = 32;
      button.appendChild(img);
    } else {
      const letter = document.createElement("span");
      letter.className = `tab-letter${tab.kind === "account" ? " account-letter" : ""}`;
      letter.textContent = (tab.label || "?").charAt(0);
      button.appendChild(letter);
    }
    container.appendChild(button);
  }
  if (currentTabId) {
    const activeBtn = document.getElementById(`btn-${currentTabId}`);
    if (activeBtn) activeBtn.classList.add("active-button");
    for (const id of loadingTabs) refreshTabButton(id);
    for (const id of unreadTabs.keys()) refreshTabButton(id);
  }
}

// --- Menu de contexto das abas (nativo via Electron Menu) ---
function showTabContextMenu(event, tabId, kind = "base") {
  if (!isTabAllowed(tabId)) return;
  event.preventDefault();
  event.stopPropagation();
  document.body.setAttribute("data-current-tab", tabId);
  currentTabId = tabId;
  window.electronAPI?.tabs?.showContextMenu?.(tabId, event.x, event.y, kind);
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

// --- Persistência de customTabs/contas ---
async function persistTabData() {
  try {
    const current = await window.electronAPI?.settings?.get?.();
    if (!current) return;
    await window.electronAPI?.settings?.save?.({ ...current, customTabs, accounts });
  } catch (_e) {
    showWebviewRecoveryToast("Não foi possível salvar as configurações das abas.");
  }
}

// --- Editor de aba customizada ---
let editingCustomTabId = null;
let editorIcon = null;

function hideTabEditor() {
  const modal = document.getElementById("tab-editor-modal");
  if (modal) modal.style.display = "none";
  setOverlay(false);
}

function refreshIconPreview() {
  const img = document.getElementById("tab-icon-preview");
  const letter = document.getElementById("tab-icon-fallback");
  const label = document.getElementById("tab-label-input")?.value || "A";
  if (!img || !letter) return;
  if (editorIcon) {
    img.src = editorIcon;
    img.classList.remove("hidden");
    letter.classList.add("hidden");
  } else {
    img.classList.add("hidden");
    letter.textContent = label.charAt(0);
    letter.classList.remove("hidden");
  }
}

function openTabEditor(tabId = null) {
  const modal = document.getElementById("tab-editor-modal");
  if (!modal) return;
  editingCustomTabId = tabId;
  const existing = tabId ? customTabs.find((t) => t.id === tabId) : null;
  document.getElementById("tab-editor-title").textContent = existing ? "Editar aba" : "Adicionar aba";
  document.getElementById("tab-label-input").value = existing?.label || "";
  document.getElementById("tab-url-input").value = existing?.url || "";
  const modes = existing?.modes || [APP_MODES.PERSONAL];
  document.getElementById("tab-mode-personal").checked = modes.includes(APP_MODES.PERSONAL);
  document.getElementById("tab-mode-developer").checked = modes.includes(APP_MODES.DEVELOPER);
  editorIcon = existing?.icon || null;
  refreshIconPreview();
  modal.style.display = "flex";
  hideAllMenus();
  setOverlay(true);
}

function saveCustomTab() {
  const label = document.getElementById("tab-label-input")?.value?.trim();
  const url = document.getElementById("tab-url-input")?.value?.trim();
  const personal = document.getElementById("tab-mode-personal")?.checked;
  const developer = document.getElementById("tab-mode-developer")?.checked;
  if (!label || !url) {
    showWebviewRecoveryToast("Preencha nome e URL da aba.");
    return;
  }
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("protocolo");
  } catch (_e) {
    showWebviewRecoveryToast("URL inválida (use http:// ou https://).");
    return;
  }
  const modes = [];
  if (personal) modes.push(APP_MODES.PERSONAL);
  if (developer) modes.push(APP_MODES.DEVELOPER);
  if (modes.length === 0) modes.push(APP_MODES.PERSONAL);

  if (editingCustomTabId) {
    customTabs = customTabs.map((t) =>
      t.id === editingCustomTabId ? { ...t, label, url, modes, icon: editorIcon || undefined } : t
    );
  } else {
    const id = `custom-${Date.now().toString(36)}`;
    const entry = { id, label, url, modes, partition: `persist:${id}` };
    if (editorIcon) entry.icon = editorIcon;
    customTabs.push(entry);
  }
  persistTabData().then(() => {
    applyAppMode();
    hideTabEditor();
    if (!currentTabId || !isTabAllowed(currentTabId)) {
      const first = getAllowedTabs()[0];
      if (first) showTab(first.id);
    }
  });
}

async function pickTabIcon() {
  try {
    const dataUrl = await window.electronAPI?.tabs?.pickIcon?.();
    if (dataUrl) {
      editorIcon = dataUrl;
      refreshIconPreview();
    }
  } catch (_e) {
    showWebviewRecoveryToast("Não foi possível carregar o ícone.");
  }
}

function removeCustomTab(tabId) {
  const tab = customTabs.find((t) => t.id === tabId);
  if (!tab) return;
  if (!confirm(`Remover a aba "${tab.label}"? Os dados da sessão serão mantidos até a limpeza de cache.`)) return;
  customTabs = customTabs.filter((t) => t.id !== tabId);
  if (currentTabId === tabId) currentTabId = null;
  persistTabData().then(() => {
    applyAppMode();
    if (!currentTabId || !isTabAllowed(currentTabId)) {
      const first = getAllowedTabs()[0];
      if (first) showTab(first.id);
    }
  });
}

// --- Contas extras (multi-conta) ---
let promptResolve = null;

function hidePrompt() {
  const modal = document.getElementById("prompt-modal");
  if (modal) modal.style.display = "none";
  setOverlay(false);
  if (promptResolve) {
    const resolve = promptResolve;
    promptResolve = null;
    resolve(null);
  }
}

function showPrompt(title, hint, initialValue = "") {
  return new Promise((resolve) => {
    const modal = document.getElementById("prompt-modal");
    if (!modal) { resolve(null); return; }
    if (promptResolve) promptResolve(null);
    promptResolve = resolve;
    document.getElementById("prompt-title").textContent = title;
    document.getElementById("prompt-hint").textContent = hint || "";
    document.getElementById("prompt-input").value = initialValue;
    modal.style.display = "flex";
    setOverlay(true);
    setTimeout(() => document.getElementById("prompt-input")?.focus(), 50);
  });
}

function submitPrompt() {
  const value = document.getElementById("prompt-input")?.value?.trim() || "";
  const resolve = promptResolve;
  promptResolve = null;
  hidePrompt();
  if (resolve) resolve(value || null);
}

async function addAccount(baseTabId) {
  const base = TAB_BY_ID[baseTabId];
  if (!base) return;
  const name = await showPrompt(
    "Nova conta",
    `Conta extra para ${base.label} (partição de sessão própria).`
  );
  if (!name) return;
  const id = `acc-${baseTabId}-${Date.now().toString(36)}`;
  accounts.push({ id, baseTabId, label: name, partition: `persist:${id}` });
  await persistTabData();
  applyAppMode();
  showTab(id);
}

async function renameAccount(accountId) {
  const acc = accounts.find((a) => a.id === accountId);
  if (!acc) return;
  const name = await showPrompt("Renomear conta", "", acc.label);
  if (!name) return;
  acc.label = name;
  await persistTabData();
  applyAppMode();
}

function removeAccount(accountId) {
  const acc = accounts.find((a) => a.id === accountId);
  if (!acc) return;
  if (!confirm(`Remover a conta "${acc.label}"? A partição de sessão será apagada (você fará login novamente se recriar).`)) return;
  window.electronAPI?.tabs?.clearPartition?.(acc.partition);
  accounts = accounts.filter((a) => a.id !== accountId);
  if (currentTabId === accountId) currentTabId = null;
  persistTabData().then(() => {
    applyAppMode();
    if (!currentTabId || !isTabAllowed(currentTabId)) {
      const first = getAllowedTabs()[0];
      if (first) showTab(first.id);
    }
  });
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
    // Passa as partições de todas as abas (base + custom + contas) para o
    // main limpar os logins (persist:*) e não só a sessão padrão do sidebar.
    const partitions = Array.from(new Set([
      ...TAB_CONFIGS.map((t) => t.partition),
      ...customTabs.map((t) => t.partition),
      ...accounts.map((a) => a.partition),
    ].filter(Boolean)));
    window.electronAPI?.app?.clearCache?.(partitions);
  }
}

// --- Troca de abas (delegada ao host) ---
function showTab(tabId) {
  if (!isTabAllowed(tabId)) return;
  currentTabId = tabId;
  unreadTabs.delete(tabId);
  document.body.setAttribute("data-current-tab", tabId);
  updateWindowTitleForTab(tabId);
  const descriptor = buildHostTab(tabId);
  if (descriptor) window.electronAPI?.tabs?.show?.(descriptor);
  document.querySelectorAll("#sidebar button").forEach((btn) => btn.classList.remove("active-button"));
  const activeBtn = document.getElementById(`btn-${tabId}`);
  if (activeBtn) activeBtn.classList.add("active-button");
  refreshTabButton(tabId);
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
  if (settings && Array.isArray(settings.customTabs)) customTabs = settings.customTabs;
  if (settings && Array.isArray(settings.accounts)) accounts = settings.accounts;
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
    if (!settingsReady) initializeWithSettings(FALLBACK_SETTINGS);
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
      else if (which === "tab-editor") hideTabEditor();
      else if (which === "prompt") hidePrompt();
    });
  });

  // Botões da sidebar inferior
  document.getElementById("btn-app-mode")?.addEventListener("click", cycleAppMode);
  document.getElementById("btn-clear-cache")?.addEventListener("click", clearAppCache);
  document.getElementById("btn-settings")?.addEventListener("click", showSettings);
  document.getElementById("btn-add-tab")?.addEventListener("click", () => openTabEditor());

  // Editor de aba customizada
  document.getElementById("tab-editor-save")?.addEventListener("click", saveCustomTab);
  document.getElementById("tab-editor-cancel")?.addEventListener("click", hideTabEditor);
  document.getElementById("tab-icon-pick")?.addEventListener("click", pickTabIcon);
  document.getElementById("tab-icon-clear")?.addEventListener("click", () => {
    editorIcon = null;
    refreshIconPreview();
  });
  document.getElementById("tab-label-input")?.addEventListener("input", () => {
    if (!editorIcon) refreshIconPreview();
  });

  // Prompt (nome de conta)
  document.getElementById("prompt-ok")?.addEventListener("click", submitPrompt);
  document.getElementById("prompt-cancel")?.addEventListener("click", hidePrompt);
  document.getElementById("prompt-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitPrompt();
  });

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
    hideTabEditor();
    hidePrompt();
    setOverlay(false);
  });

  // Eventos do host (main -> renderer)
  window.electronAPI?.tabs?.onRecoveryToast?.((_id, message) => showWebviewRecoveryToast(message));
  window.electronAPI?.tabs?.onFound?.((_id, active, matches) => {
    if (findResultsEl) findResultsEl.textContent = `${active}/${matches}`;
  });
  window.electronAPI?.tabs?.onLoading?.((id, loading) => {
    if (loading) loadingTabs.add(id);
    else loadingTabs.delete(id);
    refreshTabButton(id);
  });
  window.electronAPI?.tabs?.onReady?.((id) => {
    loadingTabs.delete(id);
    refreshTabButton(id);
  });
  window.electronAPI?.tabs?.onTitleUpdated?.((id, title) => {
    const count = parseUnreadCount(title);
    if (count > 0) unreadTabs.set(id, count);
    else unreadTabs.delete(id);
    refreshTabButton(id);
  });

  // Atalhos de abas vindos do host (view focada)
  window.electronAPI?.commands?.onActivateTabN?.((n) => activateTabByNumber(n));
  window.electronAPI?.commands?.onCycleTab?.((forward) => cycleTab(forward));
  document.addEventListener("keydown", handleTabShortcutKey);

  // Comandos do menu principal
  if (window.electronAPI.commands) {
    window.electronAPI.commands.onReloadActiveTab?.(() => reloadCurrentTab());
    window.electronAPI.commands.onFindInActiveTab?.(() => openFindBar());
    window.electronAPI.commands.onShowSettings?.(() => showSettings());
    window.electronAPI.commands.onToggleAppMode?.(() => cycleAppMode());
    window.electronAPI.commands.onSetAppModePersonal?.(() => setAppMode(APP_MODES.PERSONAL));
    window.electronAPI.commands.onSetAppModeDeveloper?.(() => setAppMode(APP_MODES.DEVELOPER));
    window.electronAPI.commands.onShowAbout?.(() => showAbout());
    window.electronAPI.commands.onExitApp?.(() => exitApp());
    window.electronAPI.commands.onClearAppCache?.(() => clearAppCache());
    window.electronAPI.commands.onEditCustomTab?.((tabId) => openTabEditor(tabId));
    window.electronAPI.commands.onRemoveCustomTab?.((tabId) => removeCustomTab(tabId));
    window.electronAPI.commands.onAddAccount?.((baseTabId) => addAccount(baseTabId));
    window.electronAPI.commands.onRenameAccount?.((accountId) => renameAccount(accountId));
    window.electronAPI.commands.onRemoveAccount?.((accountId) => removeAccount(accountId));
  }
});
// modules/webviewHost.js
// Hospeda cada IA em uma WebContentsView anexada à janela principal,
// substituindo o uso do <webview>. Centraliza resiliência (retry/watchdog/recreate),
// layout, find-in-page, troca/desconstrução de abas e permissões por sessão.
const { WebContentsView, Menu, MenuItem, session, app } = require("electron");
const path = require("path");
const log = require("electron-log");
const Channels = require("./ipc-channels");

const SIDEBAR_WIDTH = 60;

// Cabeçalho Accept-Language enviado às sessões das abas de IA (fonte única,
// reutilizado no interceptor do session.defaultSession em main.js).
const ACCEPT_LANGUAGE_PT_BR = "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7";

// Sessões cujo interceptor de Accept-Language já foi registrado (evita duplo
// registro ao recriar views, já que session.fromPartition é cacheado).
const configuredSessions = new Set();

// Permissões permitidas por IA (allowlist).
const ALLOWED_IA_PERMISSIONS = new Set([
  "clipboard-read",
  "clipboard-sanitized-write",
  "notifications",
  "fullscreen",
  "media",
  "display-capture",
]);

// Resiliência
const MAX_AUTO_RETRIES = 3;
const MAX_AUTO_RECREATES = 1;
const LOAD_WATCHDOG_MS = 75000;

let win = null;
let tabs = new Map(); // tabId -> { view, config, retryState, recreateState, watchdog, findActive }
let activeTabId = null;
let overlayActive = false; // true quando um modal/find bar pediu para esconder a IA ativa

function initializeHost(mainWindow) {
  win = mainWindow;

  win.on("resize", () => {
    for (const [tabId, tab] of tabs) {
      if (tab.view.getVisible()) layoutView(tab.view);
      else if (tabId === activeTabId && !overlayActive) layoutView(tab.view);
    }
  });

  win.on("closed", () => {
    destroyAllTabs();
    win = null;
  });
}

function layoutView(view) {
  const bounds = win.getContentBounds();
  view.setBounds({
    x: SIDEBAR_WIDTH,
    y: 0,
    width: Math.max(0, bounds.width - SIDEBAR_WIDTH),
    height: bounds.height,
  });
}

function sendToRenderer(channel, ...args) {
  if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
    win.webContents.send(channel, ...args);
  }
}

// --- Sessão por IA ---
function getSessionFor(partition) {
  return session.fromPartition(partition);
}

function configureSessionPermissions(ses, tabId) {
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ALLOWED_IA_PERMISSIONS.has(permission);
    if (!allowed) log.warn(`[security] Permissão negada para IA '${tabId}': ${permission}`);
    callback(allowed);
  });

  // Injeta o Accept-Language em pt-BR nas requisições da sessão. Sem isso, as
  // partições das abas (ex: persist:kimi) ignoram o idioma e carregam o padrão
  // do site (Kimi abre em chinês).
  if (!configuredSessions.has(ses)) {
    configuredSessions.add(ses);
    ses.webRequest.onBeforeSendHeaders((details, callback) => {
      details.requestHeaders["Accept-Language"] = ACCEPT_LANGUAGE_PT_BR;
      callback({ requestHeaders: details.requestHeaders });
    });
  }
}

// --- Resiliência ---
function clearWatchdog(tab) {
  if (!tab.watchdog) return;
  clearTimeout(tab.watchdog);
  tab.watchdog = null;
}
function startWatchdog(tab) {
  clearWatchdog(tab);
  tab.watchdog = setTimeout(() => {
    if (tab.view.webContents.isLoading()) {
      attemptRecreate(tab.config.id, "watchdog-timeout");
    }
  }, LOAD_WATCHDOG_MS);
}
function resetRetryState(tab) {
  tab.retryState = 0;
  tab.recreateState = 0;
}

function scheduleRetry(tab, reason) {
  const tabId = tab.config.id;
  if (tab.retryState >= MAX_AUTO_RETRIES) {
    const shouldRecreate = reason.includes("render-process-gone") || reason.includes("watchdog-timeout");
    if (shouldRecreate) {
      log.warn(`[${tabId}] retry limit reached after ${reason}; attempting recreate.`);
      attemptRecreate(tabId, `retry-limit (${reason})`);
    } else {
      log.warn(`[${tabId}] retry limit reached after ${reason}.`);
      sendToRenderer(Channels.TAB_RECOVERY_TOAST, tabId, `${tab.config.label || tabId}: conexão instável. Tente recarregar a aba.`);
    }
    return;
  }
  tab.retryState += 1;
  const delay = Math.min(8000, 1000 * Math.pow(2, tab.retryState - 1));
  log.warn(`[${tabId}] scheduling retry #${tab.retryState} in ${delay}ms due to ${reason}.`);
  setTimeout(() => {
    if (!win || win.isDestroyed()) return;
    const wc = tab.view.webContents;
    if (wc.isDestroyed()) return;
    if (tabId !== activeTabId) return; // só recarrega se ainda for a aba ativa
    try { wc.reloadIgnoringCache(); } catch (_e) { wc.reload(); }
  }, delay);
}

function attemptRecreate(tabId, reason) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  if (tab.recreateState >= MAX_AUTO_RECREATES) {
    log.warn(`[${tabId}] recreate limit reached after ${reason}.`);
    return;
  }
  tab.recreateState += 1;
  tab.retryState = 0;
  clearWatchdog(tab);

  const wasVisible = tab.view.getVisible();
  const oldView = tab.view;
  const oldWc = oldView.webContents;

  // Cria nova view substituta
  const config = tab.config;
  const newView = createViewForConfig(config);
  attachListeners(tab, newView.webContents, config);
  win.contentView.addChildView(newView);
  layoutView(newView);
  newView.setVisible(wasVisible && !overlayActive);
  tab.view = newView;

  // Destrói a antiga
  oldView.setVisible(false);
  win.contentView.removeChildView(oldView);
  if (!oldWc.isDestroyed()) oldWc.close();

  log.warn(`[${tabId}] webview recreated due to ${reason}.`);
  sendToRenderer(Channels.TAB_RECOVERY_TOAST, tabId, `${config.label || tabId}: sessão reiniciada para recuperação.`);
  newView.webContents.loadURL(config.url);
}

// --- Listeners ---
function attachListeners(tab, wc, config) {
  const tabId = config.id;

  wc.on("did-start-loading", () => {
    startWatchdog(tab);
    sendToRenderer(Channels.TAB_LOADING, tabId, true);
  });
  wc.on("did-stop-loading", () => {
    clearWatchdog(tab);
    sendToRenderer(Channels.TAB_LOADING, tabId, false);
  });
  wc.on("dom-ready", () => {
    try { wc.session.setSpellCheckerLanguages(["pt-BR"]); } catch (_e) {}
    try { wc.session.setSpellCheckerEnabled(true); } catch (_e) {}
    resetRetryState(tab);
    sendToRenderer(Channels.TAB_READY, tabId);
  });
  wc.on("did-fail-load", (_e, errorCode, _desc, _url, isMainFrame) => {
    if (errorCode === -3) return; // ERR_ABORTED
    if (!isMainFrame) return;
    clearWatchdog(tab);
    sendToRenderer(Channels.TAB_RECOVERY_TOAST, tabId, `${config.label || tabId}: falha de carregamento, tentando recuperar...`);
    scheduleRetry(tab, `did-fail-load (${errorCode})`);
  });
  wc.on("render-process-gone", (_e, details) => {
    clearWatchdog(tab);
    const reason = details?.reason ? details.reason : "unknown";
    sendToRenderer(Channels.TAB_RECOVERY_TOAST, tabId, `${config.label || tabId}: processo da aba reiniciado (${reason}).`);
    scheduleRetry(tab, `render-process-gone (${reason})`);
  });
  wc.on("unresponsive", () => {
    clearWatchdog(tab);
    sendToRenderer(Channels.TAB_RECOVERY_TOAST, tabId, `${config.label || tabId}: aba sem resposta, tentando recuperar...`);
    scheduleRetry(tab, "unresponsive");
  });
  wc.on("context-menu", (_e, params) => {
    const menu = new Menu();
    if (params.misspelledWord) {
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(new MenuItem({
          label: suggestion,
          click: () => wc.replaceMisspelling(suggestion),
        }));
      }
      if (params.dictionarySuggestions.length > 0) {
        menu.append(new MenuItem({ type: "separator" }));
      }
      menu.append(new MenuItem({
        label: "Adicionar ao dicionário",
        click: () => wc.session.addWordToSpellCheckerDictionary(params.misspelledWord),
      }));
      menu.append(new MenuItem({ type: "separator" }));
    }
    if (params.isEditable) {
      if (params.selectionText) {
        menu.append(new MenuItem({ role: "copy", label: "Copiar" }));
        menu.append(new MenuItem({ role: "cut", label: "Recortar" }));
      }
      menu.append(new MenuItem({ role: "paste", label: "Colar" }));
      menu.append(new MenuItem({ type: "separator" }));
    }
    if (params.selectionText) {
      menu.append(new MenuItem({ role: "copy", label: "Copiar" }));
      menu.append(new MenuItem({ type: "separator" }));
    }
    menu.append(new MenuItem({ role: "selectAll", label: "Selecionar tudo" }));
    menu.popup();
  });
  wc.on("found-in-page", (_e, result) => {
    if (!tab.findActive) return;
    const active = result?.activeMatchOrdinal ?? 0;
    const matches = result?.matches ?? 0;
    sendToRenderer(Channels.TAB_FOUND, tabId, active, matches);
  });
}

// --- View factory ---
function createViewForConfig(config) {
  const webPreferences = {
    contextIsolation: true,
    sandbox: true,
    spellcheck: true,
  };
  if (config.partition) {
    webPreferences.partition = config.partition;
  }
  if (config.preload) {
    // Preload paths chegam relativos ao root do app; resolve para absoluto.
    webPreferences.preload = path.isAbsolute(config.preload)
      ? config.preload
      : path.join(app.getAppPath(), config.preload);
  }
  const ses = session.fromPartition(config.partition || "default");
  configureSessionPermissions(ses, config.id);
  const view = new WebContentsView({ webPreferences });
  if (config.userAgent) {
    view.webContents.setUserAgent(config.userAgent);
  }
  return view;
}

// --- API pública (chamada via IPC do renderer) ---
function showTab(payload) {
  if (!win || win.isDestroyed()) return;
  const config = normalizeConfig(payload);
  let tab = tabs.get(config.id);
  if (!tab) {
    tab = {
      view: null,
      config,
      retryState: 0,
      recreateState: 0,
      watchdog: null,
      findActive: false,
    };
    tabs.set(config.id, tab);
    tab.view = createViewForConfig(config);
    attachListeners(tab, tab.view.webContents, config);
    win.contentView.addChildView(tab.view);
    layoutView(tab.view);
    tab.view.webContents.loadURL(config.url);
  }

  // Esconde as outras abas
  for (const [id, t] of tabs) {
    if (id !== config.id) {
      t.view.setVisible(false);
    }
  }
  activeTabId = config.id;
  tab.view.setVisible(!overlayActive);
  layoutView(tab.view);
  // Re-adiciona para trazer ao topo
  win.contentView.addChildView(tab.view);
}

function normalizeConfig(payload) {
  if (!payload || !payload.id || !payload.url) {
    throw new Error("webviewHost.showTab: payload inválido (id e url são obrigatórios).");
  }
  const config = {
    id: payload.id,
    url: payload.url,
    label: payload.label || payload.id,
    partition: payload.partition || `persist:${payload.id}`,
  };
  if (payload.preload) config.preload = payload.preload;
  if (payload.userAgent) config.userAgent = payload.userAgent;
  return config;
}

function reloadTab(payload) {
  const tab = tabs.get(payload?.id);
  if (!tab || tab.view.webContents.isDestroyed()) return;
  try { tab.view.webContents.reloadIgnoringCache(); } catch (_e) { tab.view.webContents.reload(); }
}

function recreateTab(payload) {
  attemptRecreate(payload?.id, "manual-recreate");
}

function destroyTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  clearWatchdog(tab);
  try { win.contentView.removeChildView(tab.view); } catch (_e) {}
  const wc = tab.view.webContents;
  if (!wc.isDestroyed()) wc.close();
  tabs.delete(tabId);
  if (activeTabId === tabId) activeTabId = null;
}

function destroyAllTabs() {
  for (const id of Array.from(tabs.keys())) destroyTab(id);
}

function setOverlay(active) {
  overlayActive = !!active;
  if (activeTabId) {
    const tab = tabs.get(activeTabId);
    if (tab && !tab.view.webContents.isDestroyed()) {
      tab.view.setVisible(!overlayActive);
    }
  }
}

// --- Find in Page ---
function findOpen(payload) {
  const tab = tabs.get(payload?.id);
  if (tab) tab.findActive = true;
}

function findInput(payload) {
  const tab = tabs.get(payload?.id);
  if (!tab || tab.view.webContents.isDestroyed()) return;
  tab.findActive = true;
  const query = payload?.query || "";
  if (!query) {
    try { tab.view.webContents.stopFindInPage("clearSelection"); } catch (_e) {}
    sendToRenderer(Channels.TAB_FOUND, payload.id, 0, 0);
    return;
  }
  try { tab.view.webContents.findInPage(query, { forward: true, findNext: false }); } catch (_e) {}
}

function findNext(payload) {
  const tab = tabs.get(payload?.id);
  if (!tab || tab.view.webContents.isDestroyed()) return;
  const query = payload?.query || "";
  if (!query) return;
  tab.findActive = true;
  try {
    tab.view.webContents.findInPage(query, { forward: payload?.forward !== false, findNext: true });
  } catch (_e) {}
}

function findClose(payload) {
  const tab = tabs.get(payload?.id);
  if (!tab) return;
  tab.findActive = false;
  if (!tab.view.webContents.isDestroyed()) {
    try { tab.view.webContents.stopFindInPage("clearSelection"); } catch (_e) {}
  }
  if (payload?.id) sendToRenderer(Channels.TAB_FOUND, payload.id, 0, 0);
}

function clearTabCache(payload) {
  const tab = tabs.get(payload?.id);
  if (!tab) return;
  (async () => {
    try {
      const ses = tab.config.partition ? session.fromPartition(tab.config.partition) : tab.view.webContents.session;
      await ses.clearCache();
      await ses.clearStorageData({
        storages: ["cookies", "filesystem", "indexdb", "localstorage", "shadercache", "websql", "serviceworkers", "cachestorage"],
      });
      if (!tab.view.webContents.isDestroyed()) tab.view.webContents.reload();
    } catch (error) {
      log.error(`[webviewHost] Erro ao limpar cache da aba '${payload?.id}':`, error);
    }
  })();
}

module.exports = {
  ACCEPT_LANGUAGE_PT_BR,
  initializeHost,
  showTab,
  reloadTab,
  recreateTab,
  destroyTab,
  destroyAllTabs,
  setOverlay,
  findOpen,
  findInput,
  findNext,
  findClose,
  clearTabCache,
};
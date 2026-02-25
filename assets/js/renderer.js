// Configuração das abas
const tabConfigs = {
  gemini: { url: "https://gemini.google.com/app", partition: "persist:gemini" },
  chatgpt: { url: "https://chat.openai.com", partition: "persist:chatgpt" },
  claude: { url: "https://claude.ai", partition: "persist:claude" },
  deepseek: { url: "https://chat.deepseek.com", partition: "persist:deepseek" },
  grok: { url: "https://grok.com", partition: "persist:grok" },
  manus: { url: "https://manus.im/app", partition: "persist:manus" },
  copilot: { url: "https://copilot.microsoft.com", partition: "persist:copilot" },
  metaai: { url: "https://www.meta.ai", partition: "persist:metaai" },
  perplexity: { url: "https://www.perplexity.ai", partition: "persist:perplexity" },
  kimi: { url: "https://www.kimi.com/", partition: "persist:kimi" },
  zai: { url: "https://chat.z.ai/", partition: "persist:zai" },
};

let activeWebview = null;
let currentTabId = null;
let keepTabsActive = localStorage.getItem("keepTabsActive") === "true";
let minimizeToTray = localStorage.getItem("minimizeToTray") === "true";

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

function showTabContextMenu(event, tabId) {
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
  
  // Caminho absoluto para o script de preload de mascaramento
  // Usamos o script que já criamos anteriormente
  const preloadPath = `file://${window.location.pathname.split('/').slice(0, -2).join('/')}/js/webview-preload.js`;
  webview.setAttribute("preload", "./assets/js/webview-preload.js");
  
  attachWebviewListeners(webview);
  return webview;
}

function getActiveWebview() {
  return activeWebview;
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
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

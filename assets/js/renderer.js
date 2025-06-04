// Estado das configurações
let minimizeToTray = false;
const savedMinimizeToTray = localStorage.getItem("minimizeToTray");
minimizeToTray = savedMinimizeToTray === "false";

// Estado da busca
let lastSearchTerm = "";
let activeSearch = false;

// Funções do menu (HTML)
function toggleMenu(menuId) {
  document.querySelectorAll(".dropdown-menu").forEach(menu => {
    if (menu.id !== menuId + "-menu") {
      menu.classList.remove("show");
    }
  });
  const menu = document.getElementById(menuId + "-menu");
  if (menu) {
    menu.classList.toggle("show");
  }
}

function exitApp() {
  window.electronAPI.app.exit();
}

function openGitHub() {
  window.electronAPI.links.openGitHub();
}

function showAbout() {
  const modal = document.getElementById("about-modal");
  if (modal) {
    modal.style.display = "block";
  }
  hideAllMenus();
}

function hideAbout() {
  const modal = document.getElementById("about-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

// Funções de configurações
function showSettings() {
  const modal = document.getElementById("settings-modal");
  if (modal) {
    modal.style.display = "block";
    const checkbox = document.getElementById("minimize-to-tray");
    if(checkbox) checkbox.checked = minimizeToTray;
  }
  hideAllMenus();
}

function hideSettings() {
  const modal = document.getElementById("settings-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

function toggleMinimizeToTray() {
  const checkbox = document.getElementById("minimize-to-tray");
  minimizeToTray = checkbox.checked;
  localStorage.setItem("minimizeToTray", minimizeToTray.toString());
  window.electronAPI.settings.setMinimizeToTray(minimizeToTray);
}

// Funções de contexto das abas (HTML)
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
  document.querySelectorAll(".dropdown-menu").forEach(menu => {
    menu.classList.remove("show");
  });
}

// Funções de gerenciamento de abas
function showTab(tabId) {
  document.querySelectorAll("webview").forEach(w => w.classList.remove("active"));
  const activeWebview = document.getElementById(tabId);
  if (activeWebview) {
    activeWebview.classList.add("active");
    document.body.setAttribute("data-current-tab", tabId);
    console.log(`[Renderer] Switched to tab: ${tabId}`);
  } else {
    console.warn(`[Renderer] Webview not found for tab ID: ${tabId}`);
  }

  document.querySelectorAll("#sidebar button").forEach(btn => btn.classList.remove("active-button"));
  const activeBtn = document.getElementById(`btn-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add("active-button");
  }
}

// Função para obter a webview ativa
function getActiveWebview() {
  const currentTabId = document.body.getAttribute("data-current-tab");
  if (currentTabId) {
    const webview = document.getElementById(currentTabId);
    if (webview) {
      return webview;
    } else {
      console.error(`[Renderer] Active webview element not found for ID: ${currentTabId}`);
    }
  } else {
    console.warn("[Renderer] No current tab ID found in body attribute.");
  }
  return null;
}

// --- Funções de Busca na Página ---

// Mostrar a barra de busca
function showFindBar() {
  const findBar = document.getElementById("find-in-page-bar");
  if (findBar) {
    findBar.style.display = "block";
    const findInput = document.getElementById("find-input");
    if (findInput) {
      findInput.value = lastSearchTerm;
      findInput.focus();
      findInput.select();
    }
  }
}

// Esconder a barra de busca
function hideFindBar() {
  const findBar = document.getElementById("find-in-page-bar");
  if (findBar) {
    findBar.style.display = "none";
    
    // Se houver uma busca ativa, limpar
    if (activeSearch) {
      stopFindInPage();
    }
  }
}

// Iniciar busca na webview ativa
function startFindInPage(searchTerm) {
  const webview = getActiveWebview();
  if (!webview) return;
  
  if (searchTerm && searchTerm.trim() !== "") {
    console.log(`[Renderer] Starting find in page with term: "${searchTerm}"`);
    lastSearchTerm = searchTerm;
    activeSearch = true;
    webview.findInPage(searchTerm);
  }
}

// Continuar busca (próxima ocorrência)
function findNext() {
  const webview = getActiveWebview();
  if (!webview || !activeSearch) return;
  
  console.log(`[Renderer] Finding next occurrence of: "${lastSearchTerm}"`);
  webview.findInPage(lastSearchTerm, { forward: true });
}

// Continuar busca (ocorrência anterior)
function findPrevious() {
  const webview = getActiveWebview();
  if (!webview || !activeSearch) return;
  
  console.log(`[Renderer] Finding previous occurrence of: "${lastSearchTerm}"`);
  webview.findInPage(lastSearchTerm, { forward: false });
}

// Parar busca
function stopFindInPage() {
  const webview = getActiveWebview();
  if (!webview) return;
  
  console.log(`[Renderer] Stopping find in page`);
  webview.stopFindInPage("clearSelection");
  activeSearch = false;
}

// Atualizar contador de resultados
function updateFindResults(activeMatchOrdinal, matches) {
  const resultsElement = document.getElementById("find-results");
  if (resultsElement) {
    resultsElement.textContent = matches > 0 ? `${activeMatchOrdinal}/${matches}` : "0/0";
  }
}

// --- Handlers para Comandos do Menu (via IPC) ---

// Ação: Recarregar a webview ativa (chamada via IPC)
function handleReloadActiveTab() {
  console.log("[Renderer] Received command: reload-active-tab");
  const webview = getActiveWebview();
  if (webview) {
    console.log("[Renderer] Calling webview.reload()");
    webview.reload();
  }
}

// Ação: Iniciar busca na webview ativa (chamada via IPC)
function handleFindInActiveTab() {
  console.log("[Renderer] Received command: find-in-active-tab");
  showFindBar();
}

// Ação: Parar busca na webview ativa (chamada via IPC)
function handleStopFindInActiveTab() {
  console.log("[Renderer] Received command: stop-find-in-active-tab");
  hideFindBar();
}

// --- Eventos Globais ---
document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu-item")) {
    hideAllMenus();
  }
  if (!e.target.closest("#tab-context-menu")) {
    hideTabContextMenu();
  }
  if (e.target.classList.contains("modal")) {
    hideAbout();
    hideSettings();
  }
});

// --- Inicialização --- 
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Renderer] DOMContentLoaded event fired.");
  const menu = document.querySelector(".menu");
  const versionSpan = document.getElementById("app-version");

  // Busca a versão da aplicação
  if (versionSpan && window.electronAPI?.app?.getVersion) {
    try {
      const version = await window.electronAPI.app.getVersion();
      versionSpan.innerText = version ? `v${version}` : "N/A";
      console.log(`[Renderer] App version set to: ${versionSpan.innerText}`);
    } catch (error) {
      console.error("Erro ao buscar versão:", error);
      versionSpan.innerText = "Erro";
    }
  }

  // Carrega estado inicial do 'minimizeToTray'
  const savedMinimizeState = localStorage.getItem("minimizeToTray");
  minimizeToTray = savedMinimizeState === "true";
  const minimizeCheckbox = document.getElementById("minimize-to-tray");
  if (minimizeCheckbox) {
    minimizeCheckbox.checked = minimizeToTray;
    console.log(`[Renderer] Initial minimizeToTray state set from localStorage: ${minimizeToTray}`);
  }

  // Acessibilidade
  if (menu) {
    menu.setAttribute("role", "menubar");
  }

  // Mostra a primeira aba
  const firstTabButton = document.querySelector("#sidebar .sidebar-top button");
  if (firstTabButton) {
      const firstTabId = firstTabButton.id.replace("btn-", "");
      console.log(`[Renderer] Showing initial tab: ${firstTabId}`);
      showTab(firstTabId);
  } else {
      console.warn("[Renderer] No initial tab found.");
  }

  // --- Configura Listeners para Comandos do Menu (via Preload) ---
  if (window.electronAPI && window.electronAPI.commands) {
    console.log("[Renderer] Setting up command listeners...");
    window.electronAPI.commands.onReloadActiveTab(handleReloadActiveTab);
    window.electronAPI.commands.onFindInActiveTab(handleFindInActiveTab);
    window.electronAPI.commands.onStopFindInActiveTab(handleStopFindInActiveTab);
    console.log("[Renderer] Command listeners set up.");
  } else {
    console.error("[Renderer] electronAPI.commands not found! Preload script might have failed.");
  }

  // --- Configura Listeners para a Barra de Busca ---
  const findInput = document.getElementById("find-input");
  const findNextBtn = document.getElementById("find-next-btn");
  const findPrevBtn = document.getElementById("find-prev-btn");
  const closeFindBarBtn = document.getElementById("close-find-bar-btn");

  if (findInput) {
    findInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        startFindInPage(findInput.value);
      } else if (e.key === "Escape") {
        hideFindBar();
      }
    });
    
    findInput.addEventListener("input", () => {
      if (findInput.value.trim() !== "") {
        startFindInPage(findInput.value);
      }
    });
  }

  if (findNextBtn) {
    findNextBtn.addEventListener("click", findNext);
  }

  if (findPrevBtn) {
    findPrevBtn.addEventListener("click", findPrevious);
  }

  if (closeFindBarBtn) {
    closeFindBarBtn.addEventListener("click", hideFindBar);
  }

  // --- Configura Listeners para Eventos de Busca na Webview ---
  document.querySelectorAll("webview").forEach(webview => {
    webview.addEventListener("found-in-page", (e) => {
      const { activeMatchOrdinal, matches } = e.result;
      console.log(`[Renderer] Found in page: match ${activeMatchOrdinal} of ${matches}`);
      updateFindResults(activeMatchOrdinal, matches);
    });
  });
});

// Recebe configurações iniciais do processo principal
window.electronAPI.settings.onInit((settings) => {
  console.log("[Renderer] Initial settings received from main process:", settings);
  minimizeToTray = settings.minimizeToTray ?? false;
  const checkbox = document.getElementById("minimize-to-tray");
  if (checkbox) {
    checkbox.checked = minimizeToTray;
    localStorage.setItem("minimizeToTray", minimizeToTray.toString());
    console.log(`[Renderer] minimizeToTray checkbox updated from main process settings: ${minimizeToTray}`);
  }
});
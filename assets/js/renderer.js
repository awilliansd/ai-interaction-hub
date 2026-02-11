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
};

// Mapa para rastrear as webviews ativas (apenas a ativa estará aqui)
let activeWebview = null;
let currentTabId = null;
let keepTabsActive = localStorage.getItem("keepTabsActive") === "true"; // Inicializa com valor do localStorage

// Estado da busca

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

function getCurrentYear() {
  return new Date().getFullYear();
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
    const minimizeCheckbox = document.getElementById("minimize-to-tray");
    if (minimizeCheckbox) minimizeCheckbox.checked = minimizeToTray;
    const keepActiveCheckbox = document.getElementById("keep-tabs-active");
    if (keepActiveCheckbox) keepActiveCheckbox.checked = keepTabsActive;
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

function toggleKeepTabsActive() {
  const checkbox = document.getElementById("keep-tabs-active");
  keepTabsActive = checkbox.checked;
  localStorage.setItem("keepTabsActive", keepTabsActive.toString());
  window.electronAPI.settings.setKeepTabsActive(keepTabsActive);
  // Recarrega a aplicação para aplicar a mudança de modo
  window.location.reload();
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

// Função para recarregar a aba atual (usada pelo menu de contexto)
function reloadCurrentTab() {
  const webview = getActiveWebview();
  if (webview) {
    console.log("[Renderer] Reloading current tab via context menu");
    webview.reload();
    hideTabContextMenu(); // Esconde o menu de contexto após a ação
  }
}

function clearAppCache() {
  if (confirm("Isso irá limpar todo o cache e dados de navegação (incluindo logins) e reiniciar a aplicação. Deseja continuar?")) {
    window.electronAPI.app.clearCache();
  }
}

function handleReloadActiveTab() {
  reloadCurrentTab();
}

// Funções de gerenciamento de abas

// Função para anexar todos os listeners necessários a uma nova webview
function attachWebviewListeners(webview) {
  // Listener para resultados de busca
  webview.addEventListener("found-in-page", (e) => {
    const { activeMatchOrdinal, matches } = e.result;
    console.log(`[Renderer] Found in page: match ${activeMatchOrdinal} of ${matches}`);
    updateFindResults(activeMatchOrdinal, matches);
  });

  // Listeners para fechar menus ao interagir com webviews
  const hideMenus = () => {
    console.log("[Renderer] Webview interaction - hiding menus");
    hideAllMenus();
    hideTabContextMenu();
  };

  webview.addEventListener("focus", hideMenus);
  webview.addEventListener("mousedown", hideMenus);

  // Captura quando o webview começa a ser usado
  webview.addEventListener("dom-ready", () => {
    // Adiciona um listener para eventos dentro do webview
    webview.addEventListener("ipc-message", (event) => {
      if (event.channel === "webview-clicked") {
        hideMenus();
      }
    });

    // Injeta script para capturar cliques dentro do webview
    webview.executeJavaScript(`
      document.addEventListener('click', () => {
        if (window.ipcRenderer) {
          window.ipcRenderer.sendToHost('webview-clicked');
        }
      });
      true; // Retorno necessário para executeJavaScript
    `).catch(err => {
      console.warn("[Renderer] Failed to inject click listener into webview:", err);
    });
  });
}

function showTab(tabId) {
  if (currentTabId === tabId) {
    console.log(`[Renderer] Tab ${tabId} already active.`);
    return;
  }

  // 1. Esconder a webview ativa atual (se houver)
  if (currentTabId) {
    const prevWebview = document.getElementById(currentTabId);
    if (prevWebview) {
      prevWebview.classList.remove("active");
    }
  }

  // 2. Atualizar o estado da aba
  currentTabId = tabId;
  document.body.setAttribute("data-current-tab", tabId);

  // 3. Lógica de Alternância
  if (keepTabsActive) {
    // Modo de Alta Performance (Webviews Estáticas)
    const nextWebview = document.getElementById(tabId);
    if (nextWebview) {
      nextWebview.classList.add("active");
      activeWebview = nextWebview;
      console.log(`[Renderer] Switched to static tab: ${tabId}`);
    } else {
      console.error(`[Renderer] Static webview element not found for ID: ${tabId}`);
    }
  } else {
    // Modo Otimizado (Webviews Dinâmicas - Criação/Destruição)

    // Destruir a webview ativa atual (se houver)
    if (activeWebview) {
      console.log(`[Renderer] Destroying previous webview: ${currentTabId}`);
      activeWebview.remove();
      activeWebview = null;
    }

    // Criar a nova webview
    const config = tabConfigs[tabId];
    if (!config) {
      console.warn(`[Renderer] Configuration not found for tab ID: ${tabId}`);
      return;
    }

    const webview = document.createElement("webview");
    webview.id = tabId;
    webview.src = config.url;
    webview.partition = config.partition;
    webview.setAttribute("allowpopups", "");
    webview.classList.add("active");

    // Anexar listeners
    attachWebviewListeners(webview);

    // Tratamento de falhas de carregamento e erros de rede
    webview.addEventListener('did-fail-load', (e) => {
      console.error(`[Renderer] Webview ${tabId} failed to load:`, e.errorCode, e.errorDescription);
      // Erros comuns: -105 (DNS), -106 (Internet), -3 (Cancelado)
      if (tabId === 'gemini' && ![ -3, -105, -106 ].includes(e.errorCode)) {
        console.log("[Renderer] Attempting to recover Gemini from load failure...");
        setTimeout(() => webview.reload(), 3000);
      }
    });

    // Capturar erros de console que podem indicar o erro "Algo deu errado"
    webview.addEventListener('console-message', (e) => {
      if (tabId === 'gemini' && e.message.includes('Something went wrong')) {
        console.warn("[Renderer] Gemini reported internal error. Refreshing...");
        setTimeout(() => webview.reload(), 1000);
      }
    });

    // Configurações de segurança e contexto de menu (anteriormente no main.js)
    webview.addEventListener('dom-ready', () => {
      // Habilitar verificação ortográfica
      webview.setSpellCheckerLanguages(['pt-BR']);
      webview.setSpellCheckerEnabled(true);

      // Configurar User-Agent personalizado APENAS para Grok
      webview.addEventListener('did-start-navigation', (_event, url) => {
        if (url.includes('grok.com') || url.includes('x.ai')) {
          // Acessar o processo principal via IPC para obter o user-agent
          window.electronAPI.app.getGrokUserAgent().then(grokUserAgent => {
            webview.setUserAgent(grokUserAgent);
            console.log(`[Renderer] User-Agent personalizado aplicado para Grok: ${url}`);
          });
        }
      });

      // Configurar menu de contexto para webviews
      webview.addEventListener('context-menu', (_event, params) => {
        // O menu de contexto precisa ser criado no processo principal
        // Vamos enviar um IPC para o processo principal para mostrar o menu
        window.electronAPI.app.showWebviewContextMenu(params);
      });
    });

    // Adicionar ao DOM
    const container = document.getElementById("webview-container");
    if (container) {
      container.appendChild(webview);
      activeWebview = webview;
      console.log(`[Renderer] Created and switched to dynamic tab: ${tabId}`);
    } else {
      console.error("[Renderer] Webview container not found.");
      return;
    }
  }

  // 4. Atualizar botões da barra lateral
  document.querySelectorAll("#sidebar button").forEach(btn => btn.classList.remove("active-button"));
  const activeBtn = document.getElementById(`btn-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add("active-button");
  }
}

// Função para obter a webview ativa
// Função para obter a webview ativa
function getActiveWebview() {
  if (keepTabsActive) {
    // Modo de Alta Performance: Webviews estáticas no DOM
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
  } else {
    // Modo Otimizado: Webview dinâmica
    return activeWebview;
  }
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

// Ação: Mostrar configurações (chamada via IPC)
function handleShowSettings() {
  console.log("[Renderer] Received command: show-settings");
  showSettings();
}

// Ação: Mostrar sobre (chamada via IPC)
function handleShowAbout() {
  console.log("[Renderer] Received command: show-about");
  showAbout();
}

// Ação: Sair do aplicativo (chamada via IPC)
function handleExitApp() {
  console.log("[Renderer] Received command: exit-app");
  exitApp();
}

// Ação: Abrir GitHub (chamada via IPC)
function handleOpenGitHub() {
  console.log("[Renderer] Received command: open-github");
  openGitHub();
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

// Listener para fechar o menu de contexto da aba ao clicar em qualquer lugar
document.addEventListener("contextmenu", (e) => {
  if (!e.target.closest("#tab-context-menu")) {
    hideTabContextMenu();
  }
});

// --- Inicialização --- 
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Renderer] DOMContentLoaded event fired.");
  const menu = document.querySelector(".menu");
  const versionSpan = document.getElementById("app-version");
  const yearSpan = document.getElementById("current-year");
  const titleTag = document.querySelector("title"); // Seleciona a tag <title>

  if (yearSpan) {
    yearSpan.textContent = getCurrentYear();
  }

  // Busca a versão da aplicação
  if (versionSpan && window.electronAPI?.app?.getVersion) {
    try {
      const version = await window.electronAPI.app.getVersion();
      versionSpan.innerText = version ? `v${version}` : "N/A";
      console.log(`[Renderer] App version set to: ${versionSpan.innerText}`);

      // ATUALIZA O TÍTULO DA PÁGINA AQUI
      if (titleTag) {
        titleTag.textContent = `AI Interaction Hub v${version}`;
        console.log(`[Renderer] Page title updated to: ${titleTag.textContent}`);
      }

    } catch (error) {
      console.error("Erro ao buscar versão:", error);
      versionSpan.innerText = "Erro";
      if (titleTag) { // Ainda pode atualizar com erro ou N/A
        titleTag.textContent = `AI Interaction Hub (Erro ao carregar versão)`;
      }
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

  // A variável keepTabsActive já foi inicializada no escopo global.
  const keepActiveCheckbox = document.getElementById("keep-tabs-active");
  if (keepActiveCheckbox) {
    keepActiveCheckbox.checked = keepTabsActive;
    console.log(`[Renderer] Initial keepTabsActive state set from localStorage: ${keepTabsActive}`);
  }

  // Se estiver no modo otimizado, remove as webviews estáticas do DOM para evitar carregamento
  if (!keepTabsActive) {
    document.querySelectorAll("#webview-container webview").forEach(webview => {
      webview.remove();
    });
    console.log("[Renderer] Removed static webviews from DOM (Optimized Mode).");
  }

  // Mostra a primeira aba
  const firstTabButton = document.querySelector("#sidebar .sidebar-top button");
  if (firstTabButton) {
    const firstTabId = firstTabButton.id.replace("btn-", "");
    console.log(`[Renderer] Showing initial tab: ${firstTabId}`);
    // A primeira aba deve ser mostrada sem verificar currentTabId, então forçamos a criação
    currentTabId = null; // Garante que showTab será executado
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
    
    // Novos listeners para comandos do menu nativo
    if (window.electronAPI.commands.onShowSettings) {
      window.electronAPI.commands.onShowSettings(handleShowSettings);
    }
    if (window.electronAPI.commands.onShowAbout) {
      window.electronAPI.commands.onShowAbout(handleShowAbout);
    }
    if (window.electronAPI.commands.onExitApp) {
      window.electronAPI.commands.onExitApp(handleExitApp);
    }
    if (window.electronAPI.commands.onOpenGitHub) {
      window.electronAPI.commands.onOpenGitHub(handleOpenGitHub);
    }
    
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


});

// Recebe configurações iniciais do processo principal
window.electronAPI.settings.onInit((settings) => {
  console.log("[Renderer] Initial settings received from main process:", settings);
  
  // Configuração minimizeToTray
  minimizeToTray = settings.minimizeToTray ?? false;
  const minimizeCheckbox = document.getElementById("minimize-to-tray");
  if (minimizeCheckbox) {
    minimizeCheckbox.checked = minimizeToTray;
    localStorage.setItem("minimizeToTray", minimizeToTray.toString());
    console.log(`[Renderer] minimizeToTray checkbox updated from main process settings: ${minimizeToTray}`);
  }

  // Configuração keepTabsActive
  keepTabsActive = settings.keepTabsActive ?? false;
  const keepActiveCheckbox = document.getElementById("keep-tabs-active");
  if (keepActiveCheckbox) {
    keepActiveCheckbox.checked = keepTabsActive;
    localStorage.setItem("keepTabsActive", keepTabsActive.toString());
    console.log(`[Renderer] keepTabsActive checkbox updated from main process settings: ${keepTabsActive}`);
  }
});
// Estado das configurações
let minimizeToTray = false;
const savedMinimizeToTray = localStorage.getItem('minimizeToTray');
minimizeToTray = savedMinimizeToTray === 'true';

// Funções do menu
function toggleMenu(menuId) {
  // Fecha todos os menus primeiro
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    menu.classList.remove('show');
  });

  // Abre o menu selecionado
  const menu = document.getElementById(menuId + '-menu');
  if (menu) {
    menu.classList.add('show');
  }
}

function exitApp() {
  window.electronAPI.send('exit-app');
}

function openGitHub() {
  window.electronAPI.send('open-github');
}

function showAbout() {
  const modal = document.getElementById('about-modal');
  if (modal) {
    modal.style.display = 'block';
  }
  hideAllMenus();
}

function hideAbout() {
  const modal = document.getElementById('about-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Funções de configurações
function showSettings() {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.style.display = 'block';
    document.getElementById('minimize-to-tray').checked = minimizeToTray;
  }
}

function hideSettings() {
  const modal = document.getElementById('settings-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function toggleMinimizeToTray() {
  const checkbox = document.getElementById('minimize-to-tray');

  minimizeToTray = checkbox.checked;
  localStorage.setItem('minimizeToTray', minimizeToTray ? 'true' : 'false');
  window.electronAPI.send('set-minimize-to-tray', minimizeToTray);
}

// Funções de contexto das abas
function showTabContextMenu(event, tabId) {
  event.preventDefault();
  event.stopPropagation();

  document.body.setAttribute('data-current-tab', tabId);

  const menu = document.getElementById('tab-context-menu');
  menu.style.left = `${event.pageX}px`;
  menu.style.top = `${event.pageY}px`;
  menu.style.display = 'block';
}

function hideTabContextMenu() {
  const menu = document.getElementById('tab-context-menu');
  if (menu) menu.style.display = 'none';
}

function hideAllMenus() {
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    menu.classList.remove('show');
  });
}

// Funções originais
function toggleSettings() {
  const panel = document.getElementById('settings-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function showTab(tabId) {
  // Troca visual do webview
  document.querySelectorAll('webview').forEach(w => w.classList.remove('active'));
  const activeWebview = document.getElementById(tabId);
  if (activeWebview) {
    activeWebview.classList.add('active');
    document.body.setAttribute('data-current-tab', tabId);
  }

  // Troca visual do botão ativo
  document.querySelectorAll('#sidebar button').forEach(btn => btn.classList.remove('active-button'));
  const activeBtn = document.getElementById(`btn-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.add('active-button');
  }
}

function showContextMenu(event, tabId) {
  event.preventDefault();
  document.body.setAttribute('data-current-tab', tabId);

  const menu = document.getElementById('context-menu');
  menu.style.left = `${event.pageX}px`;
  menu.style.top = `${event.pageY}px`;
  menu.style.display = 'block';
}

function reloadCurrentTab() {
  const currentTabId = document.body.getAttribute('data-current-tab');
  if (currentTabId) {
    const webview = document.getElementById(currentTabId);
    if (webview) webview.reload();
  }
  hideTabContextMenu();
}

function hideContextMenu() {
  const menu = document.getElementById('context-menu');
  if (menu) menu.style.display = 'none';
}

function closeCurrentTab() {
  const tabId = document.body.getAttribute('data-current-tab');
  if (!tabId) return;

  const webview = document.getElementById(tabId);
  const button = document.getElementById(`btn-${tabId}`);
  if (webview) webview.remove();
  if (button) button.remove();

  hideTabContextMenu();
}

function duplicateCurrentTab() {
  const currentTabId = document.body.getAttribute('data-current-tab');
  const originalWebview = document.getElementById(currentTabId);
  if (originalWebview) {
    const clone = originalWebview.cloneNode(true);
    const newId = currentTabId + '-copy';
    clone.id = newId;
    document.getElementById('webview-container').appendChild(clone);
    showTab(newId);
  }
  hideTabContextMenu();
}


// Eventos
document.addEventListener('click', (e) => {
  // Fecha menus se clicar fora deles
  if (!e.target.closest('.menu-item')) {
    hideAllMenus();
  }
  // Fecha context menu das abas
  if (!e.target.closest('#tab-context-menu')) {
    hideTabContextMenu();
  }
  // Fecha modais se clicar fora deles
  if (e.target.classList.contains('modal')) {
    hideAbout();
    hideSettings();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 'r') {
    e.preventDefault(); // Previne reload da página principal
    const currentTabId = document.body.getAttribute('data-current-tab');
    if (currentTabId) {
      const webview = document.getElementById(currentTabId);
      if (webview) webview.reload();
    }
  }
  // Fecha modais com ESC
  if (e.key === 'Escape') {
    hideAbout();
    hideSettings();
    hideAllMenus();
    hideTabContextMenu();
  }
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  const menu = document.querySelector('.menu'); // ou '#menu', dependendo do seu HTML

  // Recupera o valor salvo e garante que minimizeToTray seja booleano
  const savedMinimizeToTray = localStorage.getItem('minimizeToTray');
  minimizeToTray = savedMinimizeToTray === 'true';

  // Atualiza o checkbox conforme o valor salvo
  const minimizeCheckbox = document.getElementById('minimize-to-tray');
  if (minimizeCheckbox) {
    minimizeCheckbox.checked = minimizeToTray;
  }

  // Acessibilidade (opcional)
  if (menu) {
    menu.setAttribute('role', 'tablist');
  }

  showTab('chatgpt');

  const closeBtn1 = document.getElementById("close-btn");
  const closeBtn2 = document.getElementById("closeBtn");
  if (closeBtn1) closeBtn1.addEventListener("click", () => window.electronAPI.closeApp());
  if (closeBtn2) closeBtn2.addEventListener("click", () => window.electronAPI.closeApp());
});

// Receber configurações iniciais vindas do main process
window.electronAPI.onInitSettings((settings) => {
  console.log("Configurações recebidas:", settings);
  // Atualizar UI ou lógica com base nas configurações
});
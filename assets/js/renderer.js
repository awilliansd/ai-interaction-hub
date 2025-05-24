const { ipcRenderer } = window.require('electron');

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
  const webview = document.getElementById(currentTabId);
  if (webview) webview.reload();
  hideContextMenu();
}

function hideContextMenu() {
  const menu = document.getElementById('context-menu');
  if (menu) menu.style.display = 'none';
}

// Eventos
document.addEventListener('click', hideContextMenu);

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === 'r') {
    reloadCurrentTab();
  }
});

// Comunicação do main process
ipcRenderer.on('reload-tab', (event, tabId) => {
  const webview = document.getElementById(tabId);
  if (webview) webview.reload();
});
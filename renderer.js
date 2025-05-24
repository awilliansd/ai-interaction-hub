const { ipcRenderer } = window.require('electron');

function toggleSettings() {
  const panel = document.getElementById('settings-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function showTab(tabId) {
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => iframe.style.display = 'none');

  const target = document.getElementById(tabId);
  if (target) {
    target.style.display = 'block';
    document.body.setAttribute('data-current-tab', tabId);
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
  const iframe = document.getElementById(currentTabId);
  if (iframe) iframe.src = iframe.src;
  hideContextMenu();
}

function hideContextMenu() {
  const menu = document.getElementById('context-menu');
  menu.style.display = 'none';
}

document.addEventListener('click', hideContextMenu);
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'r') {
    reloadCurrentTab();
  }
});

ipcRenderer.on('reload-tab', (event, tabId) => {
  const iframe = document.getElementById(tabId);
  if (iframe) iframe.src = iframe.src;
});
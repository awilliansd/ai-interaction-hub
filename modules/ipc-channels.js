// modules/ipc-channels.js
// Centraliza os nomes dos canais IPC para evitar strings mágicas espalhadas.
module.exports = {
  // Eventos unidirecionais (ipcMain.on / ipcRenderer.send)
  SET_WINDOW_TITLE: "set-window-title",
  EXIT_APP: "exit-app",
  OPEN_GITHUB: "open-github",
  SET_MINIMIZE_TO_TRAY: "set-minimize-to-tray",
  SET_KEEP_TABS_ACTIVE: "set-keep-tabs-active",
  SET_APP_MODE: "set-app-mode",
  CLEAR_APP_CACHE: "clear-app-cache",
  INIT_SETTINGS: "init-settings",

  // Invocações bidirecionais (ipcMain.handle / ipcRenderer.invoke)
  GET_APP_VERSION: "get-app-version",
  GET_SETTINGS: "get-settings",
  SAVE_SETTINGS: "save-settings",
  SHOW_TAB_CONTEXT_MENU: "show-tab-context-menu",
  PICK_TAB_ICON: "pick-tab-icon",
  CLEAR_PARTITION: "clear-partition",

  // Comandos enviados do menu do processo principal para o renderer
  COMMAND_PREFIX: "command:",
  CMD_RELOAD_ACTIVE_TAB: "command:reload-active-tab",
  CMD_FIND_IN_ACTIVE_TAB: "command:find-in-active-tab",
  CMD_SHOW_SETTINGS: "command:show-settings",
  CMD_TOGGLE_APP_MODE: "command:toggle-app-mode",
  CMD_SET_APP_MODE_PERSONAL: "command:set-app-mode-personal",
  CMD_SET_APP_MODE_DEVELOPER: "command:set-app-mode-developer",
  CMD_SHOW_ABOUT: "command:show-about",
  CMD_EXIT_APP: "command:exit-app",
  CMD_CLEAR_APP_CACHE: "command:clear-app-cache",
  CMD_ACTIVATE_TAB_N: "command:activate-tab-n",
  CMD_CYCLE_TAB: "command:cycle-tab",
  CMD_EDIT_CUSTOM_TAB: "command:edit-custom-tab",
  CMD_REMOVE_CUSTOM_TAB: "command:remove-custom-tab",
  CMD_ADD_ACCOUNT: "command:add-account",
  CMD_RENAME_ACCOUNT: "command:rename-account",
  CMD_REMOVE_ACCOUNT: "command:remove-account",

  // Host de WebContentsView (Etapa E1) — renderer -> main
  HOST_SHOW_TAB: "host:show-tab",
  HOST_RELOAD_TAB: "host:reload-tab",
  HOST_RECREATE_TAB: "host:recreate-tab",
  HOST_RESET_ALL: "host:reset-all",
  HOST_FIND_OPEN: "host:find-open",
  HOST_FIND_INPUT: "host:find-input",
  HOST_FIND_NEXT: "host:find-next",
  HOST_FIND_CLOSE: "host:find-close",
  HOST_SET_OVERLAY: "host:set-overlay",
  HOST_CLEAR_TAB_CACHE: "host:clear-tab-cache",

  // Host de WebContentsView (Etapa E1) — main -> renderer
  TAB_LOADING: "tab:loading",
  TAB_RECOVERY_TOAST: "tab:recovery-toast",
  TAB_FOUND: "tab:found",
  TAB_READY: "tab:ready",
  TAB_TITLE_UPDATED: "tab:title-updated",
};
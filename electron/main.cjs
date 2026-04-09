const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, screen } = require('electron');
const { APP_ID, APP_PRODUCT_NAME } = require('./main/config.cjs');
const { loadSystemSettings, saveSystemSettings, loadPersistedState, savePersistedState } = require('./main/state-store.cjs');
const {
  isWindowsStartupSupported,
  getWindowsLaunchAtStartupState,
  setWindowsLaunchAtStartup,
  ensureWindowsAutoLaunchDefault
} = require('./main/windows-startup.cjs');
const { findWindowsUninstallerPath } = require('./main/windows-uninstall.cjs');
const { createWindowManager } = require('./main/window-manager.cjs');
const { createTrayManager } = require('./main/tray-manager.cjs');
const { registerIpcHandlers } = require('./main/ipc.cjs');

const context = {
  tray: null,
  mainWindowRef: null,
  isQuitting: false,
  isGhostMousePassthroughEnabled: false
};

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID);
}

let trayManager;

const windowManager = createWindowManager({
  app,
  BrowserWindow,
  screen,
  context,
  createTray: (iconPath) => trayManager.createTray(iconPath)
});

trayManager = createTrayManager({
  app,
  Menu,
  Tray,
  dialog,
  context,
  showMainWindow: windowManager.showMainWindow,
  hideMainWindow: windowManager.hideMainWindow,
  loadSystemSettings,
  saveSystemSettings,
  isWindowsStartupSupported,
  getWindowsLaunchAtStartupState,
  setWindowsLaunchAtStartup,
  findWindowsUninstallerPath
});

app.whenReady().then(() => {
  app.setName(APP_PRODUCT_NAME);
  Menu.setApplicationMenu(null);
  ensureWindowsAutoLaunchDefault(app, loadSystemSettings, saveSystemSettings);

  registerIpcHandlers({
    ipcMain,
    app,
    BrowserWindow,
    loadPersistedState,
    savePersistedState,
    hideMainWindow: windowManager.hideMainWindow,
    applyWindowMode: windowManager.applyWindowMode,
    setGhostMousePassthrough: windowManager.setGhostMousePassthrough,
    context
  });

  windowManager.createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 || !context.mainWindowRef) {
      windowManager.createMainWindow();
      return;
    }
    windowManager.showMainWindow();
  });
});

app.on('before-quit', () => {
  context.isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

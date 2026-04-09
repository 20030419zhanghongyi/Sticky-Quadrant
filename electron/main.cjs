const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, screen } = require('electron');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

const STATE_FILE_NAME = 'sticky-quadrant-state.json';
const STATE_FILE_ENCODING = 'utf8';
const SYSTEM_SETTINGS_FILE_NAME = 'sticky-quadrant-system-settings.json';
const APP_PRODUCT_NAME = 'Sticky Quadrant';
const APP_ICON_PATH = path.resolve(__dirname, '../assets/quadrant_bookmark_icon_final.ico');
const COMPACT_WINDOW_WIDTH = 314;
const COMPACT_WINDOW_HEIGHT = 676;
const COMPACT_MARGIN_RIGHT = 48;
const COMPACT_MARGIN_TOP = 65;

let tray = null;
let mainWindowRef = null;
let isQuitting = false;
let isGhostMousePassthroughEnabled = false;

function getStateFilePath() {
  return path.join(app.getPath('userData'), STATE_FILE_NAME);
}

function getSystemSettingsFilePath() {
  return path.join(app.getPath('userData'), SYSTEM_SETTINGS_FILE_NAME);
}

function sanitizePersistedJsonText(rawText) {
  if (typeof rawText !== 'string') {
    return '';
  }

  // Tolerate UTF-8 BOM so edited files still parse correctly on Windows.
  return rawText.replace(/^\uFEFF/, '');
}

function loadSystemSettings() {
  try {
    const raw = fsSync.readFileSync(getSystemSettingsFilePath(), { encoding: STATE_FILE_ENCODING });
    const sanitized = sanitizePersistedJsonText(raw);
    const parsed = JSON.parse(sanitized);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return parsed;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return {};
    }

    console.error('[system-settings:load] failed to decode settings', {
      filePath: getSystemSettingsFilePath(),
      error
    });
    return {};
  }
}

function saveSystemSettings(settings) {
  const filePath = getSystemSettingsFilePath();
  const dir = path.dirname(filePath);
  const serialized = JSON.stringify(settings, null, 2);
  fsSync.mkdirSync(dir, { recursive: true });
  fsSync.writeFileSync(filePath, Buffer.from(serialized, STATE_FILE_ENCODING));
}

async function loadPersistedState() {
  try {
    const filePath = getStateFilePath();
    const raw = await fs.readFile(filePath, { encoding: STATE_FILE_ENCODING });
    const sanitized = sanitizePersistedJsonText(raw);
    return JSON.parse(sanitized);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }

    console.error('[persistence:load] failed to decode persisted state', {
      filePath: getStateFilePath(),
      error
    });
    throw error;
  }
}

async function savePersistedState(payload) {
  const filePath = getStateFilePath();
  const dir = path.dirname(filePath);
  const tempFilePath = `${filePath}.tmp`;
  const serialized = JSON.stringify(payload, null, 2);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(tempFilePath, Buffer.from(serialized, STATE_FILE_ENCODING));
  await fs.rename(tempFilePath, filePath);
  return { ok: true, filePath };
}

function attachProductionDebugHooks(mainWindow) {
  const wc = mainWindow.webContents;

  wc.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error('[renderer did-fail-load]', {
      errorCode,
      errorDescription,
      validatedURL,
      isMainFrame
    });
  });

  wc.on('console-message', (_event, level, message, line, sourceId) => {
    console.log('[renderer console]', { level, message, line, sourceId });
  });

  wc.on('render-process-gone', (_event, details) => {
    console.error('[renderer render-process-gone]', details);
  });

  wc.on('unresponsive', () => {
    console.error('[renderer unresponsive]');
  });

  wc.on('responsive', () => {
    console.log('[renderer responsive]');
  });
}

function getCompactWindowBounds() {
  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.workArea;
  const clampedWidth = Math.min(COMPACT_WINDOW_WIDTH, width);
  const clampedHeight = Math.min(COMPACT_WINDOW_HEIGHT, height);
  return {
    width: clampedWidth,
    height: clampedHeight,
    x: Math.round(x + width - clampedWidth - COMPACT_MARGIN_RIGHT),
    y: Math.round(y + COMPACT_MARGIN_TOP)
  };
}

function showMainWindow() {
  if (!mainWindowRef) {
    return;
  }
  if (mainWindowRef.isMinimized()) {
    mainWindowRef.restore();
  }
  mainWindowRef.show();
  mainWindowRef.focus();
}

function hideMainWindow() {
  if (!mainWindowRef) {
    return { ok: false };
  }
  mainWindowRef.hide();
  return { ok: true };
}

function setGhostMousePassthrough(enabled) {
  isGhostMousePassthroughEnabled = Boolean(enabled);
  if (!mainWindowRef) {
    return { ok: false, enabled: isGhostMousePassthroughEnabled };
  }

  mainWindowRef.setIgnoreMouseEvents(isGhostMousePassthroughEnabled, { forward: isGhostMousePassthroughEnabled });
  return { ok: true, enabled: isGhostMousePassthroughEnabled };
}

function waitForWindowEvent(windowRef, eventName, timeoutMs = 500) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) {
        return;
      }
      done = true;
      resolve();
    }, timeoutMs);

    windowRef.once(eventName, () => {
      if (done) {
        return;
      }
      done = true;
      clearTimeout(timer);
      resolve();
    });
  });
}

async function applyWindowMode(mode) {
  if (!mainWindowRef) {
    return { ok: false };
  }

  if (mode === 'expanded') {
    setGhostMousePassthrough(false);
    if (!mainWindowRef.isFullScreen()) {
      const entered = waitForWindowEvent(mainWindowRef, 'enter-full-screen');
      mainWindowRef.setFullScreen(true);
      await entered;
    }
    mainWindowRef.setAlwaysOnTop(true, 'screen-saver');
    showMainWindow();
    return { ok: true };
  }

  if (mode === 'compact') {
    const bounds = getCompactWindowBounds();
    const applyCompactBounds = () => {
      if (!mainWindowRef) {
        return;
      }
      mainWindowRef.setBounds(bounds, true);
      mainWindowRef.setAlwaysOnTop(true, 'screen-saver');
      mainWindowRef.setIgnoreMouseEvents(isGhostMousePassthroughEnabled, { forward: isGhostMousePassthroughEnabled });
      showMainWindow();
    };

    if (mainWindowRef.isFullScreen()) {
      const left = waitForWindowEvent(mainWindowRef, 'leave-full-screen');
      mainWindowRef.setFullScreen(false);
      await left;
      applyCompactBounds();
      return { ok: true };
    }

    applyCompactBounds();
    return { ok: true };
  }

  return { ok: false };
}

function isWindowsStartupSupported() {
  return process.platform === 'win32' && app.isPackaged;
}

function getWindowsLaunchAtStartupState() {
  if (!isWindowsStartupSupported()) {
    return false;
  }

  try {
    return app.getLoginItemSettings({
      path: process.execPath,
      args: []
    }).openAtLogin;
  } catch (error) {
    console.error('[auto-launch] failed to read openAtLogin state', error);
    return false;
  }
}

function setWindowsLaunchAtStartup(enabled) {
  if (!isWindowsStartupSupported()) {
    return { ok: false, enabled: false };
  }

  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      path: process.execPath,
      args: []
    });
    return { ok: true, enabled: getWindowsLaunchAtStartupState() };
  } catch (error) {
    console.error('[auto-launch] failed to update openAtLogin', { enabled, error });
    return { ok: false, enabled: getWindowsLaunchAtStartupState() };
  }
}

function ensureWindowsAutoLaunchDefault() {
  if (!isWindowsStartupSupported()) {
    return;
  }

  const settings = loadSystemSettings();
  if (settings.launchAtStartupInitialized) {
    return;
  }

  const result = setWindowsLaunchAtStartup(true);
  if (!result.ok) {
    return;
  }

  saveSystemSettings({
    ...settings,
    launchAtStartupInitialized: true
  });
}

function findWindowsUninstallerPath() {
  if (process.platform !== 'win32' || !app.isPackaged) {
    return null;
  }

  const installDir = path.dirname(process.execPath);
  const executableBaseName = path.basename(process.execPath, path.extname(process.execPath));
  const candidates = [
    path.join(installDir, `Uninstall ${executableBaseName}.exe`),
    path.join(installDir, `Uninstall ${APP_PRODUCT_NAME}.exe`)
  ];

  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function refreshTrayContextMenu() {
  if (!tray) {
    return;
  }

  const launchAtStartupSupported = isWindowsStartupSupported();
  const uninstallerPath = findWindowsUninstallerPath();
  const trayMenu = Menu.buildFromTemplate([
    { label: 'Show Sticky Quadrant', click: () => showMainWindow() },
    {
      label: '开机自动启动',
      type: 'checkbox',
      checked: launchAtStartupSupported && getWindowsLaunchAtStartupState(),
      enabled: launchAtStartupSupported,
      click: () => {
        const nextEnabled = !getWindowsLaunchAtStartupState();
        const result = setWindowsLaunchAtStartup(nextEnabled);
        if (result.ok) {
          const settings = loadSystemSettings();
          saveSystemSettings({
            ...settings,
            launchAtStartupInitialized: true
          });
        }
        refreshTrayContextMenu();
      }
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    },
    { type: 'separator' },
    {
      label: '卸载软件',
      click: async () => {
        if (!uninstallerPath) {
          await dialog.showMessageBox({
            type: 'info',
            title: '无法启动卸载',
            message: '当前运行环境没有可用的卸载程序。',
            detail: '只有通过 Windows 安装器安装的版本才能从托盘菜单启动卸载。便携版或开发环境请使用系统对应的删除方式。'
          });
          return;
        }

        const result = await dialog.showMessageBox(mainWindowRef ?? undefined, {
          type: 'warning',
          buttons: ['取消', '确认卸载'],
          defaultId: 1,
          cancelId: 0,
          title: '卸载 Sticky Quadrant',
          message: '即将卸载 Sticky Quadrant。',
          detail: '卸载程序即将启动，请按系统提示完成卸载。'
        });

        if (result.response !== 1) {
          return;
        }

        setWindowsLaunchAtStartup(false);

        try {
          const child = spawn(uninstallerPath, [], {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
        } catch (error) {
          console.error('[uninstall] failed to launch uninstaller', { uninstallerPath, error });
          await dialog.showMessageBox({
            type: 'error',
            title: '无法启动卸载',
            message: '未能启动系统卸载程序。',
            detail: uninstallerPath
          });
          return;
        }

        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(trayMenu);
}

function createTray(iconPath) {
  if (tray || !fsSync.existsSync(iconPath)) {
    return;
  }

  tray = new Tray(iconPath);
  tray.setToolTip(APP_PRODUCT_NAME);
  tray.on('click', () => {
    if (!mainWindowRef) {
      return;
    }
    if (mainWindowRef.isVisible()) {
      hideMainWindow();
      return;
    }
    showMainWindow();
  });
  tray.on('right-click', () => {
    refreshTrayContextMenu();
  });
  refreshTrayContextMenu();
}

function createMainWindow() {
  const distIndexPath = path.resolve(__dirname, '../dist/index.html');
  const start = getCompactWindowBounds();
  const mainWindow = new BrowserWindow({
    title: APP_PRODUCT_NAME,
    width: start.width,
    height: start.height,
    x: start.x,
    y: start.y,
    minWidth: 280,
    minHeight: 480,
    backgroundColor: '#00000000',
    transparent: true,
    frame: false,
    icon: APP_ICON_PATH,
    autoHideMenuBar: true,
    hasShadow: false,
    fullscreenable: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  mainWindow.on('close', (event) => {
    if (isQuitting) {
      return;
    }
    if (!tray) {
      return;
    }
    event.preventDefault();
    hideMainWindow();
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (!app.isPackaged) {
    mainWindow
      .loadURL(devUrl)
      .catch((error) => console.error('[main] failed to load dev url', devUrl, error));
  } else {
    attachProductionDebugHooks(mainWindow);
    mainWindow
      .loadFile(distIndexPath)
      .catch((error) => console.error('[main] failed to load file', distIndexPath, error));
    mainWindow.webContents.once('did-finish-load', () => {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      }
    });
  }

  mainWindowRef = mainWindow;
  createTray(APP_ICON_PATH);
}

app.whenReady().then(() => {
  app.setName(APP_PRODUCT_NAME);
  Menu.setApplicationMenu(null);
  ensureWindowsAutoLaunchDefault();
  ipcMain.handle('persistence:load', async () => loadPersistedState());
  ipcMain.handle('persistence:save', async (_event, payload) => savePersistedState(payload));
  ipcMain.handle('controls:restart', () => {
    const focused = BrowserWindow.getFocusedWindow();
    if (focused) {
      focused.reload();
      return { ok: true };
    }

    BrowserWindow.getAllWindows().forEach((window) => window.reload());
    return { ok: true };
  });
  ipcMain.handle('controls:quit', () => {
    isQuitting = true;
    app.quit();
    return { ok: true };
  });
  ipcMain.handle('controls:hide', () => hideMainWindow());
  ipcMain.handle('controls:toggleDebug', () => {
    const focused = BrowserWindow.getFocusedWindow();
    if (!focused) {
      return { ok: false };
    }

    if (focused.webContents.isDevToolsOpened()) {
      focused.webContents.closeDevTools();
      return { ok: true, opened: false };
    }

    focused.webContents.openDevTools({ mode: 'detach' });
    return { ok: true, opened: true };
  });
  ipcMain.handle('controls:setWindowMode', (_event, mode) => applyWindowMode(mode));
  ipcMain.handle('controls:setGhostMousePassthrough', (_event, enabled) => setGhostMousePassthrough(enabled));

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 || !mainWindowRef) {
      createMainWindow();
      return;
    }
    showMainWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

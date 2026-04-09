const { app, BrowserWindow, Menu, Tray, ipcMain, screen } = require('electron');
const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');

const STATE_FILE_NAME = 'sticky-quadrant-state.json';
const STATE_FILE_ENCODING = 'utf8';
const APP_PRODUCT_NAME = 'Sticky Quadrant';
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

function sanitizePersistedJsonText(rawText) {
  if (typeof rawText !== 'string') {
    return '';
  }

  // Tolerate UTF-8 BOM so edited files still parse correctly on Windows.
  return rawText.replace(/^\uFEFF/, '');
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

  const trayMenu = Menu.buildFromTemplate([
    { label: 'Show Sticky Quadrant', click: () => showMainWindow() },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(trayMenu);
}

function createMainWindow() {
  const iconPath = path.join(__dirname, '../build/icons/icon.ico');
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
    icon: iconPath,
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
  createTray(iconPath);
}

function configureWindowsAutoLaunch() {
  if (process.platform !== 'win32' || !app.isPackaged) {
    return;
  }

  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: process.execPath
    });
  } catch (error) {
    console.error('[auto-launch] failed to configure openAtLogin', error);
  }
}

app.whenReady().then(() => {
  app.setName(APP_PRODUCT_NAME);
  Menu.setApplicationMenu(null);
  configureWindowsAutoLaunch();
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

const path = require('node:path');
const {
  APP_ICON_PATH,
  APP_PRODUCT_NAME,
  COMPACT_WINDOW_WIDTH,
  COMPACT_WINDOW_HEIGHT,
  COMPACT_MARGIN_RIGHT,
  COMPACT_MARGIN_TOP
} = require('./config.cjs');

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

function getCompactWindowBounds(screen) {
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

function createWindowManager({ app, BrowserWindow, screen, context, createTray }) {
  function showMainWindow() {
    if (!context.mainWindowRef) {
      return;
    }
    if (context.mainWindowRef.isMinimized()) {
      context.mainWindowRef.restore();
    }
    context.mainWindowRef.show();
    context.mainWindowRef.focus();
  }

  function hideMainWindow() {
    if (!context.mainWindowRef) {
      return { ok: false };
    }
    context.mainWindowRef.hide();
    return { ok: true };
  }

  function setGhostMousePassthrough(enabled) {
    context.isGhostMousePassthroughEnabled = Boolean(enabled);
    if (!context.mainWindowRef) {
      return { ok: false, enabled: context.isGhostMousePassthroughEnabled };
    }

    context.mainWindowRef.setIgnoreMouseEvents(context.isGhostMousePassthroughEnabled, {
      forward: context.isGhostMousePassthroughEnabled
    });
    return { ok: true, enabled: context.isGhostMousePassthroughEnabled };
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
    if (!context.mainWindowRef) {
      return { ok: false };
    }

    if (mode === 'expanded') {
      setGhostMousePassthrough(false);
      if (!context.mainWindowRef.isFullScreen()) {
        const entered = waitForWindowEvent(context.mainWindowRef, 'enter-full-screen');
        context.mainWindowRef.setFullScreen(true);
        await entered;
      }
      context.mainWindowRef.setAlwaysOnTop(true, 'screen-saver');
      showMainWindow();
      return { ok: true };
    }

    if (mode === 'compact') {
      const bounds = getCompactWindowBounds(screen);
      const applyCompactBounds = () => {
        if (!context.mainWindowRef) {
          return;
        }
        context.mainWindowRef.setBounds(bounds, true);
        context.mainWindowRef.setAlwaysOnTop(true, 'screen-saver');
        context.mainWindowRef.setIgnoreMouseEvents(context.isGhostMousePassthroughEnabled, {
          forward: context.isGhostMousePassthroughEnabled
        });
        showMainWindow();
      };

      if (context.mainWindowRef.isFullScreen()) {
        const left = waitForWindowEvent(context.mainWindowRef, 'leave-full-screen');
        context.mainWindowRef.setFullScreen(false);
        await left;
        applyCompactBounds();
        return { ok: true };
      }

      applyCompactBounds();
      return { ok: true };
    }

    return { ok: false };
  }

  function createMainWindow() {
    const distIndexPath = path.resolve(__dirname, '../../dist/index.html');
    const start = getCompactWindowBounds(screen);
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
        preload: path.join(__dirname, '../preload.cjs')
      }
    });
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');

    mainWindow.on('close', (event) => {
      if (context.isQuitting) {
        return;
      }
      if (!context.tray) {
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

    context.mainWindowRef = mainWindow;
    createTray(APP_ICON_PATH);
  }

  return {
    createMainWindow,
    showMainWindow,
    hideMainWindow,
    setGhostMousePassthrough,
    applyWindowMode
  };
}

module.exports = {
  createWindowManager
};

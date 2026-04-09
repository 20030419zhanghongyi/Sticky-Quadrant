const fsSync = require('node:fs');
const { spawn } = require('node:child_process');
const { APP_PRODUCT_NAME } = require('./config.cjs');

const COPY = {
  launchAtStartup: '\u5f00\u673a\u81ea\u52a8\u542f\u52a8',
  uninstall: '\u5378\u8f7d\u8f6f\u4ef6',
  uninstallUnavailableTitle: '\u65e0\u6cd5\u542f\u52a8\u5378\u8f7d',
  uninstallUnavailableMessage: '\u5f53\u524d\u8fd0\u884c\u73af\u5883\u6ca1\u6709\u53ef\u7528\u7684\u5378\u8f7d\u7a0b\u5e8f\u3002',
  uninstallUnavailableDetail:
    '\u53ea\u6709\u901a\u8fc7 Windows \u5b89\u88c5\u5668\u5b89\u88c5\u7684\u7248\u672c\u624d\u80fd\u4ece\u6258\u76d8\u83dc\u5355\u542f\u52a8\u5378\u8f7d\u3002\u4fbf\u643a\u7248\u6216\u5f00\u53d1\u73af\u5883\u8bf7\u4f7f\u7528\u7cfb\u7edf\u5bf9\u5e94\u7684\u5220\u9664\u65b9\u5f0f\u3002',
  uninstallConfirmCancel: '\u53d6\u6d88',
  uninstallConfirmProceed: '\u786e\u8ba4\u5378\u8f7d',
  uninstallConfirmTitle: '\u5378\u8f7d Sticky Quadrant',
  uninstallConfirmMessage: '\u5373\u5c06\u5378\u8f7d Sticky Quadrant\u3002',
  uninstallConfirmDetail: '\u5378\u8f7d\u7a0b\u5e8f\u5373\u5c06\u542f\u52a8\uff0c\u8bf7\u6309\u7cfb\u7edf\u63d0\u793a\u5b8c\u6210\u5378\u8f7d\u3002',
  uninstallLaunchErrorMessage: '\u672a\u80fd\u542f\u52a8\u7cfb\u7edf\u5378\u8f7d\u7a0b\u5e8f\u3002'
};

function createTrayManager({
  app,
  Menu,
  Tray,
  dialog,
  context,
  showMainWindow,
  hideMainWindow,
  loadSystemSettings,
  saveSystemSettings,
  isWindowsStartupSupported,
  getWindowsLaunchAtStartupState,
  setWindowsLaunchAtStartup,
  findWindowsUninstallerPath
}) {
  async function handleUninstall() {
    const uninstallerPath = findWindowsUninstallerPath(app);

    if (!uninstallerPath) {
      await dialog.showMessageBox({
        type: 'info',
        title: COPY.uninstallUnavailableTitle,
        message: COPY.uninstallUnavailableMessage,
        detail: COPY.uninstallUnavailableDetail
      });
      return;
    }

    const result = await dialog.showMessageBox(context.mainWindowRef ?? undefined, {
      type: 'warning',
      buttons: [COPY.uninstallConfirmCancel, COPY.uninstallConfirmProceed],
      defaultId: 1,
      cancelId: 0,
      title: COPY.uninstallConfirmTitle,
      message: COPY.uninstallConfirmMessage,
      detail: COPY.uninstallConfirmDetail
    });

    if (result.response !== 1) {
      return;
    }

    setWindowsLaunchAtStartup(app, false);

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
        title: COPY.uninstallUnavailableTitle,
        message: COPY.uninstallLaunchErrorMessage,
        detail: uninstallerPath
      });
      return;
    }

    context.isQuitting = true;
    app.quit();
  }

  function refreshTrayContextMenu() {
    if (!context.tray) {
      return;
    }

    const launchAtStartupSupported = isWindowsStartupSupported(app);
    const trayMenu = Menu.buildFromTemplate([
      { label: 'Show Sticky Quadrant', click: () => showMainWindow() },
      {
        label: COPY.launchAtStartup,
        type: 'checkbox',
        checked: launchAtStartupSupported && getWindowsLaunchAtStartupState(app),
        enabled: launchAtStartupSupported,
        click: () => {
          const nextEnabled = !getWindowsLaunchAtStartupState(app);
          const result = setWindowsLaunchAtStartup(app, nextEnabled);
          if (result.ok) {
            const settings = loadSystemSettings(app);
            saveSystemSettings(app, {
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
          context.isQuitting = true;
          app.quit();
        }
      },
      { type: 'separator' },
      {
        label: COPY.uninstall,
        click: () => {
          handleUninstall().catch((error) => {
            console.error('[tray] uninstall action failed', error);
          });
        }
      }
    ]);
    context.tray.setContextMenu(trayMenu);
  }

  function createTray(iconPath) {
    if (context.tray || !fsSync.existsSync(iconPath)) {
      return;
    }

    context.tray = new Tray(iconPath);
    context.tray.setToolTip(APP_PRODUCT_NAME);
    context.tray.on('click', () => {
      if (!context.mainWindowRef) {
        return;
      }
      if (context.mainWindowRef.isVisible()) {
        hideMainWindow();
        return;
      }
      showMainWindow();
    });
    context.tray.on('right-click', () => {
      refreshTrayContextMenu();
    });
    refreshTrayContextMenu();
  }

  return {
    createTray,
    refreshTrayContextMenu
  };
}

module.exports = {
  createTrayManager
};

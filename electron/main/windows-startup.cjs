function isWindowsStartupSupported(app) {
  return process.platform === 'win32' && app.isPackaged;
}

function getWindowsLaunchAtStartupState(app) {
  if (!isWindowsStartupSupported(app)) {
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

function setWindowsLaunchAtStartup(app, enabled) {
  if (!isWindowsStartupSupported(app)) {
    return { ok: false, enabled: false };
  }

  try {
    app.setLoginItemSettings({
      openAtLogin: Boolean(enabled),
      path: process.execPath,
      args: []
    });
    return { ok: true, enabled: getWindowsLaunchAtStartupState(app) };
  } catch (error) {
    console.error('[auto-launch] failed to update openAtLogin', { enabled, error });
    return { ok: false, enabled: getWindowsLaunchAtStartupState(app) };
  }
}

function ensureWindowsAutoLaunchDefault(app, loadSystemSettings, saveSystemSettings) {
  if (!isWindowsStartupSupported(app)) {
    return;
  }

  const settings = loadSystemSettings(app);
  if (settings.launchAtStartupInitialized) {
    return;
  }

  const result = setWindowsLaunchAtStartup(app, true);
  if (!result.ok) {
    return;
  }

  saveSystemSettings(app, {
    ...settings,
    launchAtStartupInitialized: true
  });
}

module.exports = {
  isWindowsStartupSupported,
  getWindowsLaunchAtStartupState,
  setWindowsLaunchAtStartup,
  ensureWindowsAutoLaunchDefault
};

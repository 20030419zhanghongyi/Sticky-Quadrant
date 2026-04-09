function registerIpcHandlers({
  ipcMain,
  app,
  BrowserWindow,
  loadPersistedState,
  savePersistedState,
  hideMainWindow,
  applyWindowMode,
  setGhostMousePassthrough,
  context
}) {
  ipcMain.handle('persistence:load', async () => loadPersistedState(app));
  ipcMain.handle('persistence:save', async (_event, payload) => savePersistedState(app, payload));
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
    context.isQuitting = true;
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
}

module.exports = {
  registerIpcHandlers
};

const fsSync = require('node:fs');
const path = require('node:path');
const { APP_PRODUCT_NAME } = require('./config.cjs');

function findWindowsUninstallerPath(app) {
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

module.exports = {
  findWindowsUninstallerPath
};

const fsSync = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');
const {
  STATE_FILE_NAME,
  STATE_FILE_ENCODING,
  SYSTEM_SETTINGS_FILE_NAME
} = require('./config.cjs');

function getStateFilePath(app) {
  return path.join(app.getPath('userData'), STATE_FILE_NAME);
}

function getSystemSettingsFilePath(app) {
  return path.join(app.getPath('userData'), SYSTEM_SETTINGS_FILE_NAME);
}

function sanitizePersistedJsonText(rawText) {
  if (typeof rawText !== 'string') {
    return '';
  }

  return rawText.replace(/^\uFEFF/, '');
}

function loadSystemSettings(app) {
  try {
    const raw = fsSync.readFileSync(getSystemSettingsFilePath(app), { encoding: STATE_FILE_ENCODING });
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
      filePath: getSystemSettingsFilePath(app),
      error
    });
    return {};
  }
}

function saveSystemSettings(app, settings) {
  const filePath = getSystemSettingsFilePath(app);
  const dir = path.dirname(filePath);
  const serialized = JSON.stringify(settings, null, 2);
  fsSync.mkdirSync(dir, { recursive: true });
  fsSync.writeFileSync(filePath, Buffer.from(serialized, STATE_FILE_ENCODING));
}

async function loadPersistedState(app) {
  try {
    const filePath = getStateFilePath(app);
    const raw = await fs.readFile(filePath, { encoding: STATE_FILE_ENCODING });
    const sanitized = sanitizePersistedJsonText(raw);
    return JSON.parse(sanitized);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }

    console.error('[persistence:load] failed to decode persisted state', {
      filePath: getStateFilePath(app),
      error
    });
    throw error;
  }
}

async function savePersistedState(app, payload) {
  const filePath = getStateFilePath(app);
  const dir = path.dirname(filePath);
  const tempFilePath = `${filePath}.tmp`;
  const serialized = JSON.stringify(payload, null, 2);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(tempFilePath, Buffer.from(serialized, STATE_FILE_ENCODING));
  await fs.rename(tempFilePath, filePath);
  return { ok: true, filePath };
}

module.exports = {
  loadSystemSettings,
  saveSystemSettings,
  loadPersistedState,
  savePersistedState
};

const path = require('node:path');

const APP_ID = 'com.aw.stickyquadrant';
const APP_PRODUCT_NAME = 'Sticky Quadrant';
const APP_ICON_PATH = path.resolve(__dirname, '../../assets/quadrant_bookmark_icon_final.ico');
const STATE_FILE_NAME = 'sticky-quadrant-state.json';
const SYSTEM_SETTINGS_FILE_NAME = 'sticky-quadrant-system-settings.json';
const STATE_FILE_ENCODING = 'utf8';
const COMPACT_WINDOW_WIDTH = 314;
const COMPACT_WINDOW_HEIGHT = 676;
const COMPACT_MARGIN_RIGHT = 48;
const COMPACT_MARGIN_TOP = 65;

module.exports = {
  APP_ID,
  APP_PRODUCT_NAME,
  APP_ICON_PATH,
  STATE_FILE_NAME,
  SYSTEM_SETTINGS_FILE_NAME,
  STATE_FILE_ENCODING,
  COMPACT_WINDOW_WIDTH,
  COMPACT_WINDOW_HEIGHT,
  COMPACT_MARGIN_RIGHT,
  COMPACT_MARGIN_TOP
};

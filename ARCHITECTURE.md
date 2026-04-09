## Architecture

`electron/`
- `main.cjs` is bootstrap only.
- `main/config.cjs` holds app identity, icon, and window constants.
- `main/state-store.cjs` owns persisted file IO.
- `main/windows-startup.cjs` owns Windows login item behavior.
- `main/windows-uninstall.cjs` owns uninstaller discovery.
- `main/window-manager.cjs` owns BrowserWindow lifecycle and window mode changes.
- `main/tray-manager.cjs` owns tray menu construction and tray actions.
- `main/ipc.cjs` owns IPC handler registration.

`src/`
- `app/` owns renderer orchestration, defaults, and persistence shaping.
- `features/sticky-widget/` owns compact widget interaction helpers.
- `features/workspace/` owns workspace layout and sorting rules.
- `lib/electron.ts` is the renderer-side bridge wrapper for Electron APIs.
- `types/sticky.ts` is the shared task/workspace domain model.

Behavior is intentionally unchanged. New work should prefer extending the feature modules instead of growing `App.tsx` or `electron/main.cjs`.

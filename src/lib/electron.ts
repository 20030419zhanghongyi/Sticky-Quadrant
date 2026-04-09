import type { PersistedState } from '../types/sticky';

export async function loadPersistedAppState() {
  return (await window.stickyPersistence?.load()) as PersistedState | null;
}

export async function savePersistedAppState(payload: PersistedState) {
  return window.stickyPersistence?.save(payload);
}

export async function setWindowMode(mode: 'compact' | 'expanded') {
  return window.stickyAppControls?.setWindowMode(mode);
}

export async function setGhostMousePassthrough(enabled: boolean) {
  return window.stickyAppControls?.setGhostMousePassthrough(enabled);
}

export function didIpcCallSucceed(result: unknown) {
  if (!result) {
    return true;
  }

  if (typeof result === 'object' && result !== null && 'ok' in result) {
    return Boolean((result as { ok?: unknown }).ok);
  }

  return true;
}

export {};

declare global {
  interface Window {
    stickyPersistence?: {
      load: () => Promise<unknown>;
      save: (payload: unknown) => Promise<unknown>;
    };
    stickyAppControls?: {
      restart: () => Promise<unknown>;
      hide: () => Promise<unknown>;
      quit: () => Promise<unknown>;
      toggleDebug: () => Promise<unknown>;
      setWindowMode: (mode: 'compact' | 'expanded') => Promise<unknown>;
      setGhostMousePassthrough: (enabled: boolean) => Promise<unknown>;
    };
  }
}

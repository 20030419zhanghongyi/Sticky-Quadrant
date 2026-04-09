export type StickyTask = {
  id: number;
  text: string;
  completed: boolean;
  progressMark: number;
};

export type FinalizedTask = {
  id: number;
  text: string;
};

export type WorkspaceCard = {
  id: number;
  text: string;
  position: {
    x: number;
    y: number;
  };
  isUnmovedSpawn: boolean;
  deployOrder: number | null;
  deployBatch: number | null;
};

export type PersistedState = {
  stickyTasks: StickyTask[];
  workspacePlacedCards: WorkspaceCard[];
  meta: {
    nextTaskId: number;
    nextDeployBatch: number;
    lastUpdatedAt: number;
  };
};

export type DisplayMode = 'normal' | 'ghost';
export type GhostTheme = 'light' | 'dark';

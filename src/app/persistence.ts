import type { PersistedState, WorkspaceCard } from '../types/sticky';

export function toPersistedState(
  stickyTasks: PersistedState['stickyTasks'],
  workspaceCards: WorkspaceCard[],
  nextTaskId: number
): PersistedState {
  const workspacePlacedCards = workspaceCards.filter((card) => !card.isUnmovedSpawn);
  const maxDeployBatch = workspacePlacedCards.reduce((max, card) => Math.max(max, card.deployBatch ?? 0), 0);

  return {
    stickyTasks,
    workspacePlacedCards,
    meta: {
      nextTaskId,
      nextDeployBatch: maxDeployBatch + 1,
      lastUpdatedAt: Date.now()
    }
  };
}

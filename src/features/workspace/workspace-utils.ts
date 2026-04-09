import type { WorkspaceCard } from '../../types/sticky';

export type CardPosition = WorkspaceCard['position'];

export type DebugCard = {
  id: number;
  text: string;
  centerX: number;
  centerY: number;
  group: 'right' | 'left';
};

export type SortDebugResult = {
  rightGroupSorted: DebugCard[];
  leftGroupPriorityOrder: DebugCard[];
  finalList: DebugCard[];
};

export const WORKSPACE_LAYOUT = {
  stackStep: 44,
  cardEstimatedHeight: 82,
  inputTopOffset: 252,
  downSafeEdgeOffset: 0,
  upInputSafeGap: 16,
  noSpaceToastMs: 1800,
  maxCards: 20
};

export function getTrashHotzoneRect(trashElement: HTMLElement | null) {
  if (!trashElement) {
    return null;
  }

  const rect = trashElement.getBoundingClientRect();
  const expand = 24;
  return {
    left: rect.left - expand,
    right: rect.right + expand,
    top: rect.top - expand,
    bottom: rect.bottom + expand
  };
}

export function isCardOverTrashHotzone(cardId: number, trashElement: HTMLElement | null) {
  const hotzoneRect = getTrashHotzoneRect(trashElement);
  if (!hotzoneRect) {
    return false;
  }

  const cardElement = document.querySelector<HTMLElement>(`[data-card-id="${cardId}"]`);
  if (!cardElement) {
    return false;
  }

  const cardRect = cardElement.getBoundingClientRect();
  const overlapWidth = Math.min(cardRect.right, hotzoneRect.right) - Math.max(cardRect.left, hotzoneRect.left);
  const overlapHeight = Math.min(cardRect.bottom, hotzoneRect.bottom) - Math.max(cardRect.top, hotzoneRect.top);

  return overlapWidth > 0 && overlapHeight > 0;
}

export function getStackedSpawnPosition(unmovedCount: number, viewport: { width: number; height: number }): CardPosition | null {
  const baseX = viewport.width / 2;
  const baseY = viewport.height / 2;
  const cardHalfHeight = WORKSPACE_LAYOUT.cardEstimatedHeight / 2;
  const downSafeEdge = viewport.height - WORKSPACE_LAYOUT.downSafeEdgeOffset;
  const maxDownCenterY = downSafeEdge - cardHalfHeight;
  const maxDownCount = Math.max(0, Math.floor((maxDownCenterY - baseY) / WORKSPACE_LAYOUT.stackStep) + 1);

  if (unmovedCount < maxDownCount) {
    return { x: baseX, y: baseY + unmovedCount * WORKSPACE_LAYOUT.stackStep };
  }

  const upwardIndex = unmovedCount - maxDownCount + 1;
  const upwardY = baseY - upwardIndex * WORKSPACE_LAYOUT.stackStep;
  const inputTop = viewport.height / 2 - WORKSPACE_LAYOUT.inputTopOffset;
  const inputSafetyTop = inputTop - WORKSPACE_LAYOUT.upInputSafeGap;
  const maxAllowedCenterY = inputSafetyTop - cardHalfHeight;

  if (upwardY < maxAllowedCenterY) {
    return null;
  }

  return { x: baseX, y: upwardY };
}

function toDebugCard(card: WorkspaceCard, group: 'right' | 'left'): DebugCard {
  return {
    id: card.id,
    text: card.text,
    centerX: Math.round(card.position.x),
    centerY: Math.round(card.position.y),
    group
  };
}

export function getFinalSortSettlement(cards: WorkspaceCard[], centerX: number): SortDebugResult {
  const settledCards = cards.filter((card) => !card.isUnmovedSpawn);
  const unmovedCards = cards.filter((card) => card.isUnmovedSpawn);

  const rightGroupSorted = settledCards
    .filter((card) => card.position.x >= centerX)
    .sort((a, b) => {
      if (b.position.x !== a.position.x) {
        return b.position.x - a.position.x;
      }
      return a.position.y - b.position.y;
    })
    .map((card) => toDebugCard(card, 'right'));

  const leftGroupPriorityOrder = settledCards
    .filter((card) => card.position.x < centerX)
    .sort((a, b) => {
      if (b.position.y !== a.position.y) {
        return b.position.y - a.position.y;
      }
      return b.position.x - a.position.x;
    })
    .map((card) => toDebugCard(card, 'left'));

  const appendedUnmovedCards = unmovedCards.map((card) => toDebugCard(card, 'right'));

  return {
    rightGroupSorted,
    leftGroupPriorityOrder,
    finalList: [...rightGroupSorted, ...[...leftGroupPriorityOrder].reverse(), ...appendedUnmovedCards]
  };
}

export function buildBatchToneById(cards: WorkspaceCard[]) {
  const deployedCards = cards.filter((card) => !card.isUnmovedSpawn && card.deployBatch !== null);
  const batchToneById = new Map<number, 1 | 2 | 3 | 4>();
  const uniqueBatches = [...new Set(deployedCards.map((card) => card.deployBatch as number))].sort((a, b) => a - b);
  const toneByBatch = new Map<number, 1 | 2 | 3 | 4>();

  uniqueBatches.forEach((batch, index) => {
    const tone = (index < 3 ? index + 1 : 4) as 1 | 2 | 3 | 4;
    toneByBatch.set(batch, tone);
  });

  deployedCards.forEach((card) => {
    const tone = toneByBatch.get(card.deployBatch as number) ?? 4;
    batchToneById.set(card.id, tone);
  });

  return batchToneById;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import AxisStage from './AxisStage';
import TaskCard from './TaskCard';
import TaskInputPlaceholder from './TaskInputPlaceholder';
import TrashZonePlaceholder from './TrashZonePlaceholder';
import '../styles/expanded-workspace.css';

type CardPosition = {
  x: number;
  y: number;
};

type CardItem = {
  id: number;
  text: string;
  position: CardPosition;
  isUnmovedSpawn: boolean;
  deployOrder: number | null;
  deployBatch: number | null;
};

type ExpandedWorkspaceProps = {
  onClose: () => void;
  onFinalize: (finalList: Array<{ id: number; text: string }>) => void;
  onTaskDelete: (id: number) => void;
  cards: CardItem[];
  onCardsChange: Dispatch<SetStateAction<CardItem[]>>;
  allocateTaskId: () => number;
};

type DebugCard = {
  id: number;
  text: string;
  centerX: number;
  centerY: number;
  group: 'right' | 'left';
};

type SortDebugResult = {
  rightGroupSorted: DebugCard[];
  leftGroupPriorityOrder: DebugCard[];
  finalList: DebugCard[];
};

function ExpandedWorkspace({ onClose, onFinalize, onTaskDelete, cards, onCardsChange, allocateTaskId }: ExpandedWorkspaceProps) {
  const STACK_STEP = 44;
  const CARD_ESTIMATED_HEIGHT = 82;
  const INPUT_TOP_OFFSET = 252;
  const DOWN_SAFE_EDGE_OFFSET = 0;
  const UP_INPUT_SAFE_GAP = 16;
  const NO_SPACE_TOAST_MS = 1800;

  const [inputValue, setInputValue] = useState('');
  const [noSpaceToast, setNoSpaceToast] = useState(false);
  const [sortDebug, setSortDebug] = useState<SortDebugResult | null>(null);
  const trashRef = useRef<HTMLElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const sessionDeployBatchRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const getTrashHotzoneRect = () => {
    const trashElement = trashRef.current;
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
  };

  const isCardOverTrashHotzone = (id: number) => {
    const hotzoneRect = getTrashHotzoneRect();
    if (!hotzoneRect) {
      return false;
    }

    const cardElement = document.querySelector<HTMLElement>(`[data-card-id="${id}"]`);
    if (!cardElement) {
      return false;
    }

    const cardRect = cardElement.getBoundingClientRect();
    const overlapWidth = Math.min(cardRect.right, hotzoneRect.right) - Math.max(cardRect.left, hotzoneRect.left);
    const overlapHeight = Math.min(cardRect.bottom, hotzoneRect.bottom) - Math.max(cardRect.top, hotzoneRect.top);

    return overlapWidth > 0 && overlapHeight > 0;
  };

  const getStackedSpawnPosition = (unmovedCount: number): CardPosition | null => {
    const baseX = window.innerWidth / 2;
    const baseY = window.innerHeight / 2;
    const cardHalfHeight = CARD_ESTIMATED_HEIGHT / 2;
    const downSafeEdge = window.innerHeight - DOWN_SAFE_EDGE_OFFSET;
    const maxDownCenterY = downSafeEdge - cardHalfHeight;
    const maxDownCount = Math.max(0, Math.floor((maxDownCenterY - baseY) / STACK_STEP) + 1);

    if (unmovedCount < maxDownCount) {
      return { x: baseX, y: baseY + unmovedCount * STACK_STEP };
    }

    const upwardIndex = unmovedCount - maxDownCount + 1;
    const upwardY = baseY - upwardIndex * STACK_STEP;
    const inputTop = window.innerHeight / 2 - INPUT_TOP_OFFSET;
    const inputSafetyTop = inputTop - UP_INPUT_SAFE_GAP;
    const maxAllowedCenterY = inputSafetyTop - cardHalfHeight;

    if (upwardY < maxAllowedCenterY) {
      return null;
    }

    return { x: baseX, y: upwardY };
  };

  const toDebugCard = (card: CardItem, group: 'right' | 'left'): DebugCard => ({
    id: card.id,
    text: card.text,
    centerX: Math.round(card.position.x),
    centerY: Math.round(card.position.y),
    group
  });

  const runFinalSortSettlement = useCallback(
    (publishDebug = true): SortDebugResult => {
      const centerX = window.innerWidth / 2;
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
      const finalList = [...rightGroupSorted, ...[...leftGroupPriorityOrder].reverse(), ...appendedUnmovedCards];
      const debugResult: SortDebugResult = { rightGroupSorted, leftGroupPriorityOrder, finalList };

      if (publishDebug) {
        setSortDebug(debugResult);
        console.log('rightGroupSorted', rightGroupSorted);
        console.log('leftGroupPriorityOrder', leftGroupPriorityOrder);
        console.log('finalList', finalList);
      }

      return debugResult;
    },
    [cards]
  );

  const handleUnifiedExit = useCallback(() => {
    const result = runFinalSortSettlement(false);
    onFinalize(
      result.finalList.map((item) => ({
        id: item.id,
        text: item.text
      }))
    );
    onClose();
  }, [onClose, onFinalize, runFinalSortSettlement]);

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      handleUnifiedExit();
      return;
    }

    const totalCards = cards.length;
    if (totalCards >= 20) {
      return;
    }

    const unmovedCount = cards.filter((card) => card.isUnmovedSpawn).length;
    const spawnPosition = getStackedSpawnPosition(unmovedCount);
    if (!spawnPosition) {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      setNoSpaceToast(true);
      toastTimerRef.current = window.setTimeout(() => {
        setNoSpaceToast(false);
      }, NO_SPACE_TOAST_MS);
      return;
    }

    const id = allocateTaskId();

    onCardsChange((previous) => [
      ...previous,
      {
        id,
        text: trimmed,
        position: spawnPosition,
        isUnmovedSpawn: true,
        deployOrder: null,
        deployBatch: null
      }
    ]);
    setInputValue('');
    focusInput();
  };

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.preventDefault();
      handleUnifiedExit();
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [handleUnifiedExit]);

  useEffect(() => {
    if (cards.length === 0) {
      focusInput();
    }
  }, [cards.length, focusInput]);

  const handleCardPositionChange = (id: number, position: CardPosition) => {
    onCardsChange((previous) =>
      previous.map((card) => {
        if (card.id !== id) {
          return card;
        }
        return { ...card, position };
      })
    );
  };

  const handleCardDrop = (id: number, position: CardPosition, wasMoved: boolean) => {
    const shouldDelete = isCardOverTrashHotzone(id);

    if (shouldDelete) {
      onTaskDelete(id);
      return;
    }

    onCardsChange((previous) =>
      previous.map((card) => {
        if (card.id !== id) {
          return card;
        }
        if (card.isUnmovedSpawn && wasMoved) {
          if (sessionDeployBatchRef.current === null) {
            const maxDeployBatch = previous.reduce((max, current) => Math.max(max, current.deployBatch ?? 0), 0);
            sessionDeployBatchRef.current = maxDeployBatch + 1;
          }
          const maxDeployOrder = previous.reduce((max, current) => Math.max(max, current.deployOrder ?? 0), 0);
          const deployOrder = card.deployOrder ?? maxDeployOrder + 1;
          const deployBatch = card.deployBatch ?? sessionDeployBatchRef.current;
          return { ...card, position, isUnmovedSpawn: false, deployOrder, deployBatch };
        }
        return { ...card, position };
      })
    );
  };

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

  return (
    <section className="expanded-workspace" aria-label="Expanded task workspace">
      <div className="expanded-fog-layer">
        <div className="quadrant quadrant-top-left" />
        <div className="quadrant quadrant-top-right" />
        <div className="quadrant quadrant-bottom-left" />
        <div className="quadrant quadrant-bottom-right" />
      </div>
      <button type="button" className="expanded-close-button" onClick={handleUnifiedExit}>
        Close
      </button>
      <AxisStage />
      <TaskInputPlaceholder ref={inputRef} value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} />
      {cards.map((card) => (
        <TaskCard
          key={card.id}
          id={card.id}
          text={card.text}
          position={card.position}
          draggable
          toneLevel={card.isUnmovedSpawn ? null : batchToneById.get(card.id) ?? 4}
          onPositionChange={handleCardPositionChange}
          onDrop={handleCardDrop}
        />
      ))}
      <div className="task-card-stage-placeholder" aria-hidden="true" />
      <TrashZonePlaceholder ref={trashRef} />
      {noSpaceToast ? <div className="spawn-toast">Please place or remove some cards first</div> : null}
      {sortDebug ? (
        <aside className="sort-debug-panel" aria-label="Sort debug panel">
          <h3>Sort Debug</h3>
          <p>Right group</p>
          {sortDebug.rightGroupSorted.map((card, index) => (
            <div key={`r-${card.id}`}>
              {index + 1}. {card.text} ({card.centerX}, {card.centerY})
            </div>
          ))}
          <p>Left group</p>
          {sortDebug.leftGroupPriorityOrder.map((card, index) => (
            <div key={`l-${card.id}`}>
              {index + 1}. {card.text} ({card.centerX}, {card.centerY})
            </div>
          ))}
          <p>Final list</p>
          {sortDebug.finalList.map((card, index) => (
            <div key={`f-${card.id}`}>
              {index + 1}. [{card.group}] {card.text} ({card.centerX}, {card.centerY})
            </div>
          ))}
        </aside>
      ) : null}
    </section>
  );
}

export default ExpandedWorkspace;

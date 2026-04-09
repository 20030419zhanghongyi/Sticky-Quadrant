import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import AxisStage from './AxisStage';
import TaskCard from './TaskCard';
import TaskInputPlaceholder from './TaskInputPlaceholder';
import TrashZonePlaceholder from './TrashZonePlaceholder';
import {
  WORKSPACE_LAYOUT,
  buildBatchToneById,
  getFinalSortSettlement,
  getStackedSpawnPosition,
  isCardOverTrashHotzone,
  type CardPosition,
  type SortDebugResult
} from '../features/workspace/workspace-utils';
import type { FinalizedTask, WorkspaceCard } from '../types/sticky';
import '../styles/expanded-workspace.css';

type ExpandedWorkspaceProps = {
  onClose: () => void;
  onFinalize: (finalList: FinalizedTask[]) => void;
  onTaskDelete: (id: number) => void;
  cards: WorkspaceCard[];
  onCardsChange: Dispatch<SetStateAction<WorkspaceCard[]>>;
  allocateTaskId: () => number;
};

function ExpandedWorkspace({ onClose, onFinalize, onTaskDelete, cards, onCardsChange, allocateTaskId }: ExpandedWorkspaceProps) {
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

  const runFinalSortSettlement = useCallback(
    (publishDebug = true) => {
      const debugResult = getFinalSortSettlement(cards, window.innerWidth / 2);

      if (publishDebug) {
        setSortDebug(debugResult);
        console.log('rightGroupSorted', debugResult.rightGroupSorted);
        console.log('leftGroupPriorityOrder', debugResult.leftGroupPriorityOrder);
        console.log('finalList', debugResult.finalList);
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

    if (cards.length >= WORKSPACE_LAYOUT.maxCards) {
      return;
    }

    const unmovedCount = cards.filter((card) => card.isUnmovedSpawn).length;
    const spawnPosition = getStackedSpawnPosition(unmovedCount, {
      width: window.innerWidth,
      height: window.innerHeight
    });

    if (!spawnPosition) {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      setNoSpaceToast(true);
      toastTimerRef.current = window.setTimeout(() => {
        setNoSpaceToast(false);
      }, WORKSPACE_LAYOUT.noSpaceToastMs);
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
    if (isCardOverTrashHotzone(id, trashRef.current)) {
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

  const batchToneById = buildBatchToneById(cards);

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

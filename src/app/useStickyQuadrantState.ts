import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_STICKY_TASKS,
  FULLSCREEN_STABILIZE_DELAY_MS,
  INITIAL_NEXT_TASK_ID,
  PERSISTENCE_SAVE_DELAY_MS
} from './defaults';
import { toPersistedState } from './persistence';
import {
  didIpcCallSucceed,
  loadPersistedAppState,
  savePersistedAppState,
  setGhostMousePassthrough,
  setWindowMode
} from '../lib/electron';
import type { DisplayMode, FinalizedTask, GhostTheme, StickyTask, WorkspaceCard } from '../types/sticky';

export function useStickyQuadrantState() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEnteringExpanded, setIsEnteringExpanded] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('normal');
  const [ghostTheme, setGhostTheme] = useState<GhostTheme>('light');
  const [stickyTasks, setStickyTasks] = useState<StickyTask[]>(DEFAULT_STICKY_TASKS);
  const [workspaceCards, setWorkspaceCards] = useState<WorkspaceCard[]>([]);
  const [nextTaskId, setNextTaskId] = useState(INITIAL_NEXT_TASK_ID);
  const hasHydratedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        const loaded = await loadPersistedAppState();
        if (!loaded || cancelled) {
          hasHydratedRef.current = true;
          return;
        }

        if (Array.isArray(loaded.stickyTasks) && loaded.stickyTasks.length > 0) {
          setStickyTasks(loaded.stickyTasks);
        }
        if (Array.isArray(loaded.workspacePlacedCards)) {
          setWorkspaceCards(loaded.workspacePlacedCards.filter((card) => !card.isUnmovedSpawn));
        }
        if (loaded.meta && typeof loaded.meta.nextTaskId === 'number' && loaded.meta.nextTaskId > 0) {
          setNextTaskId(loaded.meta.nextTaskId);
        }
      } catch (error) {
        console.error('Failed to load persisted state, fallback to defaults.', error);
      } finally {
        if (!cancelled) {
          hasHydratedRef.current = true;
        }
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedRef.current || !window.stickyPersistence) {
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      const payload = toPersistedState(stickyTasks, workspaceCards, nextTaskId);
      savePersistedAppState(payload).catch((error) => console.error('Failed to save persisted state.', error));
    }, PERSISTENCE_SAVE_DELAY_MS);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [nextTaskId, stickyTasks, workspaceCards]);

  useEffect(() => {
    return () => {
      setGhostMousePassthrough(false);
    };
  }, []);

  const enterExpanded = async () => {
    if (isExpanded || isEnteringExpanded) {
      return;
    }

    setIsEnteringExpanded(true);
    try {
      const modeResult = await setWindowMode('expanded');
      if (!didIpcCallSucceed(modeResult)) {
        return;
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, FULLSCREEN_STABILIZE_DELAY_MS);
      });
      setIsExpanded(true);
    } finally {
      setIsEnteringExpanded(false);
    }
  };

  const exitExpanded = () => {
    setWorkspaceCards((previous) => previous.filter((card) => !card.isUnmovedSpawn));
    setIsExpanded(false);
    setWindowMode('compact');
  };

  const finalizeTasks = (finalList: FinalizedTask[]) => {
    const progressById = new Map(stickyTasks.map((task) => [task.id, task.progressMark]));
    const nextTasks = finalList.slice(0, 9).map((item) => ({
      id: item.id,
      text: item.text,
      completed: false,
      progressMark: progressById.get(item.id) ?? 0
    }));
    setStickyTasks(nextTasks);
  };

  const allocateTaskId = () => {
    const id = nextTaskId;
    setNextTaskId((previous) => previous + 1);
    return id;
  };

  const completeTask = (id: number) => {
    setStickyTasks((previous) => previous.filter((task) => task.id !== id));
    setWorkspaceCards((previous) => previous.filter((card) => card.id !== id));
  };

  const updateTaskProgress = (id: number, progressMark: number) => {
    setStickyTasks((previous) =>
      previous.map((task) => {
        if (task.id !== id) {
          return task;
        }
        return { ...task, progressMark };
      })
    );
  };

  return {
    state: {
      isExpanded,
      isEnteringExpanded,
      displayMode,
      ghostTheme,
      stickyTasks,
      workspaceCards
    },
    actions: {
      setDisplayMode,
      setGhostTheme,
      setWorkspaceCards,
      enterExpanded,
      exitExpanded,
      finalizeTasks,
      allocateTaskId,
      completeTask,
      updateTaskProgress
    }
  };
}

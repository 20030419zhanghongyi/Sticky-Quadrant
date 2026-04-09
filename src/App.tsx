import { useEffect, useRef, useState } from 'react';
import ExpandedWorkspace from './components/ExpandedWorkspace';
import StickyWidget from './components/StickyWidget';

type StickyTask = {
  id: number;
  text: string;
  completed: boolean;
  progressMark: number;
};

type FinalizedTask = {
  id: number;
  text: string;
};

type WorkspaceCard = {
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

type PersistedState = {
  stickyTasks: StickyTask[];
  workspacePlacedCards: WorkspaceCard[];
  meta: {
    nextTaskId: number;
    nextDeployBatch: number;
    lastUpdatedAt: number;
  };
};

type DisplayMode = 'normal' | 'ghost';
type GhostTheme = 'light' | 'dark';

const DEFAULT_STICKY_TASKS: StickyTask[] = [
  { id: 1, text: '左键展开工作区', completed: false, progressMark: 0 },
  { id: 2, text: '右键打开控制菜单', completed: false, progressMark: 0 },
  { id: 3, text: '回车生成任务卡片', completed: false, progressMark: 0 },
  { id: 4, text: '拖动完成优先部署', completed: false, progressMark: 0 },
  { id: 5, text: '涂抹即可标记进度', completed: false, progressMark: 0 },
  { id: 6, text: '作者：张二本', completed: false, progressMark: 0 },
  { id: 7, text: '邮箱：20030419zhanghongyi@gmail.com', completed: false, progressMark: 0 }
];
const FULLSCREEN_STABILIZE_DELAY_MS = 300;

function App() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEnteringExpanded, setIsEnteringExpanded] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('normal');
  const [ghostTheme, setGhostTheme] = useState<GhostTheme>('light');
  const [stickyTasks, setStickyTasks] = useState<StickyTask[]>(DEFAULT_STICKY_TASKS);
  const [workspaceCards, setWorkspaceCards] = useState<WorkspaceCard[]>([]);
  const [nextTaskId, setNextTaskId] = useState(8);
  const hasHydratedRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        if (!window.stickyPersistence) {
          hasHydratedRef.current = true;
          return;
        }

        const loaded = (await window.stickyPersistence.load()) as PersistedState | null;
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
      const workspacePlacedCards = workspaceCards.filter((card) => !card.isUnmovedSpawn);
      const maxDeployBatch = workspacePlacedCards.reduce((max, card) => Math.max(max, card.deployBatch ?? 0), 0);
      const payload: PersistedState = {
        stickyTasks,
        workspacePlacedCards,
        meta: {
          nextTaskId,
          nextDeployBatch: maxDeployBatch + 1,
          lastUpdatedAt: Date.now()
        }
      };

      window.stickyPersistence
        .save(payload)
        .catch((error) => console.error('Failed to save persisted state.', error));
    }, 350);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [stickyTasks, workspaceCards, nextTaskId]);

  useEffect(() => {
    return () => {
      window.stickyAppControls?.setGhostMousePassthrough(false);
    };
  }, []);

  const handleEnterExpanded = async () => {
    if (isExpanded || isEnteringExpanded) {
      return;
    }

    setIsEnteringExpanded(true);
    try {
      const modeResult = await window.stickyAppControls?.setWindowMode('expanded');
      const modeOk =
        !modeResult ||
        (typeof modeResult === 'object' && modeResult !== null && 'ok' in modeResult
          ? Boolean((modeResult as { ok?: unknown }).ok)
          : true);

      if (!modeOk) {
        return;
      }

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, FULLSCREEN_STABILIZE_DELAY_MS);
      });
      setIsExpanded(true);
    } finally {
      setIsEnteringExpanded(false);
    }
  };

  const handleExitExpanded = () => {
    setWorkspaceCards((previous) => previous.filter((card) => !card.isUnmovedSpawn));
    setIsExpanded(false);
    window.stickyAppControls?.setWindowMode('compact');
  };

  const handleFinalize = (finalList: FinalizedTask[]) => {
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

  const handleTaskComplete = (id: number) => {
    setStickyTasks((previous) => previous.filter((task) => task.id !== id));
    setWorkspaceCards((previous) => previous.filter((card) => card.id !== id));
  };

  const handleTaskProgressChange = (id: number, progressMark: number) => {
    setStickyTasks((previous) =>
      previous.map((task) => {
        if (task.id !== id) {
          return task;
        }
        return { ...task, progressMark };
      })
    );
  };

  return (
    <main className="app-root">
      {isExpanded ? (
        <ExpandedWorkspace
          onClose={handleExitExpanded}
          onFinalize={handleFinalize}
          onTaskDelete={handleTaskComplete}
          cards={workspaceCards}
          onCardsChange={setWorkspaceCards}
          allocateTaskId={allocateTaskId}
        />
      ) : null}
      {!isEnteringExpanded ? (
        <StickyWidget
          displayMode={displayMode}
          ghostTheme={ghostTheme}
          isExpanded={isExpanded}
          onBookmarkClick={handleEnterExpanded}
          onDisplayModeChange={setDisplayMode}
          onGhostThemeChange={setGhostTheme}
          tasks={stickyTasks}
          onTaskComplete={handleTaskComplete}
          onTaskProgressChange={handleTaskProgressChange}
        />
      ) : null}
    </main>
  );
}

export default App;

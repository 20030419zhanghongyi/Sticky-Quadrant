import { useLayoutEffect, useRef, useState } from 'react';
import BookmarkRibbon from './BookmarkRibbon';
import TaskItem from './TaskItem';
import '../styles/sticky-widget.css';

type StickyTask = {
  id: number;
  text: string;
  completed: boolean;
  progressMark: number;
};

type DisplayMode = 'normal' | 'ghost';
type GhostTheme = 'light' | 'dark';

type StickyWidgetProps = {
  displayMode: DisplayMode;
  ghostTheme: GhostTheme;
  isExpanded: boolean;
  onBookmarkClick: () => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onGhostThemeChange: (theme: GhostTheme) => void;
  tasks: StickyTask[];
  onTaskComplete: (id: number) => void;
  onTaskProgressChange: (id: number, progressMark: number) => void;
};

function StickyWidget({
  displayMode,
  ghostTheme,
  isExpanded,
  onBookmarkClick,
  onDisplayModeChange,
  onGhostThemeChange,
  tasks,
  onTaskComplete,
  onTaskProgressChange
}: StickyWidgetProps) {
  const [ghostInteractive, setGhostInteractive] = useState(false);
  const [visibleTaskCount, setVisibleTaskCount] = useState(tasks.length);
  const [isMeasuringVisibleCount, setIsMeasuringVisibleCount] = useState(false);
  const isGhostMode = displayMode === 'ghost';
  const appliedPassthroughRef = useRef<boolean | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    if (isGhostMode) {
      setVisibleTaskCount(tasks.length);
      setIsMeasuringVisibleCount(false);
      return;
    }

    setIsMeasuringVisibleCount(true);
  }, [isExpanded, isGhostMode, tasks]);

  useLayoutEffect(() => {
    if (isGhostMode || !isMeasuringVisibleCount) {
      return;
    }

    const computeVisibleTaskCount = () => {
      const paperElement = paperRef.current;
      const listElement = listRef.current;
      if (!paperElement || !listElement) {
        setVisibleTaskCount(tasks.length);
        setIsMeasuringVisibleCount(false);
        return;
      }

      const paperRect = paperElement.getBoundingClientRect();
      const taskElements = Array.from(listElement.querySelectorAll<HTMLLIElement>(':scope > .task-item'));
      let nextVisibleCount = taskElements.length;

      for (let index = 0; index < taskElements.length; index += 1) {
        const taskRect = taskElements[index].getBoundingClientRect();
        if (taskRect.bottom > paperRect.bottom) {
          nextVisibleCount = index;
          break;
        }
      }

      console.log('[sticky-widget] compact refresh', {
        sortedTaskCount: tasks.length,
        visibleTaskCount: nextVisibleCount,
        renderedTaskCount: Math.min(tasks.length, nextVisibleCount),
        measuringRenderedCount: taskElements.length
      });

      setVisibleTaskCount((currentCount) => (currentCount === nextVisibleCount ? currentCount : nextVisibleCount));
      setIsMeasuringVisibleCount(false);
    };

    const rafId = window.requestAnimationFrame(() => {
      computeVisibleTaskCount();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isGhostMode, isMeasuringVisibleCount, tasks]);

  useLayoutEffect(() => {
    return () => {
      appliedPassthroughRef.current = false;
      window.stickyAppControls?.setGhostMousePassthrough(false);
    };
  }, []);

  useLayoutEffect(() => {
    const enablePassthrough = isGhostMode && !ghostInteractive && !isExpanded;
    if (appliedPassthroughRef.current === enablePassthrough) {
      return;
    }

    appliedPassthroughRef.current = enablePassthrough;
    window.stickyAppControls?.setGhostMousePassthrough(enablePassthrough);
  }, [ghostInteractive, isExpanded, isGhostMode]);

  const renderedTasks = isGhostMode || isMeasuringVisibleCount ? tasks : tasks.slice(0, visibleTaskCount);

  return (
    <aside
      className={`sticky-widget ${isExpanded ? 'is-expanded' : ''} ${isGhostMode ? 'is-ghost' : ''} ${
        isGhostMode ? `is-ghost-theme-${ghostTheme}` : ''
      }`}
      aria-label="Task widget preview"
    >
      <div ref={paperRef} className={`sticky-paper ${isGhostMode ? 'is-ghost' : ''}`}>
        <ul ref={listRef} className={`sticky-widget-list ${isGhostMode ? 'is-ghost' : ''}`}>
          {renderedTasks.map((task) => (
            <TaskItem
              key={task.id}
              id={task.id}
              text={task.text}
              progressMark={task.progressMark}
              interactionDisabled={isGhostMode}
              onComplete={onTaskComplete}
              onProgressChange={onTaskProgressChange}
            />
          ))}
        </ul>
        <BookmarkRibbon
          ghostTheme={ghostTheme}
          displayMode={displayMode}
          onClick={onBookmarkClick}
          onDisplayModeChange={onDisplayModeChange}
          onGhostInteractableChange={setGhostInteractive}
          onGhostThemeChange={onGhostThemeChange}
        />
      </div>
    </aside>
  );
}

export default StickyWidget;

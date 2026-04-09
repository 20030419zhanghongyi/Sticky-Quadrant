import { useRef, useState } from 'react';
import BookmarkRibbon from './BookmarkRibbon';
import TaskItem from './TaskItem';
import { useGhostPassthrough } from '../features/sticky-widget/useGhostPassthrough';
import { useVisibleTaskCount } from '../features/sticky-widget/useVisibleTaskCount';
import type { DisplayMode, GhostTheme, StickyTask } from '../types/sticky';
import '../styles/sticky-widget.css';

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
  const isGhostMode = displayMode === 'ghost';
  const paperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { visibleTaskCount, isMeasuringVisibleCount } = useVisibleTaskCount({
    isExpanded,
    isGhostMode,
    tasks,
    paperRef,
    listRef
  });

  useGhostPassthrough({
    isGhostMode,
    ghostInteractive,
    isExpanded
  });

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

import { useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { StickyTask } from '../../types/sticky';

export function useVisibleTaskCount({
  isExpanded,
  isGhostMode,
  tasks,
  paperRef,
  listRef
}: {
  isExpanded: boolean;
  isGhostMode: boolean;
  tasks: StickyTask[];
  paperRef: RefObject<HTMLDivElement>;
  listRef: RefObject<HTMLUListElement>;
}) {
  const [visibleTaskCount, setVisibleTaskCount] = useState(tasks.length);
  const [isMeasuringVisibleCount, setIsMeasuringVisibleCount] = useState(false);

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

    const rafId = window.requestAnimationFrame(computeVisibleTaskCount);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [isGhostMode, isMeasuringVisibleCount, listRef, paperRef, tasks]);

  return {
    visibleTaskCount,
    isMeasuringVisibleCount
  };
}

import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEventHandler } from 'react';

type TaskItemProps = {
  id: number;
  text: string;
  progressMark: number;
  interactionDisabled?: boolean;
  onComplete: (id: number) => void;
  onProgressChange: (id: number, progressMark: number) => void;
};

type ProgressGeometry =
  | { mode: 'single' }
  | {
      mode: 'multi';
      width: number;
    };

const MULTILINE_PROGRESS_EXTRA_WIDTH = 38;

function getRenderedLineCount(element: HTMLElement) {
  const textNode = element.firstChild;
  if (!textNode) {
    return 1;
  }

  const range = document.createRange();
  range.selectNodeContents(textNode);
  const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
  range.detach?.();
  return Math.max(1, rects.length);
}

function TaskItem({ id, text, progressMark, interactionDisabled = false, onComplete, onProgressChange }: TaskItemProps) {
  const [isDone, setIsDone] = useState(false);
  const [progressGeometry, setProgressGeometry] = useState<ProgressGeometry>({ mode: 'single' });
  const rowRef = useRef<HTMLLIElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (interactionDisabled) {
      return;
    }

    const updateProgressGeometry = () => {
      const rowElement = rowRef.current;
      const textElement = textRef.current;
      if (!rowElement || !textElement) {
        return;
      }

      const lineCount = getRenderedLineCount(textElement);
      if (lineCount <= 1) {
        setProgressGeometry((current) => (current.mode === 'single' ? current : { mode: 'single' }));
        return;
      }

      const rowRect = rowElement.getBoundingClientRect();
      const nextWidth =
        progressMark <= 0
          ? 0
          : Math.max(0, Math.min(rowRect.width, progressMark * rowRect.width + MULTILINE_PROGRESS_EXTRA_WIDTH));
      setProgressGeometry((current) => {
        if (current.mode === 'multi' && Math.abs(current.width - nextWidth) < 0.5) {
          return current;
        }
        return { mode: 'multi', width: nextWidth };
      });
    };

    updateProgressGeometry();

    const resizeObserver = new ResizeObserver(() => {
      updateProgressGeometry();
    });

    if (rowRef.current) {
      resizeObserver.observe(rowRef.current);
    }
    if (textRef.current) {
      resizeObserver.observe(textRef.current);
    }
    window.addEventListener('resize', updateProgressGeometry);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateProgressGeometry);
    };
  }, [interactionDisabled, progressMark, text]);

  const handleComplete = () => {
    if (interactionDisabled || isDone) {
      return;
    }
    setIsDone(true);
    window.setTimeout(() => {
      onComplete(id);
    }, 360);
  };

  const clampProgress = (value: number) => Math.max(0, Math.min(1, value));

  const computeProgressFromClientX = (clientX: number) => {
    const rowElement = rowRef.current;
    if (!rowElement) {
      return progressMark;
    }
    const rect = rowElement.getBoundingClientRect();
    return clampProgress((clientX - rect.left) / rect.width);
  };

  const handleRowPointerDown: PointerEventHandler<HTMLLIElement> = (event) => {
    if (interactionDisabled) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('.task-marker')) {
      return;
    }

    const applyProgress = (clientX: number) => {
      onProgressChange(id, computeProgressFromClientX(clientX));
    };

    applyProgress(event.clientX);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      applyProgress(moveEvent.clientX);
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const isMultiLineProgress = !interactionDisabled && progressGeometry.mode === 'multi';
  const progressStyle: CSSProperties | undefined = !interactionDisabled
    ? progressGeometry.mode === 'single'
      ? { width: `${progressMark * 100}%` }
      : { width: `${progressGeometry.width}px` }
    : undefined;

  return (
    <li ref={rowRef} className={`task-item ${interactionDisabled ? 'is-ghost' : ''} ${isMultiLineProgress ? 'is-multiline' : ''}`} onPointerDown={handleRowPointerDown}>
      {!interactionDisabled ? (
        <span className={`task-progress-layer ${isMultiLineProgress ? 'is-multiline' : 'is-singleline'}`} style={progressStyle} />
      ) : null}
      {interactionDisabled ? (
        <span className="task-marker task-marker-ghost" aria-hidden="true" />
      ) : (
        <button
          type="button"
          className={`task-marker ${isDone ? 'task-marker-checked' : ''}`}
          onClick={handleComplete}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={`Complete ${text}`}
        />
      )}
      <span ref={textRef} className="task-text">{text}</span>
    </li>
  );
}

export default TaskItem;


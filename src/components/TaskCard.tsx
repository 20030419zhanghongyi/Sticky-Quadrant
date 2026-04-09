import { useEffect, useRef, useState } from 'react';
import type { MouseEventHandler } from 'react';

type Position = {
  x: number;
  y: number;
};

type TaskCardProps = {
  id: number;
  text: string;
  position: Position;
  draggable: boolean;
  toneLevel?: 1 | 2 | 3 | 4 | null;
  onPositionChange: (id: number, position: Position) => void;
  onDrop?: (id: number, position: Position, wasMoved: boolean) => void;
};

type DragState = {
  offsetX: number;
  offsetY: number;
} | null;

function TaskCard({ id, text, position, draggable, toneLevel = null, onPositionChange, onDrop }: TaskCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const latestPositionRef = useRef(position);
  const movedDuringDragRef = useRef(false);

  useEffect(() => {
    latestPositionRef.current = position;
  }, [position]);

  useEffect(() => {
    if (!dragState || !draggable) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const cardElement = cardRef.current;
      if (!cardElement) {
        return;
      }

      const width = cardElement.offsetWidth;
      const height = cardElement.offsetHeight;
      const maxLeft = window.innerWidth - width;
      const maxTop = window.innerHeight - height;
      const nextLeft = Math.max(0, Math.min(maxLeft, event.clientX - dragState.offsetX));
      const nextTop = Math.max(0, Math.min(maxTop, event.clientY - dragState.offsetY));

      const nextPosition = {
        x: nextLeft + width / 2,
        y: nextTop + height / 2
      };

      latestPositionRef.current = nextPosition;
      movedDuringDragRef.current = true;
      onPositionChange(id, nextPosition);
    };

    const handleMouseUp = () => {
      setDragState(null);
      onDrop?.(id, latestPositionRef.current, movedDuringDragRef.current);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, draggable, id, onDrop, onPositionChange]);

  const handleMouseDown: MouseEventHandler<HTMLDivElement> = (event) => {
    if (!draggable) {
      return;
    }
    movedDuringDragRef.current = false;
    const rect = event.currentTarget.getBoundingClientRect();
    setDragState({
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    });
  };

  return (
    <div
      ref={cardRef}
      className={`task-card ${draggable ? 'task-card-active' : 'task-card-placed'} ${toneLevel ? `task-card-tone-${toneLevel}` : ''}`}
      data-card-id={id}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={handleMouseDown}
    >
      {text}
    </div>
  );
}

export default TaskCard;

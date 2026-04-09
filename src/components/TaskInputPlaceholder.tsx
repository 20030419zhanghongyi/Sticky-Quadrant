import { forwardRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

type TaskInputPlaceholderProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

const TaskInputPlaceholder = forwardRef<HTMLInputElement, TaskInputPlaceholderProps>(function TaskInputPlaceholder(
  { value, onChange, onSubmit },
  ref
) {
  const [isComposing, setIsComposing] = useState(false);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }
    if (isComposing || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="task-input-slot" aria-label="Task input area">
      <input
        ref={ref}
        className="task-input-placeholder"
        placeholder="Type a task..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
      />
    </div>
  );
});

export default TaskInputPlaceholder;

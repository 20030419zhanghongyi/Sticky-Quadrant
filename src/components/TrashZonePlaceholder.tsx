import { forwardRef } from 'react';

const TrashZonePlaceholder = forwardRef<HTMLElement>(function TrashZonePlaceholder(_, ref) {
  return (
    <aside ref={ref} className="trash-zone-placeholder" aria-label="Delete zone placeholder">
      <svg className="trash-bin-svg" viewBox="0 0 44 56" aria-hidden="true">
        <rect x="15" y="1.5" width="14" height="6" rx="1" ry="1" />
        <rect x="4" y="9.5" width="36" height="6" rx="1" ry="1" />
        <path d="M5 16.5 L39 16.5 L33 54.5 L11 54.5 Z" />
      </svg>
    </aside>
  );
});

export default TrashZonePlaceholder;

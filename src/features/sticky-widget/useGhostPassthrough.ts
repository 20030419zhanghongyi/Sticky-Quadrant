import { useLayoutEffect, useRef } from 'react';
import { setGhostMousePassthrough } from '../../lib/electron';

export function useGhostPassthrough({
  isGhostMode,
  ghostInteractive,
  isExpanded
}: {
  isGhostMode: boolean;
  ghostInteractive: boolean;
  isExpanded: boolean;
}) {
  const appliedPassthroughRef = useRef<boolean | null>(null);

  useLayoutEffect(() => {
    return () => {
      appliedPassthroughRef.current = false;
      setGhostMousePassthrough(false);
    };
  }, []);

  useLayoutEffect(() => {
    const enablePassthrough = isGhostMode && !ghostInteractive && !isExpanded;
    if (appliedPassthroughRef.current === enablePassthrough) {
      return;
    }

    appliedPassthroughRef.current = enablePassthrough;
    setGhostMousePassthrough(enablePassthrough);
  }, [ghostInteractive, isExpanded, isGhostMode]);
}

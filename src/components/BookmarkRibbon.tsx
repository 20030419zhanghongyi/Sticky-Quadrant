import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEventHandler } from 'react';
import ghostMaskBody from '../../assets/ghost-mask-body.png';
import ghostMaskLaptop from '../../assets/ghost-mask-laptop.png';
import ghostMaskFace from '../../assets/ghost-mask-face.png';

type DisplayMode = 'normal' | 'ghost';
type GhostTheme = 'light' | 'dark';

type BookmarkRibbonProps = {
  ghostTheme: GhostTheme;
  displayMode: DisplayMode;
  onClick: () => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onGhostInteractableChange: (interactive: boolean) => void;
  onGhostThemeChange: (theme: GhostTheme) => void;
};

type GhostMaskStyle = CSSProperties & {
  '--ghost-mask-body': string;
  '--ghost-mask-laptop': string;
  '--ghost-mask-face': string;
};

const ENTER_HIT_PADDING = 14;
const EXIT_HIT_PADDING = 8;

function GhostWorkingIcon({ theme }: { theme: GhostTheme }) {
  const maskStyle: GhostMaskStyle = {
    '--ghost-mask-body': `url(${ghostMaskBody})`,
    '--ghost-mask-laptop': `url(${ghostMaskLaptop})`,
    '--ghost-mask-face': `url(${ghostMaskFace})`
  };

  return (
    <span className={`ghost-bookmark-art is-${theme}`} style={maskStyle} aria-hidden="true">
      <span className="ghost-bookmark-layer ghost-bookmark-body" />
      <span className="ghost-bookmark-layer ghost-bookmark-laptop" />
      <span className="ghost-bookmark-layer ghost-bookmark-face" />
    </span>
  );
}

function BookmarkRibbon({
  ghostTheme,
  displayMode,
  onClick,
  onDisplayModeChange,
  onGhostInteractableChange,
  onGhostThemeChange
}: BookmarkRibbonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isGhostMode = displayMode === 'ghost';
  const interactableRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const container = wrapRef.current;
      if (!container) {
        return;
      }
      if (container.contains(event.target as Node)) {
        return;
      }
      setMenuOpen(false);
      if (interactableRef.current) {
        interactableRef.current = false;
        onGhostInteractableChange(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [menuOpen, onGhostInteractableChange]);

  useEffect(() => {
    if (!isGhostMode) {
      interactableRef.current = false;
      onGhostInteractableChange(false);
      return;
    }

    if (menuOpen) {
      interactableRef.current = true;
      onGhostInteractableChange(true);
      return;
    }

    const isWithinHitZone = (point: { x: number; y: number }, rect: DOMRect, padding: number) =>
      point.x >= rect.left - padding &&
      point.x <= rect.right + padding &&
      point.y >= rect.top - padding &&
      point.y <= rect.bottom + padding;

    const evaluatePointerHit = () => {
      rafRef.current = null;
      const point = pendingPointRef.current;
      const container = wrapRef.current;
      if (!point || !container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const nextInteractive = interactableRef.current
        ? isWithinHitZone(point, rect, EXIT_HIT_PADDING)
        : isWithinHitZone(point, rect, ENTER_HIT_PADDING);

      if (nextInteractive === interactableRef.current) {
        return;
      }

      interactableRef.current = nextInteractive;
      onGhostInteractableChange(nextInteractive);
    };

    const handlePointerMove = (event: MouseEvent) => {
      pendingPointRef.current = { x: event.clientX, y: event.clientY };
      if (rafRef.current !== null) {
        return;
      }
      rafRef.current = window.requestAnimationFrame(evaluatePointerHit);
    };

    const handleMouseLeave = () => {
      pendingPointRef.current = null;
      if (!interactableRef.current) {
        return;
      }
      interactableRef.current = false;
      onGhostInteractableChange(false);
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pendingPointRef.current = null;
      if (interactableRef.current) {
        interactableRef.current = false;
        onGhostInteractableChange(false);
      }
    };
  }, [isGhostMode, menuOpen, onGhostInteractableChange]);

  const handleContextMenu: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    if (!interactableRef.current) {
      interactableRef.current = true;
      onGhostInteractableChange(true);
    }
    setMenuOpen(true);
  };

  const handleQuit = async () => {
    setMenuOpen(false);
    await window.stickyAppControls?.quit();
  };

  const handleGhostThemeEnter = (theme: GhostTheme) => {
    setMenuOpen(false);
    onGhostThemeChange(theme);
    if (!isGhostMode) {
      onDisplayModeChange('ghost');
    }
  };

  const handleDisplayModeToggle = () => {
    setMenuOpen(false);
    if (interactableRef.current) {
      interactableRef.current = false;
      onGhostInteractableChange(false);
    }
    onDisplayModeChange('normal');
  };

  return (
    <div ref={wrapRef} className={`bookmark-menu-wrap ${isGhostMode ? 'is-ghost' : ''}`}>
      <button
        type="button"
        className={`bookmark-ribbon ${isGhostMode ? 'is-ghost' : ''}`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        aria-label={isGhostMode ? 'Open task panel from Ghost Mode' : 'Open task panel'}
        title="Open"
      >
        {isGhostMode ? <GhostWorkingIcon theme={ghostTheme} /> : null}
      </button>
      {menuOpen ? (
        <div
          className={`bookmark-context-menu ${isGhostMode ? 'is-ghost' : ''}`}
          role="menu"
          onContextMenu={(event) => event.preventDefault()}
        >
          <button type="button" className="bookmark-context-item" role="menuitem" onClick={() => handleGhostThemeEnter('light')}>
            Ghost Light
          </button>
          <button type="button" className="bookmark-context-item" role="menuitem" onClick={() => handleGhostThemeEnter('dark')}>
            Ghost Dark
          </button>
          <button type="button" className="bookmark-context-item" role="menuitem" onClick={handleDisplayModeToggle}>
            Sticky Note
          </button>
          <button type="button" className="bookmark-context-item" role="menuitem" onClick={handleQuit}>
            Quit
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default BookmarkRibbon;

import type { InputState } from './types';

type DirectionKey = 'up' | 'down' | 'left' | 'right';

/**
 * Keyboard + virtual touch input manager.
 * Uses real pointerType === 'touch' events rather than capability sniffing so touch
 * laptops keep touch overlays hidden until touched.
 */
export class InputManager {
  private readonly keysDown = new Set<string>();
  private readonly touchDirs = new Set<DirectionKey>();
  private touchAction = false;
  private pauseQueued = false;
  private touchActive = false;
  private readonly onTouchModeChange?: (active: boolean) => void;
  private readonly touchCleanups: (() => void)[] = [];

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const code = event.code;
    if (
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight' ||
      code === 'Space'
    ) {
      event.preventDefault();
    }

    if ((code === 'Escape' || code === 'KeyP') && !event.repeat) {
      this.pauseQueued = true;
    }

    this.keysDown.add(code);
    this.setTouchActive(false);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keysDown.delete(event.code);
  };

  private readonly handleBlur = (): void => {
    this.keysDown.clear();
    this.touchDirs.clear();
    this.touchAction = false;
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      this.setTouchActive(true);
    } else if (event.pointerType === 'mouse') {
      this.setTouchActive(false);
    }
  };

  constructor(options?: {
    touchRoot?: HTMLElement | null;
    onTouchModeChange?: (active: boolean) => void;
  }) {
    this.onTouchModeChange = options?.onTouchModeChange;

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      window.addEventListener('blur', this.handleBlur);
      window.addEventListener('pointerdown', this.handlePointerDown, { passive: true });
    }

    if (options?.touchRoot) {
      this.bindTouchControls(options.touchRoot);
    }
  }

  private setTouchActive(active: boolean): void {
    if (this.touchActive === active) return;
    this.touchActive = active;
    this.onTouchModeChange?.(active);
  }

  private bindTouchControls(root: HTMLElement): void {
    const dirButtons = root.querySelectorAll<HTMLButtonElement>('[data-dir]');
    for (const btn of dirButtons) {
      const dir = btn.dataset.dir as DirectionKey | undefined;
      if (!dir) continue;

      const down = (e: PointerEvent): void => {
        e.preventDefault();
        this.touchDirs.add(dir);
      };
      const up = (e: PointerEvent): void => {
        e.preventDefault();
        this.touchDirs.delete(dir);
      };

      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);

      this.touchCleanups.push(() => {
        btn.removeEventListener('pointerdown', down);
        btn.removeEventListener('pointerup', up);
        btn.removeEventListener('pointercancel', up);
        btn.removeEventListener('pointerleave', up);
      });
    }

    const actionBtn = root.querySelector<HTMLButtonElement>('#btn-touch-action');
    if (actionBtn) {
      const down = (e: PointerEvent): void => {
        e.preventDefault();
        this.touchAction = true;
      };
      const up = (e: PointerEvent): void => {
        e.preventDefault();
        this.touchAction = false;
      };
      actionBtn.addEventListener('pointerdown', down);
      actionBtn.addEventListener('pointerup', up);
      actionBtn.addEventListener('pointercancel', up);
      actionBtn.addEventListener('pointerleave', up);

      this.touchCleanups.push(() => {
        actionBtn.removeEventListener('pointerdown', down);
        actionBtn.removeEventListener('pointerup', up);
        actionBtn.removeEventListener('pointercancel', up);
        actionBtn.removeEventListener('pointerleave', up);
      });
    }
  }

  readState(): InputState {
    let moveX = 0;
    let moveY = 0;

    if (this.keysDown.has('ArrowLeft') || this.keysDown.has('KeyA') || this.touchDirs.has('left')) {
      moveX -= 1;
    }
    if (this.keysDown.has('ArrowRight') || this.keysDown.has('KeyD') || this.touchDirs.has('right')) {
      moveX += 1;
    }
    if (this.keysDown.has('ArrowUp') || this.keysDown.has('KeyW') || this.touchDirs.has('up')) {
      moveY -= 1;
    }
    if (this.keysDown.has('ArrowDown') || this.keysDown.has('KeyS') || this.touchDirs.has('down')) {
      moveY += 1;
    }

    const pausePressed = this.pauseQueued;
    this.pauseQueued = false;

    return {
      moveX,
      moveY,
      action:
        this.keysDown.has('Space') || this.keysDown.has('ShiftLeft') || this.touchAction,
      pausePressed,
    };
  }

  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('blur', this.handleBlur);
      window.removeEventListener('pointerdown', this.handlePointerDown);
    }
    for (const cleanup of this.touchCleanups) {
      cleanup();
    }
    this.touchCleanups.length = 0;
  }
}

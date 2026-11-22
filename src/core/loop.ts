import type { InputManager } from './input';
import type { GameSimulation } from './simulation';
import type { IRenderer } from './types';

export const FIXED_DT = 1 / 60;
const MAX_FRAME_DELTA = 0.1;

/**
 * Fixed-timestep 60 Hz accumulator loop with visibility auto-pause and deterministic
 * manual stepping for automated Playwright verification.
 */
export class GameLoop {
  private readonly sim: GameSimulation;
  private readonly renderer: IRenderer;
  private readonly input: InputManager;

  private rafId: number | null = null;
  private lastTimestamp = 0;
  private accumulator = 0;
  private pausedClock = false;

  private readonly handleVisibilityChange = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.lastTimestamp = 0;
    }
  };

  private readonly frame = (timestamp: number): void => {
    if (this.pausedClock) {
      this.rafId = null;
      return;
    }

    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.lastTimestamp = timestamp;
      this.rafId = window.requestAnimationFrame(this.frame);
      return;
    }

    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
    }

    const rawDelta = Math.min(MAX_FRAME_DELTA, Math.max(0, (timestamp - this.lastTimestamp) / 1000));
    this.lastTimestamp = timestamp;
    this.accumulator += rawDelta;

    while (this.accumulator >= FIXED_DT) {
      this.sim.update(FIXED_DT, this.input.readState());
      this.accumulator -= FIXED_DT;
    }

    const alpha = this.accumulator / FIXED_DT;
    this.renderer.render(this.sim.getSnapshot(), alpha);
    this.rafId = window.requestAnimationFrame(this.frame);
  };

  constructor(options: {
    simulation: GameSimulation;
    renderer: IRenderer;
    input: InputManager;
    startPaused?: boolean;
  }) {
    this.sim = options.simulation;
    this.renderer = options.renderer;
    this.input = options.input;
    this.pausedClock = options.startPaused ?? false;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  start(): void {
    this.renderer.render(this.sim.getSnapshot(), 0);
    if (this.pausedClock || this.rafId !== null || typeof window === 'undefined') return;
    this.lastTimestamp = 0;
    this.rafId = window.requestAnimationFrame(this.frame);
  }

  stepManual(ms: number): void {
    const steps = Math.max(1, Math.round(ms / (FIXED_DT * 1000)));
    for (let i = 0; i < steps; i++) {
      this.sim.update(FIXED_DT, this.input.readState());
    }
    this.renderer.render(this.sim.getSnapshot(), 0);
  }

  renderNow(): void {
    this.renderer.render(this.sim.getSnapshot(), 0);
  }

  dispose(): void {
    if (this.rafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
}

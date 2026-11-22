import type { GameLoop } from '../core/loop';
import type { GameSimulation } from '../core/simulation';
import type { IRenderer } from '../core/types';

declare global {
  interface Window {
    advanceTime?: (ms: number) => void;
    render_game_to_text?: () => string;
    resetGame?: (seed?: number) => void;
  }
}

export function shouldEnableTestHooks(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('test') === '1';
}

/**
 * Exposes deterministic advanceTime(ms) and render_game_to_text() hooks for automated
 * Playwright / Chrome DevTools MCP playtesting in dev and ?test=1 builds.
 */
export function installTestHooks(options: {
  simulation: GameSimulation;
  loop: GameLoop;
  renderer: IRenderer;
}): void {
  if (typeof window === 'undefined' || !shouldEnableTestHooks()) return;

  const { simulation, loop, renderer } = options;

  window.advanceTime = (ms: number): void => {
    loop.stepManual(ms);
  };

  window.resetGame = (seed?: number): void => {
    simulation.reset(seed);
    loop.renderNow();
  };

  window.render_game_to_text = (): string => {
    const s = simulation.getSnapshot();
    return JSON.stringify({
      engine: renderer.engineName,
      phase: s.phase,
      seed: s.seed,
      tick: s.tick,
      elapsedMs: s.elapsedMs,
      score: s.score,
      bestScore: s.bestScore,
      player: {
        x: Math.round(s.player.x),
        y: Math.round(s.player.y),
        hp: s.player.hp,
      },
      collectiblesCount: s.collectibles.length,
      hazardsCount: s.hazards.length,
      activeCollisions: s.activeCollisions,
    });
  };
}

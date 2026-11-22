import { describe, expect, it } from 'vitest';
import { EventBus } from '../../src/core/eventBus';
import { DEFAULT_WORLD, GameSimulation } from '../../src/core/simulation';
import type { GameEvents, InputState } from '../../src/core/types';

const IDLE_INPUT: InputState = {
  moveX: 0,
  moveY: 0,
  action: false,
  pausePressed: false,
};

describe('GameSimulation', () => {
  it('produces identical snapshots for identical seeds and input sequences', () => {
    const simA = new GameSimulation({ bus: new EventBus<GameEvents>(), seed: 42 });
    const simB = new GameSimulation({ bus: new EventBus<GameEvents>(), seed: 42 });

    simA.start();
    simB.start();

    const moveRight: InputState = { moveX: 1, moveY: -0.5, action: true, pausePressed: false };
    for (let i = 0; i < 45; i++) {
      simA.update(1 / 60, i < 20 ? moveRight : IDLE_INPUT);
      simB.update(1 / 60, i < 20 ? moveRight : IDLE_INPUT);
    }

    expect(simA.getSnapshot()).toEqual(simB.getSnapshot());
    expect(simA.getSnapshot().tick).toBe(45);
  });

  it('transitions menu -> playing -> paused -> playing -> menu cleanly', () => {
    const bus = new EventBus<GameEvents>();
    const phases: string[] = [];
    bus.on('phase:changed', (p) => phases.push(p));

    const sim = new GameSimulation({ bus, seed: 7 });
    expect(sim.getSnapshot().phase).toBe('menu');

    sim.start();
    expect(sim.getSnapshot().phase).toBe('playing');

    sim.update(1 / 60, { ...IDLE_INPUT, pausePressed: true });
    expect(sim.getSnapshot().phase).toBe('paused');

    const frozenTick = sim.getSnapshot().tick;
    sim.update(1 / 60, { ...IDLE_INPUT, moveX: 1 });
    expect(sim.getSnapshot().tick).toBe(frozenTick);

    sim.togglePause();
    expect(sim.getSnapshot().phase).toBe('playing');

    sim.reset(99);
    expect(sim.getSnapshot().phase).toBe('menu');
    expect(sim.getSnapshot().seed).toBe(99);
    expect(phases).toEqual(['playing', 'paused', 'playing', 'menu']);
  });

  it('clamps player position inside the 800x450 logical arena bounds', () => {
    const sim = new GameSimulation({ bus: new EventBus<GameEvents>(), seed: 10 });
    sim.start();

    const rightInput: InputState = { moveX: 1, moveY: 0, action: false, pausePressed: false };
    for (let i = 0; i < 180; i++) {
      sim.update(1 / 60, rightInput);
    }

    const snap = sim.getSnapshot();
    expect(snap.player.x).toBeLessThanOrEqual(DEFAULT_WORLD.width - snap.player.radius - 8);
    expect(snap.player.x).toBeGreaterThan(DEFAULT_WORLD.width * 0.8);
  });
});

import './style.css';
import { AudioEngine } from './core/audio';
import { EventBus } from './core/eventBus';
import { InputManager } from './core/input';
import { GameLoop } from './core/loop';
import { GameSimulation } from './core/simulation';
import { SafeStorage } from './core/storage';
import type { GameEvents } from './core/types';
import { installTestHooks } from './debug/testHooks';
import { createRenderer } from './renderer/renderer';
import { HudController } from './ui/hud';

async function bootstrap(): Promise<void> {
  const stage = document.getElementById('game-stage');
  if (!stage) {
    throw new Error('Missing #game-stage element in index.html');
  }

  const params = new URLSearchParams(window.location.search);
  const isTestMode = params.get('test') === '1';
  const rawSeed = Number(params.get('seed'));
  const seed = Number.isFinite(rawSeed) && rawSeed > 0 ? Math.floor(rawSeed) : 1337;

  const storage = new SafeStorage();
  const bus = new EventBus<GameEvents>();
  const audio = new AudioEngine(storage);
  const simulation = new GameSimulation({ bus, storage, seed });

  const hud = new HudController({ bus, simulation, audio });
  const input = new InputManager({
    touchRoot: document.getElementById('touch-controls'),
    onTouchModeChange: (active) => hud.setTouchActive(active),
  });

  const renderer = createRenderer();
  await renderer.init(stage);

  const loop = new GameLoop({
    simulation,
    renderer,
    input,
    startPaused: isTestMode,
  });

  installTestHooks({ simulation, loop, renderer });
  loop.start();

  const onResize = (): void => {
    renderer.resize(stage.clientWidth || window.innerWidth, stage.clientHeight || window.innerHeight);
    loop.renderNow();
  };
  window.addEventListener('resize', onResize);

  const cleanup = (): void => {
    window.removeEventListener('resize', onResize);
    loop.dispose();
    renderer.dispose();
    input.dispose();
    hud.dispose();
    audio.dispose();
    bus.clear();
  };
  window.addEventListener('beforeunload', cleanup, { once: true });
}

void bootstrap();

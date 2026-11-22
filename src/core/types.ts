export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover';

export type SfxName = 'start' | 'pickup' | 'hit' | 'gameover' | 'pause';

export interface Vec2 {
  x: number;
  y: number;
}

export interface InputState {
  moveX: number;
  moveY: number;
  action: boolean;
  pausePressed: boolean;
}

export interface WorldConfig {
  readonly width: number;
  readonly height: number;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  invulnTimer: number;
  dashTimer: number;
  dashCooldown: number;
  facingX: number;
  facingY: number;
}

export interface Collectible {
  id: number;
  x: number;
  y: number;
  radius: number;
  value: number;
  pulsePhase: number;
}

export interface Hazard {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
}

export interface GameSnapshot {
  phase: GamePhase;
  seed: number;
  tick: number;
  elapsedMs: number;
  score: number;
  bestScore: number;
  combo: number;
  world: WorldConfig;
  player: PlayerState;
  collectibles: readonly Collectible[];
  hazards: readonly Hazard[];
  activeCollisions: readonly string[];
  shakeTimer: number;
  flashTimer: number;
}

export interface IRenderer {
  readonly engineName: string;
  init(container: HTMLElement): Promise<void> | void;
  render(snapshot: GameSnapshot, alpha: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export interface GameEvents {
  'state:changed': GameSnapshot;
  'phase:changed': GamePhase;
  'score:changed': { score: number; bestScore: number; combo: number };
  'sfx:play': SfxName;
}

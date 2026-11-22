import type { EventBus } from './eventBus';
import { SeededRng } from './rng';
import type { SafeStorage } from './storage';
import type {
  Collectible,
  GameEvents,
  GamePhase,
  GameSnapshot,
  Hazard,
  InputState,
  PlayerState,
  WorldConfig,
} from './types';

const BEST_SCORE_KEY = 'vibe_webgame_best_score';

export const DEFAULT_WORLD: WorldConfig = {
  width: 800,
  height: 450,
};

const PLAYER_SPEED = 270;
const DASH_SPEED = 520;
const DASH_DURATION = 0.14;
const DASH_COOLDOWN = 0.85;
const INVULN_DURATION = 1.0;

/**
 * Pure TypeScript gameplay simulation with zero DOM/Canvas/Engine dependencies.
 * Replace or extend entities/rules here while keeping the renderer & UI adapters intact.
 */
export class GameSimulation {
  private readonly bus: EventBus<GameEvents>;
  private readonly storage?: SafeStorage;
  private readonly rng: SeededRng;
  private readonly world: WorldConfig;

  private seed: number;
  private phase: GamePhase = 'menu';
  private tick = 0;
  private elapsedMs = 0;
  private score = 0;
  private bestScore = 0;
  private combo = 1;
  private nextEntityId = 1;
  private shakeTimer = 0;
  private flashTimer = 0;
  private activeCollisions: string[] = [];

  private player!: PlayerState;
  private collectibles: Collectible[] = [];
  private hazards: Hazard[] = [];

  constructor(options: {
    bus: EventBus<GameEvents>;
    storage?: SafeStorage;
    seed?: number;
    world?: WorldConfig;
  }) {
    this.bus = options.bus;
    this.storage = options.storage;
    this.seed = options.seed ?? 1337;
    this.rng = new SeededRng(this.seed);
    this.world = options.world ?? DEFAULT_WORLD;
    this.bestScore = this.storage?.getNumber(BEST_SCORE_KEY, 0) ?? 0;

    this.initEntities();
  }

  private initEntities(): void {
    this.tick = 0;
    this.elapsedMs = 0;
    this.score = 0;
    this.combo = 1;
    this.nextEntityId = 1;
    this.shakeTimer = 0;
    this.flashTimer = 0;
    this.activeCollisions = [];

    this.player = {
      x: this.world.width * 0.5,
      y: this.world.height * 0.5,
      vx: 0,
      vy: 0,
      radius: 16,
      hp: 3,
      maxHp: 3,
      invulnTimer: 0,
      dashTimer: 0,
      dashCooldown: 0,
      facingX: 1,
      facingY: 0,
    };

    this.collectibles = [];
    for (let i = 0; i < 4; i++) {
      this.spawnCollectible();
    }

    this.hazards = [];
    for (let i = 0; i < 3; i++) {
      this.spawnHazard();
    }
  }

  private spawnCollectible(): void {
    const pad = 42;
    const x = this.rng.range(pad, this.world.width - pad);
    const y = this.rng.range(pad, this.world.height - pad);
    this.collectibles.push({
      id: this.nextEntityId++,
      x,
      y,
      radius: 11,
      value: 10,
      pulsePhase: this.rng.range(0, Math.PI * 2),
    });
  }

  private spawnHazard(): void {
    const edge = this.rng.int(0, 4);
    const pad = 32;
    let x = pad;
    let y = pad;
    if (edge === 0) {
      x = this.rng.range(pad, this.world.width - pad);
      y = pad;
    } else if (edge === 1) {
      x = this.world.width - pad;
      y = this.rng.range(pad, this.world.height - pad);
    } else if (edge === 2) {
      x = this.rng.range(pad, this.world.width - pad);
      y = this.world.height - pad;
    } else {
      x = pad;
      y = this.rng.range(pad, this.world.height - pad);
    }

    const angle = this.rng.range(0.35, Math.PI * 2 - 0.35);
    const speed = this.rng.range(115, 165);

    this.hazards.push({
      id: this.nextEntityId++,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 14,
      angle: 0,
    });
  }

  start(): void {
    if (this.phase === 'gameover') {
      this.reset(this.seed);
    }
    this.setPhase('playing');
    this.bus.emit('sfx:play', 'start');
    this.emitState();
  }

  togglePause(): void {
    if (this.phase === 'playing') {
      this.setPhase('paused');
      this.bus.emit('sfx:play', 'pause');
      this.emitState();
    } else if (this.phase === 'paused') {
      this.setPhase('playing');
      this.bus.emit('sfx:play', 'pause');
      this.emitState();
    }
  }

  reset(nextSeed?: number): void {
    if (nextSeed !== undefined) {
      this.seed = nextSeed;
    }
    this.rng.reset(this.seed);
    this.initEntities();
    this.setPhase('menu');
    this.bus.emit('score:changed', {
      score: this.score,
      bestScore: this.bestScore,
      combo: this.combo,
    });
    this.emitState();
  }

  update(dt: number, input: InputState): void {
    if (input.pausePressed && (this.phase === 'playing' || this.phase === 'paused')) {
      this.togglePause();
      return;
    }

    if (this.phase !== 'playing') return;

    this.tick += 1;
    this.elapsedMs += dt * 1000;
    this.activeCollisions = [];

    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - dt);
    if (this.player.invulnTimer > 0) {
      this.player.invulnTimer = Math.max(0, this.player.invulnTimer - dt);
    }
    if (this.player.dashTimer > 0) {
      this.player.dashTimer = Math.max(0, this.player.dashTimer - dt);
    }
    if (this.player.dashCooldown > 0) {
      this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    }

    let ix = input.moveX;
    let iy = input.moveY;
    const len = Math.hypot(ix, iy);
    if (len > 0) {
      ix /= len;
      iy /= len;
      this.player.facingX = ix;
      this.player.facingY = iy;
    }

    if (input.action && this.player.dashCooldown <= 0 && len > 0) {
      this.player.dashTimer = DASH_DURATION;
      this.player.dashCooldown = DASH_COOLDOWN;
    }

    const activeSpeed = this.player.dashTimer > 0 ? DASH_SPEED : PLAYER_SPEED;
    this.player.vx = ix * activeSpeed;
    this.player.vy = iy * activeSpeed;

    this.player.x = clamp(
      this.player.x + this.player.vx * dt,
      this.player.radius + 8,
      this.world.width - this.player.radius - 8,
    );
    this.player.y = clamp(
      this.player.y + this.player.vy * dt,
      this.player.radius + 8,
      this.world.height - this.player.radius - 8,
    );

    for (const c of this.collectibles) {
      c.pulsePhase += dt * 4.5;
    }

    for (const h of this.hazards) {
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.angle += dt * 2.5;

      if (h.x - h.radius < 8) {
        h.x = h.radius + 8;
        h.vx = Math.abs(h.vx);
      } else if (h.x + h.radius > this.world.width - 8) {
        h.x = this.world.width - h.radius - 8;
        h.vx = -Math.abs(h.vx);
      }

      if (h.y - h.radius < 8) {
        h.y = h.radius + 8;
        h.vy = Math.abs(h.vy);
      } else if (h.y + h.radius > this.world.height - 8) {
        h.y = this.world.height - h.radius - 8;
        h.vy = -Math.abs(h.vy);
      }
    }

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      const dist = Math.hypot(this.player.x - c.x, this.player.y - c.y);
      if (dist <= this.player.radius + c.radius) {
        this.activeCollisions.push(`star:${c.id}`);
        this.score += c.value * this.combo;
        this.combo = Math.min(5, this.combo + 1);
        if (this.score > this.bestScore) {
          this.bestScore = this.score;
          this.storage?.setNumber(BEST_SCORE_KEY, this.bestScore);
        }
        this.collectibles.splice(i, 1);
        this.spawnCollectible();
        if (this.score > 0 && this.score % 100 === 0 && this.hazards.length < 7) {
          this.spawnHazard();
        }
        this.bus.emit('sfx:play', 'pickup');
        this.bus.emit('score:changed', {
          score: this.score,
          bestScore: this.bestScore,
          combo: this.combo,
        });
      }
    }

    if (this.player.invulnTimer <= 0) {
      for (const h of this.hazards) {
        const dist = Math.hypot(this.player.x - h.x, this.player.y - h.y);
        if (dist <= this.player.radius + h.radius) {
          this.activeCollisions.push(`hazard:${h.id}`);
          this.player.hp = Math.max(0, this.player.hp - 1);
          this.player.invulnTimer = INVULN_DURATION;
          this.combo = 1;
          this.shakeTimer = 0.22;
          this.flashTimer = 0.16;

          if (this.player.hp <= 0) {
            this.setPhase('gameover');
            this.bus.emit('sfx:play', 'gameover');
          } else {
            this.bus.emit('sfx:play', 'hit');
          }
          break;
        }
      }
    }

    this.emitState();
  }

  getSnapshot(): GameSnapshot {
    return {
      phase: this.phase,
      seed: this.seed,
      tick: this.tick,
      elapsedMs: Math.round(this.elapsedMs),
      score: this.score,
      bestScore: this.bestScore,
      combo: this.combo,
      world: { ...this.world },
      player: { ...this.player },
      collectibles: this.collectibles.map((c) => ({ ...c })),
      hazards: this.hazards.map((h) => ({ ...h })),
      activeCollisions: [...this.activeCollisions],
      shakeTimer: this.shakeTimer,
      flashTimer: this.flashTimer,
    };
  }

  private setPhase(next: GamePhase): void {
    if (this.phase === next) return;
    this.phase = next;
    this.bus.emit('phase:changed', next);
  }

  private emitState(): void {
    this.bus.emit('state:changed', this.getSnapshot());
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

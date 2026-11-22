import * as Phaser from 'phaser';
import type { GameSnapshot, IRenderer } from '../core/types';

class ArenaScene extends Phaser.Scene {
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private latestSnapshot: GameSnapshot | null = null;

  constructor() {
    super('ArenaScene');
  }

  create(): void {
    this.graphics = this.add.graphics();
    if (this.latestSnapshot) {
      this.drawSnapshot(this.latestSnapshot);
    }
  }

  drawSnapshot(snapshot: GameSnapshot): void {
    this.latestSnapshot = snapshot;
    const g = this.graphics;
    if (!g) return;

    g.clear();

    const shakeX = snapshot.shakeTimer > 0 ? Math.sin(snapshot.tick * 1.9) * 5 : 0;
    const shakeY = snapshot.shakeTimer > 0 ? Math.cos(snapshot.tick * 2.3) * 5 : 0;

    g.fillStyle(0x0f172a, 1);
    g.fillRect(0, 0, snapshot.world.width, snapshot.world.height);

    g.lineStyle(1, 0x94a3b8, 0.08);
    for (let x = 40; x < snapshot.world.width; x += 40) {
      g.lineBetween(x + shakeX, 8 + shakeY, x + shakeX, snapshot.world.height - 8 + shakeY);
    }
    for (let y = 40; y < snapshot.world.height; y += 40) {
      g.lineBetween(8 + shakeX, y + shakeY, snapshot.world.width - 8 + shakeX, y + shakeY);
    }

    g.lineStyle(3, snapshot.flashTimer > 0 ? 0xf43f5e : 0x38bdf8, 0.45);
    g.strokeRect(8 + shakeX, 8 + shakeY, snapshot.world.width - 16, snapshot.world.height - 16);

    for (const c of snapshot.collectibles) {
      const pulse = 1 + Math.sin(c.pulsePhase) * 0.14;
      g.fillStyle(0xfacc15, 0.22);
      g.fillCircle(c.x + shakeX, c.y + shakeY, c.radius * 1.45 * pulse);
      g.fillStyle(0xfacc15, 1);
      g.fillCircle(c.x + shakeX, c.y + shakeY, c.radius * pulse);
    }

    for (const h of snapshot.hazards) {
      g.fillStyle(0xf43f5e, 1);
      const size = h.radius * 1.7;
      g.fillRect(h.x - size * 0.5 + shakeX, h.y - size * 0.5 + shakeY, size, size);
      g.lineStyle(2, 0xfda4af, 1);
      g.strokeRect(h.x - size * 0.5 + shakeX, h.y - size * 0.5 + shakeY, size, size);
    }

    const blinkHidden =
      snapshot.player.invulnTimer > 0 && Math.floor(snapshot.player.invulnTimer * 18) % 2 === 0;
    if (!blinkHidden) {
      const p = snapshot.player;
      const color = snapshot.flashTimer > 0 ? 0xffffff : p.dashTimer > 0 ? 0x7dd3fc : 0x38bdf8;
      g.fillStyle(color, 1);
      g.fillCircle(p.x + shakeX, p.y + shakeY, p.radius);
      g.fillStyle(0x082f49, 1);
      g.fillCircle(p.x + p.facingX * 6 + shakeX, p.y + p.facingY * 6 + shakeY, 4.5);
    }
  }

  shutdownScene(): void {
    this.graphics?.destroy();
    this.graphics = null;
    this.latestSnapshot = null;
  }
}

/**
 * Phaser 4.2.1 renderer adapter. Simulation stays pure in src/core; Phaser renders snapshots
 * and handles responsive FIT scaling.
 */
export class PhaserRenderer implements IRenderer {
  readonly engineName = 'phaser';

  private game: Phaser.Game | null = null;
  private scene: ArenaScene | null = null;

  init(container: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      container.innerHTML = '';
      const scene = new ArenaScene();
      this.scene = scene;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        backgroundColor: '#0f172a',
        scale: {
          parent: container,
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 800,
          height: 450,
        },
        callbacks: {
          postBoot: () => resolve(),
        },
        scene: [scene],
      };

      this.game = new Phaser.Game(config);
    });
  }

  render(snapshot: GameSnapshot, _alpha: number): void {
    this.scene?.drawSnapshot(snapshot);
  }

  resize(_width: number, _height: number): void {
    this.game?.scale.refresh();
  }

  dispose(): void {
    this.scene?.shutdownScene();
    this.scene = null;
    this.game?.destroy(true);
    this.game = null;
  }
}

export function createRenderer(): IRenderer {
  return new PhaserRenderer();
}

import { Application, Graphics } from 'pixi.js';
import type { GameSnapshot, IRenderer } from '../core/types';

/**
 * PixiJS v8.23+ renderer adapter using async app.init() inside init() (never top-level await).
 */
export class PixiRenderer implements IRenderer {
  readonly engineName = 'pixi';

  private app: Application | null = null;
  private graphics: Graphics | null = null;
  private container: HTMLElement | null = null;

  async init(container: HTMLElement): Promise<void> {
    this.container = container;
    container.innerHTML = '';

    const app = new Application();
    await app.init({
      width: 800,
      height: 450,
      backgroundColor: 0x0f172a,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });

    this.app = app;
    this.graphics = new Graphics();
    app.stage.addChild(this.graphics);
    container.appendChild(app.canvas);
    this.resize(container.clientWidth || 800, container.clientHeight || 450);
  }

  resize(width: number, height: number): void {
    if (!this.app) return;
    const aspect = 16 / 9;
    let targetW = Math.max(320, width);
    let targetH = Math.round(targetW / aspect);
    if (targetH > height && height >= 180) {
      targetH = height;
      targetW = Math.round(targetH * aspect);
    }

    const canvas = this.app.canvas;
    canvas.style.width = `${targetW}px`;
    canvas.style.height = `${targetH}px`;
  }

  render(snapshot: GameSnapshot, _alpha: number): void {
    const g = this.graphics;
    if (!g) return;
    g.clear();

    const shakeX = snapshot.shakeTimer > 0 ? Math.sin(snapshot.tick * 1.9) * 5 : 0;
    const shakeY = snapshot.shakeTimer > 0 ? Math.cos(snapshot.tick * 2.3) * 5 : 0;

    g.rect(0, 0, snapshot.world.width, snapshot.world.height).fill(0x0f172a);

    for (let x = 40; x < snapshot.world.width; x += 40) {
      g.moveTo(x + shakeX, 8 + shakeY)
        .lineTo(x + shakeX, snapshot.world.height - 8 + shakeY)
        .stroke({ width: 1, color: 0x94a3b8, alpha: 0.08 });
    }
    for (let y = 40; y < snapshot.world.height; y += 40) {
      g.moveTo(8 + shakeX, y + shakeY)
        .lineTo(snapshot.world.width - 8 + shakeX, y + shakeY)
        .stroke({ width: 1, color: 0x94a3b8, alpha: 0.08 });
    }

    g.rect(8 + shakeX, 8 + shakeY, snapshot.world.width - 16, snapshot.world.height - 16).stroke({
      width: 3,
      color: snapshot.flashTimer > 0 ? 0xf43f5e : 0x38bdf8,
      alpha: 0.4,
    });

    for (const c of snapshot.collectibles) {
      const pulse = 1 + Math.sin(c.pulsePhase) * 0.14;
      g.circle(c.x + shakeX, c.y + shakeY, c.radius * 1.45 * pulse).fill({
        color: 0xfacc15,
        alpha: 0.2,
      });
      g.circle(c.x + shakeX, c.y + shakeY, c.radius * pulse).fill(0xfacc15);
    }

    for (const h of snapshot.hazards) {
      const size = h.radius * 1.7;
      g.rect(h.x - size * 0.5 + shakeX, h.y - size * 0.5 + shakeY, size, size)
        .fill(0xf43f5e)
        .stroke({ width: 2, color: 0xfda4af });
    }

    const blinkHidden =
      snapshot.player.invulnTimer > 0 && Math.floor(snapshot.player.invulnTimer * 18) % 2 === 0;
    if (!blinkHidden) {
      const p = snapshot.player;
      const color = snapshot.flashTimer > 0 ? 0xffffff : p.dashTimer > 0 ? 0x7dd3fc : 0x38bdf8;
      g.circle(p.x + shakeX, p.y + shakeY, p.radius).fill(color);
      g.circle(p.x + p.facingX * 6 + shakeX, p.y + p.facingY * 6 + shakeY, 4.5).fill(0x082f49);
    }
  }

  dispose(): void {
    this.graphics?.destroy();
    this.graphics = null;
    this.app?.destroy(true, { children: true });
    this.app = null;
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
  }
}

export function createRenderer(): IRenderer {
  return new PixiRenderer();
}

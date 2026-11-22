import kaplay, { type KAPLAYCtx } from 'kaplay';
import type { GameSnapshot, IRenderer } from '../core/types';

/**
 * KAPLAY 3001 renderer adapter running in non-global mode so core simulation stays deterministic.
 */
export class KaplayRenderer implements IRenderer {
  readonly engineName = 'kaplay';

  private k: KAPLAYCtx | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private container: HTMLElement | null = null;
  private latestSnapshot: GameSnapshot | null = null;

  init(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    this.canvas = canvas;

    const k = kaplay({
      canvas,
      width: 800,
      height: 450,
      background: [15, 23, 42],
      global: false,
      letterbox: true,
      pixelDensity: Math.min(window.devicePixelRatio || 1, 2),
      touchToMouse: false,
    });

    this.k = k;

    k.onDraw(() => {
      const snapshot = this.latestSnapshot;
      if (!snapshot) return;

      const shakeX = snapshot.shakeTimer > 0 ? Math.sin(snapshot.tick * 1.9) * 5 : 0;
      const shakeY = snapshot.shakeTimer > 0 ? Math.cos(snapshot.tick * 2.3) * 5 : 0;

      k.drawRect({
        pos: k.vec2(8 + shakeX, 8 + shakeY),
        width: snapshot.world.width - 16,
        height: snapshot.world.height - 16,
        fill: false,
        outline: {
          width: 3,
          color: snapshot.flashTimer > 0 ? k.rgb(244, 63, 94) : k.rgb(56, 189, 248),
        },
      });

      for (const c of snapshot.collectibles) {
        const pulse = 1 + Math.sin(c.pulsePhase) * 0.14;
        k.drawCircle({
          pos: k.vec2(c.x + shakeX, c.y + shakeY),
          radius: c.radius * pulse,
          color: k.rgb(250, 204, 21),
        });
      }

      for (const h of snapshot.hazards) {
        const size = h.radius * 1.7;
        k.drawRect({
          pos: k.vec2(h.x + shakeX, h.y + shakeY),
          width: size,
          height: size,
          anchor: 'center',
          angle: (h.angle * 180) / Math.PI,
          color: k.rgb(244, 63, 94),
        });
      }

      const blinkHidden =
        snapshot.player.invulnTimer > 0 && Math.floor(snapshot.player.invulnTimer * 18) % 2 === 0;
      if (!blinkHidden) {
        const p = snapshot.player;
        k.drawCircle({
          pos: k.vec2(p.x + shakeX, p.y + shakeY),
          radius: p.radius,
          color:
            snapshot.flashTimer > 0
              ? k.rgb(255, 255, 255)
              : p.dashTimer > 0
                ? k.rgb(125, 211, 252)
                : k.rgb(56, 189, 248),
        });
      }
    });

    this.resize(container.clientWidth || 800, container.clientHeight || 450);
  }

  resize(width: number, height: number): void {
    if (!this.canvas) return;
    const aspect = 16 / 9;
    let targetW = Math.max(320, width);
    let targetH = Math.round(targetW / aspect);
    if (targetH > height && height >= 180) {
      targetH = height;
      targetW = Math.round(targetH * aspect);
    }
    this.canvas.style.width = `${targetW}px`;
    this.canvas.style.height = `${targetH}px`;
  }

  render(snapshot: GameSnapshot, _alpha: number): void {
    this.latestSnapshot = snapshot;
  }

  dispose(): void {
    this.k?.quit();
    this.k = null;
    this.latestSnapshot = null;
    if (this.canvas && this.container && this.canvas.parentElement === this.container) {
      this.container.removeChild(this.canvas);
    }
    this.canvas = null;
    this.container = null;
  }
}

export function createRenderer(): IRenderer {
  return new KaplayRenderer();
}

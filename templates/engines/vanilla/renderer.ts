import type { GameSnapshot, IRenderer } from '../core/types';

/**
 * Zero-dependency HTML5 Canvas 2D renderer adapter with crisp DPR clamping and 16:9 letterboxing.
 */
export class VanillaCanvasRenderer implements IRenderer {
  readonly engineName = 'vanilla';

  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private displayWidth = 800;
  private displayHeight = 450;

  init(container: HTMLElement): void {
    this.container = container;
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', 'Game Arena');
    container.innerHTML = '';
    container.appendChild(canvas);

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
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

    this.displayWidth = targetW;
    this.displayHeight = targetH;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.style.width = `${targetW}px`;
    this.canvas.style.height = `${targetH}px`;
    this.canvas.width = Math.round(targetW * dpr);
    this.canvas.height = Math.round(targetH * dpr);
  }

  render(snapshot: GameSnapshot, _alpha: number): void {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas) return;

    const scaleX = canvas.width / snapshot.world.width;
    const scaleY = canvas.height / snapshot.world.height;

    ctx.save();
    ctx.scale(scaleX, scaleY);

    const shakeOffset =
      snapshot.shakeTimer > 0
        ? {
            x: Math.sin(snapshot.tick * 1.9) * 5,
            y: Math.cos(snapshot.tick * 2.3) * 5,
          }
        : { x: 0, y: 0 };

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, snapshot.world.width, snapshot.world.height);

    ctx.translate(shakeOffset.x, shakeOffset.y);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 40; x < snapshot.world.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 8);
      ctx.lineTo(x, snapshot.world.height - 8);
      ctx.stroke();
    }
    for (let y = 40; y < snapshot.world.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(8, y);
      ctx.lineTo(snapshot.world.width - 8, y);
      ctx.stroke();
    }

    ctx.strokeStyle = snapshot.flashTimer > 0 ? '#f43f5e' : 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, snapshot.world.width - 16, snapshot.world.height - 16);

    for (const c of snapshot.collectibles) {
      const pulse = 1 + Math.sin(c.pulsePhase) * 0.14;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(pulse, pulse);

      ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, c.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const h of snapshot.hazards) {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.angle);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-h.radius * 0.85, -h.radius * 0.85, h.radius * 1.7, h.radius * 1.7);
      ctx.strokeStyle = '#fda4af';
      ctx.lineWidth = 2;
      ctx.strokeRect(-h.radius * 0.85, -h.radius * 0.85, h.radius * 1.7, h.radius * 1.7);
      ctx.restore();
    }

    const blinkHidden =
      snapshot.player.invulnTimer > 0 && Math.floor(snapshot.player.invulnTimer * 18) % 2 === 0;
    if (!blinkHidden) {
      const p = snapshot.player;
      const isDashing = p.dashTimer > 0;
      ctx.save();
      ctx.translate(p.x, p.y);

      ctx.fillStyle = snapshot.flashTimer > 0 ? '#ffffff' : isDashing ? '#7dd3fc' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#082f49';
      ctx.beginPath();
      ctx.arc(p.facingX * 6, p.facingY * 6, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  getSize(): { width: number; height: number } {
    return { width: this.displayWidth, height: this.displayHeight };
  }

  dispose(): void {
    if (this.canvas && this.container && this.canvas.parentElement === this.container) {
      this.container.removeChild(this.canvas);
    }
    this.ctx = null;
    this.canvas = null;
    this.container = null;
  }
}

export function createRenderer(): IRenderer {
  return new VanillaCanvasRenderer();
}

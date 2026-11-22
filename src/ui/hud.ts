import type { AudioEngine } from '../core/audio';
import type { EventBus } from '../core/eventBus';
import type { GameSimulation } from '../core/simulation';
import type { GameEvents, GamePhase, GameSnapshot } from '../core/types';

/**
 * Event-driven DOM HUD controller. Updates DOM only when simulation emits changes (no polling).
 */
export class HudController {
  private readonly bus: EventBus<GameEvents>;
  private readonly sim: GameSimulation;
  private readonly audio: AudioEngine;
  private readonly unsubs: (() => void)[] = [];
  private readonly domCleanups: (() => void)[] = [];

  private readonly hudBar = document.getElementById('hud-bar');
  private readonly scoreEl = document.getElementById('hud-score');
  private readonly bestEl = document.getElementById('hud-best');
  private readonly hpEl = document.getElementById('hud-hp');
  private readonly finalScoreEl = document.getElementById('final-score');
  private readonly finalBestEl = document.getElementById('final-best');

  private readonly menuScreen = document.getElementById('screen-menu');
  private readonly pauseScreen = document.getElementById('screen-pause');
  private readonly gameoverScreen = document.getElementById('screen-gameover');

  private readonly muteBtn = document.getElementById('btn-mute');
  private readonly menuMuteBtn = document.getElementById('btn-menu-mute');
  private readonly appRoot = document.getElementById('app');

  constructor(options: {
    bus: EventBus<GameEvents>;
    simulation: GameSimulation;
    audio: AudioEngine;
  }) {
    this.bus = options.bus;
    this.sim = options.simulation;
    this.audio = options.audio;

    this.unsubs.push(
      this.bus.on('state:changed', (snapshot) => this.syncSnapshot(snapshot)),
      this.bus.on('phase:changed', (phase) => this.syncPhase(phase)),
      this.bus.on('sfx:play', (sfx) => this.audio.play(sfx)),
    );

    this.bindButton('btn-start', () => {
      this.audio.unlock();
      this.sim.start();
    });
    this.bindButton('btn-pause', () => this.sim.togglePause());
    this.bindButton('btn-resume', () => this.sim.togglePause());
    this.bindButton('btn-pause-restart', () => {
      this.sim.reset();
      this.sim.start();
    });
    this.bindButton('btn-restart', () => {
      this.audio.unlock();
      this.sim.start();
    });

    const toggleMute = (): void => {
      this.audio.unlock();
      this.audio.toggleMute();
      this.syncMuteLabels();
    };
    this.bindButton('btn-mute', toggleMute);
    this.bindButton('btn-menu-mute', toggleMute);

    this.syncMuteLabels();
    this.syncSnapshot(this.sim.getSnapshot());
  }

  setTouchActive(active: boolean): void {
    if (!this.appRoot) return;
    this.appRoot.dataset.touchActive = active ? 'true' : 'false';
  }

  private bindButton(id: string, handler: () => void): void {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', handler);
    this.domCleanups.push(() => btn.removeEventListener('click', handler));
  }

  private syncMuteLabels(): void {
    const label = this.audio.isMuted() ? 'SFX: OFF' : 'SFX: ON';
    if (this.muteBtn) this.muteBtn.textContent = label;
    if (this.menuMuteBtn) this.menuMuteBtn.textContent = label;
  }

  private syncSnapshot(snapshot: GameSnapshot): void {
    if (this.scoreEl) this.scoreEl.textContent = String(snapshot.score);
    if (this.bestEl) this.bestEl.textContent = String(snapshot.bestScore);
    if (this.hpEl) this.hpEl.textContent = String(snapshot.player.hp);
    if (this.finalScoreEl) this.finalScoreEl.textContent = String(snapshot.score);
    if (this.finalBestEl) this.finalBestEl.textContent = String(snapshot.bestScore);
    this.syncPhase(snapshot.phase);
  }

  private syncPhase(phase: GamePhase): void {
    if (this.hudBar) this.hudBar.hidden = phase === 'menu';
    if (this.menuScreen) this.menuScreen.hidden = phase !== 'menu';
    if (this.pauseScreen) this.pauseScreen.hidden = phase !== 'paused';
    if (this.gameoverScreen) this.gameoverScreen.hidden = phase !== 'gameover';
  }

  dispose(): void {
    for (const unsub of this.unsubs) unsub();
    this.unsubs.length = 0;
    for (const cleanup of this.domCleanups) cleanup();
    this.domCleanups.length = 0;
  }
}

import type { SafeStorage } from './storage';
import type { SfxName } from './types';

type ZzfxParams = readonly (number | undefined)[];

// Procedural ZzFX presets (MIT License — adapted from Frank Force's ZzFX micro-synth).
const SFX_PRESETS: Record<SfxName, ZzfxParams> = {
  start: [0.9, , 523.25, 0.01, 0.08, 0.18, 1, 1.4, , , 160, 0.05],
  pickup: [0.85, , 740, 0.01, 0.06, 0.14, 1, 1.6, , , 260, 0.04],
  hit: [1.1, , 170, 0.01, 0.09, 0.22, 4, 2.2, -8, , , , , 0.6],
  gameover: [1.0, , 290, 0.02, 0.18, 0.45, 2, 1.1, -6, , -80, 0.08],
  pause: [0.6, , 440, 0.01, 0.03, 0.08, 0, 1.0],
};

const MUTE_KEY = 'vibe_webgame_muted';

/**
 * Zero-asset procedural WebAudio sound synthesizer with iOS Safari unlock and visibility resume.
 */
export class AudioEngine {
  private readonly storage: SafeStorage;
  private ctx: AudioContext | null = null;
  private muted: boolean;
  private unlocked = false;

  private readonly handleUnlock = (): void => {
    this.unlock();
  };

  private readonly handleVisibility = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      this.resumeIfNeeded();
    }
  };

  constructor(storage: SafeStorage) {
    this.storage = storage;
    this.muted = storage.getItem(MUTE_KEY) === '1';

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      window.addEventListener('pointerdown', this.handleUnlock, { passive: true });
      window.addEventListener('keydown', this.handleUnlock, { passive: true });
      document.addEventListener('visibilitychange', this.handleVisibility);
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(next: boolean): void {
    this.muted = next;
    this.storage.setItem(MUTE_KEY, next ? '1' : '0');
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  unlock(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return;
      }
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    this.unlocked = true;
  }

  private resumeIfNeeded(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  play(name: SfxName): void {
    if (this.muted) return;
    if (!this.unlocked) {
      this.unlock();
    }
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.playZzfx(SFX_PRESETS[name]);
  }

  private playZzfx(params: ZzfxParams): void {
    if (!this.ctx) return;
    const [
      volume = 1,
      randomness = 0.05,
      frequency = 220,
      attack = 0,
      sustain = 0,
      release = 0.1,
      shape = 0,
      shapeCurve = 1,
      slide = 0,
      deltaSlide = 0,
      pitchJump = 0,
      pitchJumpTime = 0,
      repeatTime = 0,
      noise = 0,
      modulation = 0,
      bitCrush = 0,
      delay = 0,
      sustainVolume = 1,
      decay = 0,
      tremolo = 0,
    ] = params;

    const sampleRate = this.ctx.sampleRate || 44100;
    const pi2 = Math.PI * 2;
    let startSlide = (slide * 500 * pi2) / sampleRate / sampleRate;
    const startFrequency =
      (frequency * (1 + randomness * 2 * Math.random() - randomness) * pi2) / sampleRate;

    const attackSamples = Math.max(1, (attack * sampleRate) | 0);
    const decaySamples = (decay * sampleRate) | 0;
    const sustainSamples = (sustain * sampleRate) | 0;
    const releaseSamples = Math.max(1, (release * sampleRate) | 0);
    const delaySamples = (delay * sampleRate) | 0;
    const length = attackSamples + decaySamples + sustainSamples + releaseSamples + delaySamples;
    if (length <= 0) return;

    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0;
    let tm = 0;
    let j = 1;
    let r = 0;
    let c = 0;
    let s = 0;
    let f = startFrequency;
    const slideAccel = (deltaSlide * 500 * pi2) / sampleRate ** 3;
    const jumpFreq = (pitchJump * pi2) / sampleRate;
    const jumpSamples = (pitchJumpTime * sampleRate) | 0;
    const repeatSamples = (repeatTime * sampleRate) | 0;

    for (let i = 0; i < length; i++) {
      if (!(++c % ((bitCrush * 100) | 0))) {
        s = shape
          ? shape > 1
            ? shape > 2
              ? shape > 3
                ? Math.sin((tm % pi2) ** 3)
                : Math.max(Math.min(Math.tan(tm), 1), -1)
              : 1 - (((((2 * tm) / pi2) % 2) + 2) % 2)
            : 1 - 4 * Math.abs(Math.round(tm / pi2) - tm / pi2)
          : Math.sin(tm);

        s =
          (repeatSamples ? 1 - tremolo + tremolo * Math.sin((pi2 * i) / repeatSamples) : 1) *
          (s < 0 ? -1 : 1) *
          Math.abs(s) ** shapeCurve *
          volume *
          0.25;

        if (i < attackSamples) {
          s *= i / attackSamples;
        } else if (i < attackSamples + decaySamples) {
          s *= 1 - ((i - attackSamples) / decaySamples) * (1 - sustainVolume);
        } else if (i < attackSamples + decaySamples + sustainSamples) {
          s *= sustainVolume;
        } else if (i < length - delaySamples) {
          s *= ((length - i - delaySamples) / releaseSamples) * sustainVolume;
        } else {
          s = 0;
        }

        if (delaySamples && i >= delaySamples) {
          s = s / 2 + data[i - delaySamples] / 2;
        }
      }

      f += startSlide += slideAccel;
      tm += f * (1 + Math.sin(tm * modulation)) + (noise ? noise * (Math.random() * 2 - 1) : 0);

      if (repeatSamples && ++r > repeatSamples) {
        r = 0;
        f = startFrequency;
        j = 1;
      }
      if (jumpSamples && j && i > jumpSamples) {
        f += jumpFreq;
        j = 0;
      }
      b0 = s;
      data[i] = b0;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    source.start();
  }

  dispose(): void {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      window.removeEventListener('pointerdown', this.handleUnlock);
      window.removeEventListener('keydown', this.handleUnlock);
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

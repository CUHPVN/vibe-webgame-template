export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Wraps localStorage in try/catch with an automatic in-memory fallback so Incognito
 * and restricted iframe contexts never crash the game.
 */
export class SafeStorage {
  private readonly memory = new Map<string, string>();
  private readonly backend: StorageLike | null;

  constructor(backend?: StorageLike | null) {
    if (backend !== undefined) {
      this.backend = backend;
      return;
    }

    try {
      this.backend = typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
    } catch {
      this.backend = null;
    }
  }

  getItem(key: string): string | null {
    if (this.backend) {
      try {
        const value = this.backend.getItem(key);
        if (value !== null) {
          this.memory.set(key, value);
        }
        return value;
      } catch {
        // Fall through to memory storage when browser blocks storage access.
      }
    }
    return this.memory.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.memory.set(key, value);
    if (!this.backend) return;
    try {
      this.backend.setItem(key, value);
    } catch {
      // Ignore quota/security errors; in-memory value remains intact for this session.
    }
  }

  removeItem(key: string): void {
    this.memory.delete(key);
    if (!this.backend) return;
    try {
      this.backend.removeItem(key);
    } catch {
      // Ignore storage access errors.
    }
  }

  getNumber(key: string, fallback = 0): number {
    const raw = this.getItem(key);
    if (raw === null) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  setNumber(key: string, value: number): void {
    if (!Number.isFinite(value)) return;
    this.setItem(key, String(value));
  }

  getJson<T>(key: string, fallback: T): T {
    const raw = this.getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  setJson<T>(key: string, value: T): void {
    try {
      this.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore serialization errors.
    }
  }
}

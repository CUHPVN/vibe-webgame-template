import { describe, expect, it } from 'vitest';
import { SafeStorage, type StorageLike } from '../../src/core/storage';

describe('SafeStorage', () => {
  it('falls back to in-memory storage when localStorage throws SecurityError (Incognito)', () => {
    const throwingBackend: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError: storage blocked');
      },
      setItem: () => {
        throw new Error('SecurityError: storage blocked');
      },
      removeItem: () => {
        throw new Error('SecurityError: storage blocked');
      },
    };

    const storage = new SafeStorage(throwingBackend);

    expect(storage.getItem('missing')).toBeNull();
    storage.setNumber('best', 250);
    expect(storage.getNumber('best', 0)).toBe(250);

    storage.setJson('prefs', { sfx: false });
    expect(storage.getJson('prefs', { sfx: true })).toEqual({ sfx: false });

    storage.removeItem('best');
    expect(storage.getNumber('best', 99)).toBe(99);
  });

  it('reads and writes through working backend when available', () => {
    const map = new Map<string, string>();
    const workingBackend: StorageLike = {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => {
        map.set(k, v);
      },
      removeItem: (k) => {
        map.delete(k);
      },
    };

    const storage = new SafeStorage(workingBackend);
    storage.setItem('player', 'hero');
    expect(map.get('player')).toBe('hero');
    expect(storage.getItem('player')).toBe('hero');
  });
});

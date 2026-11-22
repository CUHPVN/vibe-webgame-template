---
name: web-game-loop
description: Use when adding gameplay features, mechanics, entities, or refactoring core game architecture while keeping simulation deterministic and cleanly separated from renderer and DOM HUD.
---

# Web Game Slice Development Loop

Follow this workflow whenever adding a feature or mechanic:

1. **Read Context**: Read `AGENTS.md`, `progress.md`, and `docs/GAME_SPEC.md`.
2. **Define Slice Contract**: State exact inputs, state changes, acceptance numbers (speed, cooldown, HP, score), and verification checks in `docs/GAME_SPEC.md` before writing code.
3. **Pure Core First (`src/core/`)**:
   - Add types to `src/core/types.ts`.
   - Implement deterministic logic in `src/core/simulation.ts` using `SeededRng` (never `Math.random()`) and fixed `dt`.
   - Emit UI/SFX changes via `EventBus` (`score:changed`, `phase:changed`, `sfx:play`).
   - Write or update unit tests in `tests/unit/simulation.test.ts`.
4. **Thin Renderer (`src/renderer/renderer.ts`)**:
   - Read `GameSnapshot` without mutating simulation state.
   - Ensure `dispose()` frees every GPU/canvas resource.
5. **Event-Driven DOM HUD (`index.html`, `src/ui/hud.ts`)**:
   - Update DOM elements only inside `EventBus` listeners.
6. **Verify & Checkpoint**:
   - Run `npm run verify`.
   - Update `progress.md` with completed items and next slice.

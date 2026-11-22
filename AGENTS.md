# AGENTS.md — WebGame Vibe Coding Rules

<!-- ACTIVE_STACK_START -->
- **Game**: Star Dash (`vibe-webgame-template`)
- **Engine**: Vanilla HTML5 Canvas 2D
- **Target Platform**: General Web / GitHub Pages / Cloudflare / Vercel
- **Platform Constraints**: Keep `base: "./"` in `vite.config.ts`. Run `npm run budget` to verify file sizes stay below 25 MiB/file (Cloudflare limit).
- **Engine Guardrail**: Renderer adapter: `src/renderer/renderer.ts` (`VanillaCanvasRenderer`). Clamp `devicePixelRatio` to max `2` and keep logical coordinates `800x450` (16:9).
<!-- ACTIVE_STACK_END -->

## 1. Architecture Boundaries (Never Mix Layers)

- `src/core/`: Pure TypeScript simulation, seeded RNG (`Mulberry32`), fixed `1/60s` loop, `EventBus`, `SafeStorage`, ZzFX `AudioEngine`, `InputManager`. **ZERO** DOM, Canvas, Phaser, Pixi, or Three.js imports inside `src/core/simulation.ts` and `src/core/rng.ts`.
- `src/renderer/`: Engine adapter implementing `IRenderer` (`init`, `render`, `resize`, `dispose`). Renders `GameSnapshot` only; never mutates game state.
- `src/ui/`: DOM/HTML HUD overlay (`HudController`). Subscribes to `EventBus` — never draw menus/HUD inside `<canvas>` and never poll state per frame.
- `src/debug/testHooks.ts`: Deterministic `window.advanceTime(ms)` and `window.render_game_to_text()` active in dev and `?test=1`.

## 2. 6-Step Vibe Coding Loop

1. **Contract First**: Write 1 slice spec + acceptance criteria in `docs/GAME_SPEC.md` before coding.
2. **Plan Multi-File Changes**: Align before editing `src/core/loop.ts`, `src/core/types.ts`, or `src/core/storage.ts`.
3. **Small Slices**: Implement one mechanic per pass (avoid monolithic > 500-line files).
4. **Verify Automatically**: Run `npm run verify` (`typecheck` + `test` + `build` + `budget` + headless browser playtest with `advanceTime` and 0 console errors).
5. **Inspect Diff & Play 30s**: Review git diff and test game feel manually.
6. **Memory & Commit**: Update `progress.md` and make a small clean git commit.

## 3. Five Non-Negotiable Anti-Bug Invariants

1. **GPU / VRAM Disposal**: In Three.js call `.dispose()` on geometries, materials, textures, and render targets; in PixiJS call `.destroy(true, { children: true })`; in Phaser call `game.destroy(true)`.
2. **No Game Logic in Renderers / HUD**: All rules live in `src/core/simulation.ts`. All UI/menus live in `index.html` + `src/ui/hud.ts`.
3. **Physics / Visual Sync**: Keep `Object3D` parent scales at `(1, 1, 1)` so raycasts and colliders stay true; clamp DPR to `2`.
4. **Mobile & iOS Safari Audio/Touch**: Apply `touch-action: none` and `env(safe-area-inset-*)`. Activate touch pads **only** on `pointerType === 'touch'` (never `ontouchstart` or `maxTouchPoints`). Unlock `AudioContext` on first gesture and resume on `visibilitychange`.
5. **Incognito Storage Safety**: Always access storage through `SafeStorage` (`try/catch` + memory fallback), never raw `localStorage`.

## 4. Modern 2026 Engine Guardrails

- **Phaser 4**: `import * as Phaser from 'phaser';` + `Phaser.Types.Core.GameConfig`.
- **PixiJS 8**: `const app = new Application(); await app.init(...)` inside async `init()` (no top-level `await`, no v7 `new Application({ ... })`, use `app.canvas`).
- **Three.js r186+**: Use `THREE.Timer` (NOT `Clock`) and `HDRLoader` (NOT `RGBELoader`). Skip rendering when `document.visibilityState === 'hidden'`.
- **Verification Gate**: Before claiming completion, run `npm run verify` and confirm exit code `0`.

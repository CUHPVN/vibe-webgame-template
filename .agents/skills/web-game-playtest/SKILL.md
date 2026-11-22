---
name: web-game-playtest
description: Use when testing gameplay changes in a real headless or live browser, verifying canvas rendering, checking deterministic window.advanceTime and render_game_to_text hooks, or debugging console/input/audio issues.
---

# Deterministic Browser Playtest

Use the built-in test hooks instead of guessing from screenshots alone:

1. **Build & Run Smoke Playtest**:
   - `npm run build && npm run verify:browser`
   - Or run full E2E suite: `npm run test:e2e`
2. **Interactive Test Mode (`?test=1`)**:
   - Launch `npm run dev` or `npm run preview` and navigate to `/?test=1&seed=42` (pauses rAF clock so frames only advance via `window.advanceTime(ms)`).
   - Call `window.render_game_to_text()` to inspect `{ engine, phase, seed, tick, elapsedMs, score, player, activeCollisions }`.
   - Simulate user input (`click #btn-start`, `ArrowLeft/Right/Up/Down`, `Space`, `Escape`), call `window.advanceTime(500)`, and verify state deltas.
3. **Required Assertions**:
   - Zero `console.error` and zero `pageerror` events.
   - `<canvas>` bounding rect > 0 and screenshot `test-results/playtest-smoke.png` visually confirmed non-blank.
   - Mobile viewport check: verify no overflow (`scrollWidth <= innerWidth`) and touch pads remain hidden until real `pointerType === 'touch'`.
4. **Cleanup**: Ensure preview/dev servers are terminated cleanly after verification.

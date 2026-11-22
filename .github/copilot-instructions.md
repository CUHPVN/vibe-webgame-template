# GitHub Copilot Instructions

Follow `AGENTS.md` at the repository root and check `progress.md` before starting a task.

- Keep pure gameplay state inside `src/core/simulation.ts` (zero DOM/Canvas/engine imports).
- Keep HUD/menu UI inside `index.html`, `src/style.css`, and `src/ui/hud.ts` driven by `EventBus`.
- Use `SafeStorage` instead of direct `localStorage`, and `AudioEngine` (ZzFX) for SFX.
- Keep `window.advanceTime(ms)` and `window.render_game_to_text()` working, then verify with `npm run verify`.

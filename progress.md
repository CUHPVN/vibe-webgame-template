# Project Progress (Star Dash Starter)

- **Template Version**: 0.1.0
- **Engine**: Vanilla HTML5 Canvas 2D
- **Target**: General Web / GitHub Pages / Cloudflare / Vercel

## Completed

- [x] Decoupled 3-layer architecture (`src/core` <-> `src/renderer` <-> `src/ui`)
- [x] Fixed `1/60s` simulation loop + deterministic `SeededRng` (`Mulberry32`)
- [x] Embedded `<1 KB` ZzFX procedural WebAudio SFX with iOS Safari resume
- [x] Incognito-safe `SafeStorage` + touch-only virtual D-pad detection
- [x] Deterministic `window.advanceTime(ms)` & `window.render_game_to_text()` hooks
- [x] Swappable 2026 renderer templates (`vanilla`, `phaser`, `pixi`, `kaplay`, `three`)

## Current Slice / Next Up

- [ ] Run `npm run setup` after cloning to pick game title, engine, and target portal
- [ ] Replace starter arena mechanics in `docs/GAME_SPEC.md` and `src/core/simulation.ts`

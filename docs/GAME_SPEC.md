# Game Spec: Star Dash (Starter Template)

- **Engine**: Vanilla HTML5 Canvas 2D
- **Target Platform**: General Web / GitHub Pages / Cloudflare / Vercel
- **Core Loop**: Move around the 800x450 arena, collect glowing stars to build score & combo multiplier, dash away from bouncing hazards, survive with 3 HP.

## Slice Contracts (Fill 1 Slice Before Implementing)

### Slice 0 — Starter Arena Baseline
- **Inputs**: `WASD` / `ArrowKeys` (8-way movement), `Space` / `ShiftLeft` (dash burst), `Esc` / `P` (pause).
- **Acceptance Criteria**:
  - `player` moves at `270 px/s` (`520 px/s` during `140ms` dash with `850ms` cooldown).
  - Collecting a star increments `score` by `10 * combo` (max `5x`), spawns a replacement star deterministically, and plays `pickup` ZzFX SFX.
  - Hitting a hazard deals `1` damage, grants `1.0s` invulnerability blink, resets combo to `1`, triggers screen shake + flash, and transitions to `gameover` at `0 HP`.
  - Passes `npm run verify` with `0` console/page errors.

### Slice 1 — Next Feature Template
- **Goal**: *(Describe 1 mechanic)*
- **Behavior Contract**:
  - *(Exact timings, bounds, score/HP rules)*
  - *(No direct DOM/Canvas logic inside `src/core/simulation.ts`)*
- **Verification**:
  - Unit test in `tests/unit/simulation.test.ts`
  - Browser check via `npm run verify`

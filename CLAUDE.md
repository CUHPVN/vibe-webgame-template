# CLAUDE.md

@AGENTS.md

## Claude Code Workflow Notes

- **Rules & Memory**: Follow `AGENTS.md` as the single source of truth and read `progress.md` at the start of every session.
- **Plan Before Multi-File Edits**: Enter Plan Mode when a feature touches `src/core/types.ts`, `src/core/simulation.ts`, and `src/renderer/renderer.ts` together.
- **Keep Context Lean**: Install only 1 Skill router + relevant web-engine skills. If skill descriptions truncate, raise `skillListingBudgetFraction` (e.g. `0.02`) or `SLASH_COMMAND_TOOL_CHAR_BUDGET`.
- **Mandatory Gate**: Run `npm run verify` after edits and inspect `test-results/playtest-smoke.png` before concluding.

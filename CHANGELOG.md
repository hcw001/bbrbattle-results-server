# Changelog

### 2026-05-20 — TypeScript rewrite scaffold

- Phase 0 begins; no `src/` directory exists yet.
- Starting with `package.json`, `tsconfig.json`, and `vitest.config.ts` before implementing phases 1–7 in order.

### 2026-05-21 — Phases 0–9 complete; Python codebase removed

- All 30 source files written; 57 tests pass, 0 type errors after full run.
- Fixed `DOM Event` name clash: added `import type { Event }` in `engine/state.ts` and aliased as `BattleEvent` in `engine/engine.ts` to avoid silent collision with the browser global.
- Fixed compulsory strat bomber removal in `step6Terminate.ts`; the `round > 1` guard ran after the round counter incremented — corrected to `round === 1` so removal fires at the end of round 1.
- Added `src/api/legacyAdapter.ts` to map legacy Python unit types and integer tech codes to engine types, enabling backward compatibility with the bbr40.com frontend via `/api/calculate`.
- Removed all Python source files; updated `Procfile` from gunicorn to `node --import tsx/esm src/index.ts`.

# Boss Raid repository audit — 2026-10-12

- Base: `origin/main` / `2d460c77e428a5c475885383705ef6637c9b246d`, including Google Auth + teacher RBAC. Work branch: `feat/boss-raid-time-attack`.
- Existing uncommitted Impeccable installation updates are preserved and excluded from gameplay commits.
- Reuse `requireRole`, `authorizeApi`, `session.userCode`, strict owner checks and the existing Google identity mapping. No new authentication system.
- Reuse `question_sets`, `questions`, `question_options`, MathText, existing question images, four-digit rooms, teams and participants.
- Classic keeps its synchronized question cursor, round multiplier and Team Power. Raid will use separate per-player order, ledger, combat state and endpoints.
- Local Classic remains available. Production Raid requires Supabase and an opt-in feature flag; local integration tests use an isolated database model.
- Migrations 001–008 stay unchanged. Migration 009 is additive and will only be executed in disposable local test databases during development.
- Source assets found: 42 real PNG sheets in the user-provided asset directory. Actual boss shield filename is `Shield Defend.png`; Warrior idle is misspelled `idel.png`. Import aliases handle both without changing originals.
- All 42 headers have alpha and dimensions divisible by four; dimensions differ between clips, so frame geometry comes from each actual image, not assumed 1024/2048 sizes. Pixel alpha/bounds and playback still require validation.
- PixiJS 8.22.0 is isolated to Raid, dynamically imported in the browser. Existing Three.js scenes are retained.
- No production database access, deployment or asset upload is authorized by this task. Real multi-connection Supabase/100–500-user performance remains a staging verification item.

## Delivery log

Phase 0: brief read; upstream verified; feature branch and source inventory prepared. Next: real-asset QA, importer, renderer and development-only preview.

Phase 1: 42 source sheets imported unchanged, 672 frames checked, 0 validation failures. The 221 cell-edge warnings are preserved for source cropping review. Original decoded size is 209 MiB, so the renderer uses bounded lazy loading rather than preloading all sheets. Development Pixi smoke: 1/3/5 heroes, one canvas, 320px without horizontal document overflow; TypeScript passed. Local commit `b96655c`.

Phase 2: migration 009, private service-only RPCs, atomic answers/visibility/HP/healing/first kill, deterministic hero fallback, persisted CSPRNG question/option permutations, private snapshot and strict authenticated API routes implemented. `node tests/boss-raid/sql-rules.mjs`: 135 assertions passed in a disposable PGlite DB. Existing `npm run test:sql`: Classic RPC tests, 68 Google SQL and 14 deployment assertions passed. Real multi-connection races are not established by PGlite and remain a staging gate. Production migration has not been run.

Phase 3–5 in progress: teacher mode form, hero lobby, independent modal submission, teacher single-canvas spectator, academic report/CSV and authorized adaptive polling. Initial production-build E2E using local mock Google/Supabase passed; final responsive, regression and load verification follows.

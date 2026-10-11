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

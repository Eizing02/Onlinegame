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

Phase 3: teacher form defaults to Classic and exposes Boss Raid after readiness/flag; shared-bank create/join routing, unique hero lobby, independent protected modal (short text/true-false/four choice/math/image), shared server timer and reconnect implemented. Main files: `RaidRoomForm.tsx`, `HeroSelectLobby.tsx`, `RaidClient.tsx`, `RaidQuestionModal.tsx`, `RaidTimer.tsx`; generic teacher/student routes and data adapters are patched only for mode dispatch. Local production-build E2E exercises 1/3/5 separate authenticated browser participants, duplicate/simultaneous answers and the complete mixed bank. Classic form labels were restored after regression tests caught a mismatch.

Phase 4: `TeacherRaidOverview.tsx`, `RaidResults.tsx`, `use-raid-snapshot.ts`, `use-raid-tabs.ts`, `use-raid-audio.ts` provide all-team aggregates, selected-team single canvas, fullscreen, two independent joint-tie standings, early end/expiry, audit and academic CSV. Transport is authorized adaptive polling because existing HttpOnly Google sessions do not furnish browser Realtime JWTs. Snapshot gaps/reconnect reconcile trusted current state and discard stale animation bursts; visibility/online scheduling does not create overlapping loops. No broad/public Realtime subscription was added.

Phase 5: SQL/unit checks, strict API/role/origin/forged-field/throttling checks, local production E2E, 24-view responsive evidence, asset provenance and Impeccable reviewer/documenter delivered. All three scored UI findings resolved. A later axe keyboard-scroll finding was corrected and tested. Visual-only ultimate has a 4s cooldown; modal entrance/exit is 220/300ms with reduced-motion support. Real multi-connection/load/mobile performance remains a release gate: the measured headless fixture P50/P95 frame times are 66.7/133.4ms, below the desired 24 FPS performance, and no physical-device or 100–500 staging result is claimed. See `implementation-report.md` for final commands, exact outcomes and deployment limits.

Phases 3–4 local commit: `9977da6`. Final local checks: lint/TypeScript/build passed, Raid unit/135 SQL passed, all existing `npm test` suites including 15 Classic browser cases passed, Google E2E 8 passed, Raid E2E 5 passed. Source assets/provenance are local only; no remote publication performed.

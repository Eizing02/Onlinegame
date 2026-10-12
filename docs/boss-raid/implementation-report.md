# Boss Raid implementation report — 2026-10-12

## Problem and delivered behavior

Teachers can create Boss Raid — Time Attack from the existing question bank. Each real team member answers an independently shuffled, persisted question sequence under one server deadline. Correct alive answers award original question points and damage the team's boss; wrong answers reduce hero HP. At HP0, correct answers heal one injured teammate (or self in a solo team) without Raid score/damage. Killing the boss records one authoritative timestamp while remaining answers still count. Teachers observe all teams, animate one selected team and export academic results. Average-score and fastest-kill standings stay independent.

Classic, Google Login, teacher ownership/RBAC, student codes and previous records are retained. Upstream baseline `2d460c77e428a5c475885383705ef6637c9b246d`; feature branch `feat/boss-raid-time-attack`. Initial implementation and tests were local only. In the subsequent user instruction on 2026-10-12, the user reported applying SQL and authorized GitHub publication of the completed code/assets. The agent has not executed production SQL, independently verified the remote migration, or enabled the production feature flag; staging/device gates remain open.

## Changes by phase

| Phase | Main files / result | Verification / remaining limits |
|---|---|---|
| 0 | `00-repository-audit.md`, server feature flag, feature branch | Audited real repository/auth/shared bank/assets; existing skill updates preserved separately |
| 1 | `src/features/boss-raid/assets`, `engine`, `RaidArena.tsx`, `scripts/boss-raid/import-assets.mjs`, `validate-assets.mjs`, development previews, `public/assets/boss-raid` | 42 original sheets / 672 frames / zero failures; 221 source-edge warnings remain; Pixi isolated from Classic |
| 2 | `supabase/migrations/009_boss_raid_time_attack.sql`, `server/raid-service.ts`, `server/http.ts`, Raid API routes, `rules` | 135 isolated SQL assertions plus unit checks; real PostgreSQL multi-connection locks/deadlocks require staging |
| 3 | `RaidRoomForm`, `HeroSelectLobby`, `RaidClient`, `RaidQuestionModal`, `RaidTimer`, Raid student route, mode adapters | Local 1/3/5 browser participants; 3 question types, math/image, independent cursor/retry/reconnect; narrow protected confirmation |
| 4 | `TeacherRaidOverview`, `RaidResults`, Raid teacher routes, snapshot/visibility/tabs/audio hooks | All-team aggregates, one canvas, two rankings, audit, CSV, late spectator, expiry/early end; secure polling fallback |
| 5 | `tests/boss-raid`, Playwright config/mock, staging-load/read-only SQL scripts, docs, capture/provenance scripts | Regression/security/responsive checks; Impeccable three-fix ship verdict and incumbent-system comparison; staging/device gates below |

New runtime dependency: `pixi.js` 8.22.0. New development dependency: `sharp` 0.35.5 for sprite validation. Lockfile accompanies the dependencies. Pixi is dynamically imported on Raid views only; existing Three.js code is retained.

The old-file changes are mode routing, teacher creation, joins/leaves and Classic guards. Migrations **001–008 have no diff**. Migration 009 adds a default `classic` column, eight private RLS-enabled Raid tables, service-only RPCs, indexes and Classic write guards. Answer/visibility transactions lock team then participants in UUID order, enforce time after locking and keep a unique terminal answer/idempotent response. Student snapshots exclude correct answers, future question IDs and teacher academic details. Shared atomic mutation limits reuse the existing 008 limiter with separate Raid keys.

## Local test results

| Command / evidence | Result |
|---|---|
| `npm run raid:assets:validate` | PASS: 42 sheets, 672 nonempty alpha frames, 0 failures; 221 warnings recorded |
| `npm run test:raid` | PASS: unit rules/rankings/queue and 135 PGlite SQL assertions |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS; production build also performs TypeScript checking |
| `npm run build` | PASS |
| `npm test` | PASS: existing data/Google service/Classic and Google SQL suites plus 15 Classic browser cases |
| `npm run test:e2e:google` | PASS: 8 browser cases (56.9s), including Google identity/link/reload/gameplay/RBAC/accessibility |
| `npm run test:e2e:raid` | PASS: 5 browser cases (1.6m) on final build, including keyboard focus/PageDown and empty serious/critical axe results |
| Shipping-raster provenance scan | PASS: all 42 PNGs carry source metadata; original pixels/alpha and source drive retained |
| Impeccable | 24 valid review captures; reviewer scores three named material fixes resolved, `ship`; one detector pass (0 primary / 49 advisory), no second detector |
| Actual Supabase staging / physical mobile GPU | NOT_RUN; no staging authorization/project or physical-device evidence |

Browser tests use the optimized build, local mock Google PKCE and disposable PGlite-backed Supabase on loopback. They exercise real separate browser contexts, not real Google accounts or the production Supabase service. PGlite's single connection cannot establish real lock-wait/deadlock freedom. The axe checks cover serious/critical issues on final student results for each 1/3/5 fixture, not a blanket WCAG certification.

## Known limits and release gates

1. **Performance:** local headless Chromium frame P50 66.7ms / P95 133.4ms (heap 11.2MB) does not meet ≥24 FPS in that fixture. It is neither a phone benchmark nor a capacity promise. Test real school phones/computers, GPU textures, answer P95, CPU/egress and actual Supabase quotas before enabling production.
2. **Scale:** authorized polling uses 1.5s teacher / 2s student intervals, jitter/backoff/hidden pause. At 500 learners it models ~250 student snapshots/s before answers/auth. Rooms currently support up to 12×5=60 players; 500 learners require at least nine rooms. Private Broadcast is intentionally deferred until scoped JWT/channel authorization is available and tested.
3. **Assets:** 221 frame-edge/black-pixel warnings reflect the supplied originals. Inspect the preview for clipped wings/weapons before publishing. All 42 sheets decoded simultaneously would consume 209 MiB; lazy leases/LRU aim for eight cached sheets/64 MiB, with pinned active textures able to exceed that soft budget.
4. **Visibility:** >3000ms warnings are best effort browser reports, cannot prove cheating/AI use, and can be lost if browser/network dies. Teacher has a visible audit; no automatic retrospective score editing is provided.
5. **Staging:** `staging-load.mjs` implements opt-in 1/5/20/100/250/500 direct-RPC scenarios with idempotent answer bursts, metrics and cleanup. It rejects the known production project. It has not been executed against a real remote project; it does not measure OAuth/API limiter/GPU performance.

## Manual next steps

Follow [deploy.md](deploy.md) on a separate authorized staging project. Existing projects need **only migration 009**, not reinstallation of 001–008. Run `scripts/boss-raid/verify-deployment.sql` read-only checks, preserve old data counts, validate sprites, set server `BOSS_RAID_ENABLED=true` for staging and run the functional/load/device matrix. Google OAuth setup requires no additional client credentials for Raid.

After staging gates pass, obtain explicit permission for production SQL and publication/deployment. Keep the feature flag false until readiness is verified. Rollback hides new Raid creation by setting the flag false; keep additive schema/code so existing Raid rooms/results remain readable. Do not drop historical data or revert Google/RBAC migrations.

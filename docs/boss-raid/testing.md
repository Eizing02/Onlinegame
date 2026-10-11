# Testing and release gates

## Commands

```powershell
npm run raid:assets:validate
npm run test:raid
npm run lint
npx tsc --noEmit
npm run build
npm test
npm run test:e2e:google
npm run test:e2e:raid
```

E2E ใช้ production build ของเว็บในเครื่องและ mock Google PKCE/Supabase บน loopback เท่านั้น ไม่ใช้บัญชีหรือ database จริง Mock มี endpoints เฉพาะใน `tests/helpers/mock-supabase.mjs` ไม่มีในแอปที่ deploy

## Coverage

- PGlite SQL 135 assertions: RLS/grants, unique hero, deterministic fallback, frozen bank/options, safe snapshot, duplicate/stale answer, locked denominator, late spectator, exact visibility threshold/dedup/third skip, wrong damage, HP0 capped random heal/solo/no target, first kill/effective damage/post-kill, expiry/early end, Classic guards, zero-point invalid bank and leaving reservation
- Unit: exact average joint ties/kill joint ties/non-kill progress, damage clamps, visibility 2999/3000/3001, bounded queue/dedup/reset
- Raid Playwright (5 cases): authenticated mock Google flow and 1/3/5 separate browser participants, simultaneous answer/retry, independent cursor, every question type, long Thai/image bank, reconnect, private API/role/origin/forged payload, teacher single canvas, late spectator, visibility audit, deadline, results/CSV, solo knockout/self-revival/kill-once and shared mutation 429/Retry-After checks. The protected short-text dialog is tested at 320×400 (input and both confirmation states fully visible at ≥44px), Escape protection and nested image expansion. Student results get axe serious/critical checks for each 1/3/5 case; the 320px scroll region is focused and scrolled with PageDown.
- Classic/Google suites retained and run independently. A failed first Classic run identified changed form labels; Classic labels/buttons were restored before rerun.
- Visual matrix: 24 captures covering teacher desktop/mobile, arena **1/2/3/4/5** at 1440px and 390px, 1024px tablet, 320px teacher/student, lobby, create form, long image question at 320×700, simulated keyboard viewport 320×400, choice/true-false, results and HP40/10/0. Evidence and geometry/overflow metrics are under `.impeccable/review/boss-raid/`. An additional final `results-student-keyboard-320.png` records the focused results region. Every supplied image was opened before handoff.

Impeccable's independent full review identified clipped confirmation on a short viewport, missing cumulative score in the modal and missing HP color states. The bounded verdict scores **all three fixes resolved — ship**; it is not a renewed whole-surface approval. A later automated axe check identified `scrollable-region-focusable`; named focusable regions and visible focus rings were added to game/results/question/audit scroll areas, then browser checks rerun. `ui-review-report.md` compares the extension with the incumbent design system without rewriting it.

PGlite and local mock execute on one database connection. Concurrent HTTP/browser tests check persistence and retries, **not** real PostgreSQL deadlock freedom or production capacity. SQL locks are designed for multi-team parallelism; staging must verify it empirically.

## 100–500 load model

Current room limit 12 teams ×5 =60 players; 500 simultaneous learners require at least 9 rooms. Active polling at 500 players is about 250 snapshot requests/s plus answers and Google-session checks; teacher adds ~0.67/s per view. For 4 KiB snapshots, student payload alone is ~1 MiB/s (~480 MiB in eight minutes), before HTTP/auth overhead and sprite download. Measure actual size, quotas and billing; this is a model, not a capacity promise.

Use a separate authorized Supabase staging project with 001–009. Never use `iyytljowajsavrtlnwyj`. Opt-in script:

```powershell
# Supply STAGING values privately in your shell; never commit keys.
$env:RAID_STAGING_APPROVED='true'
$env:RAID_STAGING_URL='https://YOUR-STAGING-PROJECT.supabase.co'
$env:RAID_STAGING_SERVICE_KEY='YOUR-STAGING-SERVICE-KEY'
$env:RAID_LOAD_CLIENTS='100' # then 1, 5, 20, 100, 250, 500
npm run test:staging:raid
```

Script creates uniquely marked disposable fixture records, bursts joins/answers plus retries, verifies terminal state, records p50/p95/p99 and response bytes, and deletes its own records. It measures direct privileged DB/RPC requests, not end-to-end Google auth or 500 GPU canvases. Pair it with authenticated staging browser/API load and Supabase lock-wait/deadlock/CPU/egress logs. Do not run without explicit staging authorization.

Engineering targets to measure: successful answer p95 <1000ms at 100 users; visible score update usually within 2s plus latency; ≥24 FPS on modest actual phones. The latest local **headless Chromium** capture sample measured frame time **P50 66.7ms / P95 133.4ms**, JS heap 11.2MB. It does **not meet the 24 FPS frame-time target under that fixture** and is not an actual phone GPU measurement (several browser contexts and headless rendering). Renderer caps of 60/30 FPS are settings, not measured performance guarantees. Real 100/250/500 staging, authenticated HTTP load, multi-connection PostgreSQL races and low-end phone results are **NOT_RUN** because no staging project or devices were supplied/authorized. Measure and optimize on those targets before enabling production.

Visibility is best effort and can miss a report when a browser/connection is killed. Review events manually; never describe it as proof of cheating.

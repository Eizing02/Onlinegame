# Boss Raid rollout — manual, approval required

The user authorized pushing the completed Boss Raid code/assets to GitHub on 2026-10-12 and reported that the SQL was already applied. The agent has not independently verified that remote database, executed production SQL, or enabled the production feature flag. Follow the verification/release gates below; GitHub publication does not prove production readiness. Google Cloud OAuth/Provider settings remain as configured; Boss Raid needs no additional Google Client ID/Secret.

1. Back up database and record counts/IDs of accounts, identities, teacher access, question sets/questions/options and existing rooms. Confirm 001–008 already installed and Google Login/Classic work.
2. Review `supabase/migrations/009_boss_raid_time_attack.sql`. It is additive: a default `classic` mode and private Raid tables/functions/guards. Do not run 001–008 again on an existing project. Do not rename student codes, truncate or recreate old tables. If 009 already exists, stop; it is forward-only, not an idempotent reinstall.
3. Run **only 009 on authorized staging** with SQL Editor/CLI. Run `scripts/boss-raid/verify-deployment.sql` (read-only) and compare old data counts. Check schema cache if Supabase reports missing RPC after migration.
4. Asset preflight: `npm run raid:assets:validate`, all 42 sheets and readiness true. The source drive isn't needed once assets are present. Confirm permission to publish the user-provided sprites before GitHub/deploy.
5. Keep existing Supabase URL/public key/server service key, Google mode and exact app origin. Add server environment `BOSS_RAID_ENABLED=true` only for staging after preflight. `DATA_BACKEND=supabase` is required. Do not use a `NEXT_PUBLIC_` service role or feature flag.
6. `npm run lint`, `npx tsc --noEmit`, `npm run build`, Classic/Google/Raid tests. Test Google teacher/student ownership, create/join, 1/3/5, independent answers, hidden reports, timeout, late join, results, network recovery and actual phone GPU. Run multi-connection staging load after authorization.
7. Review screenshots and outstanding source cell-edge warnings. Record p95, CPU/egress and actual Supabase tier quotas. Approval is needed before production migration, GitHub asset push, or a deploy (pushing a Vercel-connected branch may deploy automatically).
8. After approval: apply only 009 to production during a low-traffic window; compare backups/counts/read-only checks; deploy feature branch with flag still false, smoke Classic/Google first; then enable Boss Raid deliberately. Watch 403/409/503, expiry, DB lock waits and payload rate.

## Rollback

Set `BOSS_RAID_ENABLED=false` to hide new Raid creation; keep the code and migration so active Raid rooms can still be viewed/ended and historical results remain. Classic default continues unchanged. This is a logical rollout switch, **not** a schema rollback. An old pre-Raid build cannot read Raid rooms correctly, so avoid blindly reverting while they are active.

Do not drop columns/tables or roll back 008. If a destructive removal is ever needed, export Raid results and take a backup first, then get explicit approval and write a separate reviewed migration. Never roll back existing accounts/RBAC/question data as part of Raid.

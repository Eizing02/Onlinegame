# Teacher party and combat feedback

Teacher's upper-right party panel lists the selected team's student names, hero portraits/classes and HP in lobby, combat and ended states. Student and teacher share `RaidPartyRoster`; outside taps and Escape dismiss it. The bounded list is keyboard-scrollable. During a team change it shows loading rather than another team's names or arena.

Nine transparent textures were generated with the built-in imagegen tool, then resized with alpha preserved for runtime. They match the original sprite elements: silver-blue warrior, cyan mage, orange-gold wizard, green witch, gold fairy, violet dragon claw/flame/ultimate, mint-gold healing. Original character sheets and arena sources are unchanged. Exact prompts are saved beside this document and embedded in every runtime PNG. `generated-assets.json` records final paths, hashes, dimensions and alpha checks; `atlas-light.png` and `atlas-dark.png` show all nine against both surfaces.

Pixi owns each scene's small texture cache. Duplicate classes reuse textures. Impacts last 580 ms; authoritative numbers bounce, rise and fade over 1100 ms. Both own-answer presentation and the spectator queue call the same feedback renderer. Concurrent incoming hits share the current dragon strike, with each target receiving its own confirmed feedback. Nodes, history and textures are bounded and disposed on unmount. Missing textures preserve numbers and the previous projectile fallback; legacy events without actual HP loss show the effect without a guessed number. Existing visual/audio preferences remain available; full effects are the default.

## SQL needed before release

Apply **only `supabase/migrations/011_raid_combat_feedback.sql`** after the already-applied 009 and 010. This adds a nullable `damage_taken` field and a private emitter overload, and refreshes the resolver/snapshot JSON to export `damageTaken`. It does not change scores, damage formulas, room timing, the three-second question gate, Google Auth, Classic Mode, RBAC or existing data. It leaves old events NULL and does not backfill guesses. Existing emitter calls stay compatible; anon/authenticated cannot call the new emitter.

Implementation validation used only local fixtures; the agent did not execute production SQL. On 2026-10-13 the user reported that the SQL had been run and authorized pushing this update to GitHub `main`. That report is not an independent production database verification. Do not execute a test fixture or seed against production.

1. Review and back up the intended Supabase project as part of your normal release process.
2. After explicit approval, run migration 011 in that project's SQL Editor.
3. Run `scripts/boss-raid/verify-combat-feedback.sql` manually; it is read-only. Expect the column/JSON flags true, emitter permission true only for service_role, and both invalid-result/private-publication counts zero.
4. Release the frontend after SQL succeeds. If frontend arrives first, the old events still work; incoming damage numbers wait for the new metadata.
5. Test a correct answer, incorrect answer, low remaining HP, healing and teacher team switching in an authorized test room.

## Local checks

- `npm run test:raid`: old rules/presentation and new SQL/feedback unit checks against isolated PGlite and controlled rendering doubles.
- `node scripts/boss-raid/validate-vfx.mjs`: actual PNG hashes, dimensions, transparent pixels, prompts and decoded texture budget.
- `npm run test:e2e:raid`: real Google fixture login, classroom gameplay, party panels and authoritative HP loss.
- `npx playwright test --config=playwright.scene.config.ts --grep 'combat feedback'`: real Pixi asset rendering, all hero elements, boss phases, concurrent hits, dedup, missing textures and remounts.
- `npm run test:raid:presentation`: scene geometry, audio/cues and lifecycle checks.

Evidence and final review are recorded in `.impeccable/review/combat-feedback/` and `validation.md`. The calibration page and its pause control are development-only; they never appear on teacher/student pages.

## Changed implementation

| Area | Files |
| --- | --- |
| Shared party / teacher selected-team HUD | `src/features/boss-raid/components/RaidPartyRoster.tsx`, `RaidStudentHud.tsx`, `TeacherRaidOverview.tsx`, `raid.css` |
| Answer feedback and readable mobile room context | `src/features/boss-raid/components/RaidClient.tsx`, `raid.css` |
| Generated impacts, floating numbers and concurrent hit handling | `src/features/boss-raid/engine/combat-feedback.ts`, `combat-scene.ts`, `types.ts` |
| Actual HP loss metadata | `supabase/migrations/011_raid_combat_feedback.sql` |
| Generated assets / provenance | `public/assets/boss-raid/vfx/*.png`, this directory's prompts and asset report |
| Local validation | `tests/boss-raid/feedback.spec.ts`, `scene-audio/feedback.spec.ts`, `sql-feedback.mjs`, `feedback-unit.mjs`, `tests/helpers/google-database.mjs`, `scripts/boss-raid/validate-vfx.mjs`, `verify-combat-feedback.sql`, `playwright.raid.config.ts`, `package.json` |
| Development-only capture aid | `src/app/dev/boss-raid/scene/scene-calibration.tsx` and debug-gated scene methods |

# Boss Raid UI review record

This is the documentation handoff for an ordinary extension of the existing KruEIonline interface. The finish reviewer's final disposition is **ship for the three listed fixes**. It is not a new whole-surface approval, a production release, or evidence of mobile performance or staging capacity.

## Authority and inspected boundary

The user pins composition and rules to `C:/Users/piyaw/Downloads/ONLINEGAME_BOSS_RAID_CODEX_MASTER_IMPLEMENTATION.md`. The [surface direction contract](../../.impeccable/surfaces/src-features-boss-raid-components-raidarena-tsx.md) translates that brief into the existing navy/violet/cyan classroom world: original character sprites, boss on the left, real teammates in one straight right-hand column, and the independent question as the protected task. This is a code-led extension with no approved comp, direction seed, or QUALITY BAR board.

The documenter inspected `RaidArena.tsx`, `RaidClient.tsx`, `RaidQuestionModal.tsx`, `RaidRoomForm.tsx`, `TeacherRaidOverview.tsx`, `RaidResults.tsx`, and `raid.css`, together with the global stylesheet/font setup, combat scene, sprite loader, capture script, and relevant test source. Existing [PRODUCT.md](../../PRODUCT.md), [DESIGN.md](../../DESIGN.md), and [.impeccable/design.json](../../.impeccable/design.json) are preserved exactly. This pass writes only this report and performs no browser interaction, rendering, capture, detector run, production database action, push, or deployment.

## Comparison with the incumbent system

| System commitment | Finished implementation and evidence |
| --- | --- |
| Navy surfaces and violet primary action | Raid CSS inherits `--background` `#050716`, `--surface` `#081126`, `--panel` `#111f42`, `--foreground` `#f8fbff`, `--muted` `#b9c8ee`, `--primary` `#6d3df1`, and `--primary-dark` `#5830c9`. The create-room capture shows the familiar form and violet action inside the existing app shell. |
| Cyan focus and meaningful status | Native controls use the incumbent `#43ddff` focus outline. Named scroll regions also have visible focus. Selection, HP, connection, timer, and score states include text or numeric values. Health is not communicated by color alone. |
| Readable Thai typography | Raid components inherit the root `next/font` Noto Sans Thai setup through `--font-geist-sans`; that variable's historical name does not mean the runtime font is Geist. Inputs remain at least 16px in the short viewport. Timer, HP, and scores use tabular numerals. |
| Familiar rounded controls and panels | Raid controls use the incumbent 10px radius; arena/dialog use 16px. Primary touch controls have a minimum height of 44px. Raid-specific headings, small HUD labels, selected-state tints, and 12/14px containers are local choices rather than additions to the global token spec. |
| The Classroom Task Rule | The centered native question dialog separates internally scrollable question and answer areas from its confirmation footer. Arena effects are noninteractive and remain below the dialog. Active questions intentionally resist Escape dismissal, as the master brief requires. |
| Full-screen rooms and internal scrolling | Student/teacher content stays inside the room viewport; results tables and long question content scroll internally. At 800px, teacher team selection becomes a horizontal strip, rankings stack, and the setup form becomes one column. The 320px and simulated keyboard evidence checks the narrow layouts. |

The fantasy characters come from the user's real sprite sheets. Source layout places the boss at 25% of the arena width and each participating hero at 81%, with evenly spaced vertical positions for one through five members and bounds on both sprite dimensions. Only eligible, selected heroes are drawn. HUD bars remain separate DOM elements. The teacher renders one selected team's `RaidArena`; other teams use DOM summaries and bars. Capture metrics record one canvas for active arena/question views and zero for setup, lobby, and results.

Health states in source are healthy above HP60, injured at HP31–60, critical at HP1–30, and knocked out at HP0. The final health captures show green HP100, amber HP40, red HP10, and a muted empty HP0 bar with a defeated pose and `ช่วยฟื้นเพื่อนได้` text. The student status explains the solo self-revival exception. The question header separates points for the current question from cumulative Raid score. Results retain separate average-score and fastest-kill standings, with numeric progress for teams that have not defeated the boss.

### Pre-existing drift preserved

- PRODUCT.md still names brand purple `#8b5cff`; DESIGN.md's normative primary and current global CSS use `#6d3df1`. Boss Raid follows the latter, matching the incumbent primary controls.
- The sidecar's Panel preview uses an 8px radius while DESIGN.md's panel primitive is 16px. The raid arena/dialog follow 16px; this pass does not reconcile the older preview.
- Sidecar component snippets request generic `sans-serif` in font shorthands, while the actual app loads Noto Sans Thai. No preview font or global typography token is rewritten.

These differences are reported without repair. Local HUD sizes, arena tonal colors, opacity tints, and motion timings are also not canonized into the incumbent system to make detector advisories disappear.

## Capture and review evidence

The [metrics file](../../.impeccable/review/boss-raid/metrics.json) records 24 required captures and one local frame sample. Captures use `fullPage: true`; the dimensions below are the configured CSS viewports, so a full-page image can be taller than its viewport. All 24 viewport entries record `documentOverflow: false`.

| Required captures in `.impeccable/review/boss-raid/` | CSS viewport |
| --- | --- |
| `create-desktop.png`, `create-mobile.png` | 1440×900; 390×844 |
| `arena-1-desktop.png` through `arena-5-desktop.png` | 1440×900 each |
| `arena-1-mobile.png` through `arena-5-mobile.png` | 390×844 each |
| `lobby-mobile.png`, `arena-injured-mobile.png`, `arena-zero-mobile.png` | 390×844 each |
| `arena-5-teacher-320.png`, `arena-5-user-320.png` | 320×700 each |
| `arena-5-tablet.png` | 1024×768 |
| `question-user-320.png`, `question-choice-320.png`, `question-true-false-320.png` | 320×700 each |
| `question-keyboard-320.png` | 320×400, a simulated keyboard viewport |
| `results-desktop.png`, `results-mobile.png` | 1440×900; 390×844 |

The reviewer reopened the 22 original paths plus both added health captures for evidence validity. Its bounded same-reviewer [verdict](../../.impeccable/review/boss-raid/verdict.md) scores the initial material fix list:

| Material finding | Final score and supporting evidence |
| --- | --- |
| Confirmation hidden in a short viewport | **Resolved.** `question-keyboard-320.png` and metrics show a 44px answer input at y206–250 and a 44px button at y309–353 inside the dialog's y36–364 bounds. This supports the supplied 320×400 fixture, not a physical keyboard claim. |
| Cumulative score missing during active questions | **Resolved.** The short-text, choice, and true/false captures distinguish question points from cumulative values of 60, 30, and 10 respectively. |
| Hero health states indistinct | **Resolved.** The injured and HP0 captures show distinct bars, numeric HP, and a knocked-out status/pose. |

The documenter independently opened `create-desktop.png`, `arena-5-mobile.png`, `question-keyboard-320.png`, `arena-injured-mobile.png`, `arena-zero-mobile.png`, `results-desktop.png`, and the additional focused results capture below to compare the rendered output with source and incumbent tokens. This is documentation sampling, not a replacement finish review.

The single saved [detector run](../../.impeccable/review/boss-raid/detector.json) contains **0 primary findings and 49 advisories**: 16 color, 30 font-size, and 3 radius advisories. These are the saved run's results, not a claim about a new scan of later edits. No second detector ran.

## Final focused changes and their scope

After the bounded review, an automated accessibility check identified a scrollable region without keyboard focus. The final source adds named focusable room, question, ranking, academic-report, and audit regions, with visible cyan focus. `tests/boss-raid/gameplay.spec.ts` checks the student results region with axe for serious/critical violations, focuses it, and verifies that PageDown increases its internal scroll position. The additional [results-student-keyboard-320.png](../../.impeccable/review/boss-raid/results-student-keyboard-320.png) exists and shows the focused 320×700 results region. It is additional focused evidence; it is not one of the reviewer's 24 scored captures or an entry in the saved metrics matrix.

The final source also adds the required **220ms dialog entrance**, retains a **300ms exit**, and disables those animations under `prefers-reduced-motion`. A **4s visual-only boss ultimate cooldown** uses local presentation time and does not change damage, HP, score, or the authoritative exam clock. Static captures made with animations disabled cannot certify these motion timings; the values are evidenced in source. These changes do not alter the arena or dialog geometry.

The same finish reviewer subsequently appended a [Keyboard access addendum](../../.impeccable/review/boss-raid/verdict.md#keyboard-access-addendum). It scores **only the supplied keyboard-access finding resolved**, based on the focused capture, named focusable regions, visible focus styling, and builder-reported automated results. It found **no obvious concern in the supplied source changes** for the 220ms entrance and 4s ultimate cooldown. That source inspection is not an animation playback verdict. The reviewer did not rerun tests, reopen the whole-surface review, or certify physical keyboard, GPU, or staging behavior; the addendum does not extend the original three-fix ship verdict.

Final verification reported by the parent build thread: **`npm run test:e2e:raid` passed all five tests on the final optimized build (1.6 minutes)**, and **`npm run test:e2e:google` passed all eight tests (56.9 seconds)**. Serious/critical axe violations were empty in the student results `.raid-room` region for the one-, three-, and five-student cases. The solo 320×700 case passed the focus/PageDown assertion and produced the final focused results PNG; the parent also opened it and checked its named state, viewport, readable text, and cyan outer focus ring. This is not a whole-app axe certification. The parent additionally reports final lint, build, unit/135 SQL assertions, and validation of all 42 sprite sheets passing. The documenter did not rerun these checks.

The three-fix reviewer disposition remains bounded to its original fix list. Later automated checks and focused captures do not expand it into whole-surface approval.

## Sprite and performance limits

The asset validation record contains **42 real sheets, 672 frames, and 0 validation failures**, with **221 silhouette-at-cell-edge warnings** inherited from the source images. The provenance handoff reports **42/42 shipping PNGs with provenance present**. Copies carry origin metadata; original source pixels/alpha are preserved, and no generated replacement character art is introduced. See [assets.md](assets.md), [asset-validation.json](asset-validation.json), and [asset-import.json](asset-import.json).

The complete decoded RGBA inventory is **219,197,312 bytes (about 209MiB)**. The scene loads actual participants' initial clips and acquires other animations as needed. The loader limits concurrent decoding to two and targets at most eight cached sheets / 64MiB; referenced sheets are retained, so that target is not a hard upper bound on active texture memory. Frames share each sheet's texture source. DPR is capped at 1.5, or 1 in low quality. The renderer is stopped when the document is hidden and disposed with the scene. DOM HP and the answer workflow remain available when WebGL or sprite loading fails, with a visible status message.

The actual `local-frame-sample` in metrics is **P50 66.7ms, P95 133.4ms, and 11,200,000 bytes of JS heap**. It is a headless desktop Chromium fixture and **does not meet the 24fps target under that fixture**. The configured 60/30 FPS limits and UI quality labels are requested caps, not measured delivered frame rates. JS heap does not measure GPU texture memory.

Physical modest-phone GPU measurements, physical keyboard behavior, and actual authorized staging tests at **100 / 250 / 500 concurrent users are NOT_RUN**. No device or staging evidence supports a capacity or mobile FPS guarantee. [testing.md](testing.md) records the fixture limitations and staging procedure; the room's maximum is 12 teams ×5 players, so 500 learners require multiple rooms.

## Documentation outcome

The extension remains in the incumbent classroom world and preserves the existing Classic/Google/RBAC integration intent. This UI documenter pass does not independently certify backend authorization or Classic regressions; those belong to the implementation's separate test record. No new global token or prohibition is promoted from this task. Incumbent files remain unchanged, the saved review's scope remains explicit, and the missing physical-device/staging facts remain open evidence requirements.

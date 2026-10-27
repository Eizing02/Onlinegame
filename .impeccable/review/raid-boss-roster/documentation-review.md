# Ordinary-extension documentation review

Date: 2026-10-28. Status: documentation complete for the three-boss roster extension. The incumbent classroom system remains authoritative. The approved change adds two generated opponents and persistent, independent per-team random assignment with duplicates allowed and equal gameplay; it does not establish a new visual identity or global design-system change.

Only this review was written. `PRODUCT.md`, `DESIGN.md` and `.impeccable/design.json` were preserved byte-for-byte. Boss-specific behavior, provenance and operational guidance remain in `docs/raid-boss-roster/README.md`, `validation.md`, `generated-assets.json` and `.impeccable/surfaces/raid-boss-roster.md`.

## Authority and finished-build comparison

Read the shipped `impeccable_documenter.toml` role and complete `reference/document.md`. The applicable `reference/new-work.md` clauses say a local feature inherits its established surface and ordinary extensions compare against the incumbent system, preserve its files, and report pre-existing drift without repairing it unasked. No refresh, overwrite, merge, new roll, comp round or sidecar regeneration is needed for this extension.

The finished source and sampled supplied renders retain cream/parchment reading surfaces, dark brown ink, wine actions, blue-ink focus/status, mist arena surround, Thai type and the incumbent bounded viewport composition. The sandstone/amber titan and wine/plum/mist scorpion extend the painted fantasy raster language. Their anatomy, rune/crystal colors and VFX are character presentation data, not semantic UI tokens for unrelated surfaces.

`BossIdentity.tsx` adds a decorative 28px portrait beside a readable Thai name, and keeps the name when an image fails. Teacher team controls, the selected arena and result rows resolve the same boss catalog. `RaidResults.tsx` appends the boss column after existing CSV columns. `boss-definitions.ts` explicitly holds presentation metadata, inherited sound mappings and visual impact anchors; it contains no gameplay HP, damage multiplier or scoring ability. `manifest.ts` retains the 4x4/16-frame format and ten hero identities.

The compact teacher correction is a task-local composition adaptation: the final max-width 600px/max-height 650px rule reserves 44px above the stage for the name/current/max-HP strip, while `framingProfile()` applies all-clip bounds to compact teacher portrait and landscape stages. This supports the incumbent Classroom Task rule without redefining global spacing or type primitives. The directly opened 320x568 titan capture shows its head, fists and feet below the readable strip, with timer, party, full team data and controls still present.

The fresh full finish review originally returned `fix` for the compact teacher HUD masking the opponent. `verdict-pass.md` resolves that single finding and returns `ship`, explicitly covering the scored fix only. This documenter does not expand that verdict into an independent whole-application certification.

## Five-line system summary

1. Palette: wine `#790D16`, parchment `#E5D3AF`, cream `#F5EFE1`, mist `#AEC4D4`, brown ink `#392829`, blue ink `#25475A` and selection gold `#D0A04A` retain their incumbent roles.
2. Type: Noto Sans Thai through the existing font variable; 16px body, 14px labels, 13/12px metadata, 18px question text, existing room/display hierarchy and tabular status numerals remain the baseline.
3. Form: 10px controls, 12px popovers, 14px hero tiles, 16px panels/arena corners, thin brown borders and minimum 44px controls continue the established vocabulary.
4. Depth and motion: soft brown dialog/party shadows, tonal layering, original scene grading, reduced-motion support, shared three-second combat presentation and five-second answer confirmation remain task-driven.
5. Named rules: Readable Ink, Status With Words, Classroom Task and Saved Sound remain unchanged; boss names/HP accompany artwork and character presentation does not alter authoritative gameplay.

## Exact evidence and limits

- System/authority: `PRODUCT.md`; complete `DESIGN.md`; schema-version-2 `.impeccable/design.json` token metadata, narrative, shadow/motion/breakpoint and behavior extensions plus component snippets; `.agents/skills/impeccable/agents/impeccable_documenter.toml`; complete `.agents/skills/impeccable/reference/document.md`; applicable extension clauses in `reference/new-work.md`.
- Direction/review: `.impeccable/surfaces/raid-boss-roster.md`; inherited `.impeccable/raid-vintage-direction.md` and `.impeccable/questions/roll.json`; this review directory's `review-packet.md`, `quality-bar.md`, `detector-triage.md`, `finish-review.md`, `verdict-pass.md` and `required-captures.json`. The list contains 38 existing paths. The finish reviewer reports opening all 38 required captures, four frame contacts, two master alpha previews and the VFX preview; this documenter did not repeat that full visual review.
- Artifact source under `src/features/boss-raid/`: complete `components/BossIdentity.tsx`, `RaidArena.tsx`, `RaidResults.tsx`, `assets/boss-definitions.ts` and `manifest.ts`; sampled `TeacherRaidOverview.tsx` team/arena wiring; `raid.css` incumbent controls, identity styling and final compact teacher block; sampled `engine/combat-scene.ts` boss identity, impact anchor, actor layout and all-clip compact framing. Also checked final palette/font declarations in `src/app/globals.css`, `src/app/layout.tsx` and `src/lib/theme/palette.ts`.
- Direct visual sample, opened from existing local files in this review directory: `teacher-stone_titan-small-phone.png` (320x568), `teacher-crystal_scorpion-desktop.png` (1366x768) and `student-titan-question-phone.png` (390x844). These show the corrected reserved teacher HUD, distinct grounded opponent, incumbent classroom controls and readable question/input/footer. Other captures were inventoried and their review is attributed to the finish reviewer.
- Provenance inventory: parsed `docs/raid-boss-roster/generated-assets.json`: 32 entries, comprising two masters, 24 sheets and six effects; zero missing prompt/hash fields, runtime references or referenced prompt files. Sampled the two master prompts and first titan VFX prompt in the manifest. Did not rehash all rasters, reopen every prompt body or repeat the metadata detector. The supplied triage reports one 95-raster scan with zero missing metadata and unchanged original animation sheets.
- Operational documentation: read complete `docs/raid-boss-roster/README.md` and `validation.md`. They document equal gameplay, persistent duplicate-allowed assignment, old-room dragon compatibility, selected-boss loading, bounded cache, original audio reuse, migration 014 and read-only verifier, plus the absence of production SQL/deploy/push. The current validation report records build/lint, 403 isolated SQL checks, 46 feedback checks, 2,067 presentation checks, asset/scene/new-room browser checks and 12/12 prior Raid regressions; these are supplied results and were not independently rerun by the documenter.

At this pass, the compact-fix feedback rerun and Classic/Google/RBAC regressions remain owned by the parent and pending in `validation.md`; this review does not mark them passed. No server, browser, test suite, database or Git operation was run for this documentation pass. Headless Chromium captures and isolated PGlite results do not establish physical school-device performance, real Google OAuth behavior or production multi-connection locking.

## Drift not canonized or repaired

- The four font-size advisories remain in incumbent `raid.css`: 9px at lines 9 and 93, 21px at line 34 and 23px at line 96. Their pre-existing status is recorded in this task's detector triage and the prior hero documentation review. No type token was added to legitimize them. The two developer-gallery alpha-background advisories are likewise reported as incumbent by triage and are not made product colors.
- Historical direction/roll records retain legacy raw-key serialization without a modern opaque seed reference. This inherited format drift was read as historical evidence; its files were not rewritten and no replacement seed reference was invented.
- The incumbent sidecar's `audio-popover` shadow entry specifies a resting shadow, while its Shared Audio Control snippet and `DESIGN.md` describe the current shared panel as border-separated without one. This existing internal documentation discrepancy remains untouched.
- The unchanged global Layout paragraph/compact metadata describe the earlier hero arrangement; the prior hero extension's two pages of five remain task-local implementation and surface documentation. The present compact teacher strip is likewise recorded here and in its surface source, not silently promoted into a global rule.

No new craft-floor defect or task-specific character color was canonized. Existing drift is outside the approved ordinary extension.

## Preserved-file fingerprints

SHA-256 before review and after writing this review:

| File | SHA-256 |
|---|---|
| `PRODUCT.md` | `1FD386C406EA7CC26AEFE7E6CC5DF851B1A76D4E04C9AFDC8C252880616F2A88` |
| `DESIGN.md` | `02FA4D6CB2BC8FF6279F4AC379CECA9B72B59B5AB23CE97BE73DECC1C40B072E` |
| `.impeccable/design.json` | `EAB4F9855E5B3B8F1BF4FE15A041D0382243EFC45A847C623C1090A0127BB5D6` |

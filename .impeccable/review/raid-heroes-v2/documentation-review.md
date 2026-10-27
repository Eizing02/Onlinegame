# Ordinary-extension documentation review

Date: 2026-10-27. Outcome: documentation complete for the five-hero extension. The incumbent design system remains authoritative. This is an addition within the existing Boss Raid surface, with no replacement visual world or approved global system change.

Only this review was written. `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json` and the historical direction records were preserved byte-for-byte. The extension's behavior and operational notes live in `docs/raid-heroes-v2/README.md`, `docs/raid-heroes-v2/validation.md` and `.impeccable/surfaces/raid-hero-expansion.md`; they are not promoted into rules for unrelated surfaces.

## Authority and comparison

Read the shipped `impeccable_documenter.toml` role and `reference/document.md`. The current `reference/new-work.md` explicitly says that a local addition inherits its established surface, an ordinary extension does not rewrite `DESIGN.md`, and pre-existing drift is reported without repair. That extension rule applies here; no refresh/overwrite/merge of the global system was attempted.

Compared `PRODUCT.md`, `DESIGN.md` and the schema-version-2 sidecar with the finished component/CSS source, global palette/font declarations and three representative supplied captures. The artifact retains the warm classroom system: cream/parchment reading surfaces, dark brown ink, wine actions, blue-ink focus and mist arena surround. The ten fantasy silhouettes extend its supplied raster language. Character-specific VFX colors remain presentation data inside the combat artwork; they are not new semantic UI tokens.

The selected tile retains its gold boundary/aura, check, explicit selected name, `aria-pressed` and grayscale alternatives. Static portraits and fallback SVGs join the existing names/HP party rows. The 5×2 desktop grid and two independent pages of five at compact width/short height are task-local adaptations documented in the surface brief. Compact portrait sizes and tile padding do not redefine the global component primitives. The source preserves bounded internal scrolling, 44px page controls, keyboard page navigation and an independent swipe region.

`hero-definitions.ts` contains attack presentation, effect, mode and inherited sound mapping, with no HP, damage multiplier or scoring ability. Sampled `combat-scene.ts` initializes actors by player ID, assigns shared formation slots, leases actual clips, grounds each frame, dispatches named VFX and forwards confirmed event damage/healing into feedback. Reduced motion and missing-asset paths preserve the result. This is evidence for the implementation relationship, not a new independent end-to-end gameplay certification.

## Five-line system summary

1. Palette: wine `#790D16`, parchment `#E5D3AF`, cream `#F5EFE1`, mist `#AEC4D4`, brown ink `#392829`, blue ink `#25475A`, selection gold `#D0A04A` remain incumbent roles.
2. Type: Noto Sans Thai through the existing font variable; 16px body, 14px labels, 13/12px compact metadata, 18px question text and the existing room/display hierarchy; tabular status numerals remain in use.
3. Form: 14px hero corners, 10px controls, 12px party popover, thin brown borders and 2px selected-gold boundary continue the existing shape vocabulary.
4. Depth and motion: soft brown dialog/party shadows, gold selection aura, 200ms hero state changes, the shared three-second combat presentation and five-second confirmation remain task-driven.
5. Named rules: Readable Ink, Status With Words, Classroom Task and Saved Sound remain unchanged; selection has words/check/control state, and art stays subordinate to classroom controls.

## Exact evidence checked

- System and authority: `PRODUCT.md`; `DESIGN.md`; `.impeccable/design.json` (token metadata, shadow/motion/breakpoint extensions, narrative and sampled hero/party/audio snippets); `.agents/skills/impeccable/agents/impeccable_documenter.toml`; `.agents/skills/impeccable/reference/document.md`; applicable extension clauses in `.agents/skills/impeccable/reference/new-work.md`.
- Direction and quality: `.impeccable/surfaces/raid-hero-expansion.md`; `.impeccable/raid-vintage-direction.md`; `.impeccable/questions/roll.json`; `.impeccable/review/raid-heroes-v2/quality-bar.md`; `.impeccable/review/raid-heroes-v2/finish-review.md`. The reviewer returned `ship` with all five required sections and no material fixes. The current brief cites historical paths without copying raw seed serialization or inventing a new roll.
- Artifact source: complete `HeroSelectLobby.tsx`, `HeroPortrait.tsx`, `RaidPartyRoster.tsx` and `assets/hero-definitions.ts`; sampled `raid.css` around incumbent controls/hero/party rules and the complete new ten-hero block; sampled `engine/combat-scene.ts` around initialization, clip acquisition, per-frame grounding, confirmed attacks/healing, effect dispatch, bounds and disposal. Paths are under `src/features/boss-raid/`. Also checked final palette/font declarations in `src/app/globals.css`, `src/app/layout.tsx` and `src/lib/theme/palette.ts`.
- Direct visual sample, opened as existing local images: `hero-lobby-desktop.png`, `hero-selected-phone.png` and `new-five-desktop.png`, all under this review directory. Desktop visibly contains ten 5×2 choices; selected phone shows the second page, gold/check/name selection and grayscale alternatives; the cropped arena shows five distinct new silhouettes against the incumbent scene with boss left/heroes right. Other required viewports, ten attack impacts, five frame contact sheets and the VFX alpha sheet were inventoried and their full visual review is recorded by the finish reviewer; this documenter did not reopen all of them.
- Static findings: existing `detector.json` and `detector-triage.md`, without running a detector. Confirmed zero primary findings and four advisory font-size entries. Read-only `git show HEAD:src/features/boss-raid/raid.css` corroborates that all four reported values predate this extension.
- Provenance: parsed `docs/raid-heroes-v2/generated-assets.json`: 45 records comprising five masters, 30 sheets and ten VFX; zero missing prompt/hash fields, zero missing referenced prompt files and zero missing runtime files. Read the first two VFX prompt bodies and ranger-master prompt as samples. Did not independently reread all 45 prompt bodies, rehash every raster or repeat the 59-raster metadata scan; that broader scan is reported in detector triage and the finish review.
- Runtime evidence: read `new-five-cache-metrics.json` and `new-hero-scene-metrics.json`. The first records 48,745,600 decoded sprite bytes, eight sheets, six active references/six actors and ten named 100-damage feedback entries. The duplicate-hero case records 9,424,000 bytes/two sprite sheets and six actors. These support bounded caches and distinct effect routing, not physical-device FPS.
- Operational documentation: read `docs/raid-heroes-v2/README.md` and `validation.md`. They identify equal gameplay, versioned old/new room catalogs, preserved original assets/sounds, migration 013 prerequisites and the absence of production SQL/deploy/push authorization. Recorded validation reports build/lint, 332 SQL assertions, 46 feedback assertions, 1,635 presentation assertions, 72 atlases/1,152 frames, new selection integration and four scene cases with the duplicate-key retest. These tests were not rerun by the documenter.

At this pass, the parent's full Classic/Google/Raid regression work remains in progress. The validation report is owned by the parent and must receive the actual final results; this review does not mark those suites passed. Headless Chromium and isolated PGlite do not establish school-device performance, real Google OAuth behavior or PostgreSQL multi-connection locking.

## Drift not canonized or repaired

- Four pre-existing CSS font-size advisories remain: 9px at lines 9 and 93, 21px at line 34, and 23px at line 96 of `raid.css`. They were verified in the incumbent HEAD source. No type token was added to legitimize these values.
- Historical direction/roll evidence uses legacy raw-key serialization without a modern opaque seed reference. This is inherited format drift, already acknowledged by the reviewer. Its files remain untouched; the new extension refers to their paths, and no reroll or fabricated opaque reference was introduced.
- The incumbent sidecar's `audio-popover` shadow entry describes a shadow, while its Shared Audio Control snippet and `DESIGN.md` describe the current shared panel as border-separated without a resting shadow. This internal documentation discrepancy predates the hero expansion (the system files have no working-tree diff). It was not repaired or made an authority for new surfaces.

The unchanged global Layout paragraph and compact-breakpoint metadata describe the earlier hero arrangement. The new task's two pages of five and portrait sizing are deliberately recorded in its surface brief and implementation documentation, not silently rewritten as a global rule. No new craft-floor defect was canonized.

## Preserved-file fingerprints

SHA-256 captured before the review and rechecked after writing:

| File | SHA-256 |
|---|---|
| `PRODUCT.md` | `1FD386C406EA7CC26AEFE7E6CC5DF851B1A76D4E04C9AFDC8C252880616F2A88` |
| `DESIGN.md` | `02FA4D6CB2BC8FF6279F4AC379CECA9B72B59B5AB23CE97BE73DECC1C40B072E` |
| `.impeccable/design.json` | `EAB4F9855E5B3B8F1BF4FE15A041D0382243EFC45A847C623C1090A0127BB5D6` |

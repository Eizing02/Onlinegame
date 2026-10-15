# Join and Raid lobby — design-system check

Checked 15 October 2026. This is an ordinary extension of the existing classroom UI, inheriting seed `8026d901` through the [join surface contract](../../.impeccable/surfaces/src-app-join-page-tsx.md). No global visual-system change was approved or needed. `PRODUCT.md`, `DESIGN.md`, and `.impeccable/design.json` remain unchanged.

The shipped source and supplied review evidence take precedence over intentions. This document records the extension and its limits; it does not add normative tokens or turn local exceptions into rules for other screens.

## System retained

- **Palette:** Existing wine actions, cream reading surfaces, parchment panels, brown ink/borders, mist blue, and selection gold remain the source of truth. The final `:root` declaration in [globals.css](../../src/app/globals.css) agrees with the color frontmatter in [DESIGN.md](../../DESIGN.md).
- **Type:** Noto Sans Thai remains the shared display/body family through `--font-geist-sans`; Geist Mono and tabular numerals retain their numeric roles. Labels, supporting copy, team names, and question content continue the incumbent hierarchy.
- **Shape and spacing:** The new team choices use the existing hero corner size (14px); controls use 10px corners, panels 16px, and familiar 12/16/20/24px spacing. The join confirmation keeps the shared 48px primary-action height. The Raid rename input has a 48px minimum height.
- **Depth and motion:** Tonal surfaces and brown borders remain the base. The requested team-selection shadow uses existing gold; it is paired with a check and text. Join arrival and directional Raid tab changes are brief state feedback with reduced-motion support.
- **Named rules:** The Readable Ink Rule, Status With Words Rule, Classroom Task Rule, and Saved Sound Rule still apply. No new global prohibition or reusable token was inferred from this flow.

## Source-to-system evidence

| Extension | Evidence in final source | Relationship to the incumbent system |
| --- | --- | --- |
| A found room replaces the code form | [page.tsx](../../src/app/join/page.tsx) renders the found-room layout or code panel from the resolved game; existing membership has an explicit current-team message and return action. | Keeps one clear task and readable room identity. The supplied original wallpaper is still rendered through `Wallpaper`. |
| Team choice remains a draft until confirmation | [team-picker.tsx](../../src/app/join/team-picker.tsx) keeps local selection, uses `aria-pressed`, a check and “เลือกแล้ว”, and submits through a separate named confirmation form. Random changes only local selection. | Reuses the hero-selection gold at the user's request. Gold is supported by text and control state; it does not imply saved membership. |
| The confirmation stays reachable | [globals.css](../../src/app/globals.css) bounds the viewport and team grid, keeps the confirmation outside the scrolling grid, stacks the context at 700px, and uses a compact two-column arrangement below 500px height. | Extends the existing internal-scroll classroom layout. These layout thresholds are local to Join rather than additions to global breakpoints. |
| Captain naming is a plain lobby form | [RaidTeamPanel.tsx](../../src/features/boss-raid/components/RaidTeamPanel.tsx) shows the labeled 2–30 character input only when `canRenameTeam` permits it; otherwise explanatory text is shown. [RaidClient.tsx](../../src/features/boss-raid/components/RaidClient.tsx) owns the draft and saved notice. | Uses the existing cream input, brown border, wine action, and blue success ink. Draft state above the conditional panel survives tab changes. Server authorization and production database behavior belong to functional validation. |
| Foreground work has centered feedback | [loading-indicator.tsx](../../src/components/ui/loading-indicator.tsx) provides an SVG circle with action text and a live status. [loading-form.tsx](../../src/components/ui/loading-form.tsx) renders it into the active dialog or document body and marks pending forms busy/inert. | The wine spinner and cream state veil reuse existing colors. The veil is a temporary state layer, not a new surface color. |
| Raid distinguishes foreground work from ongoing updates | [RaidClient.tsx](../../src/features/boss-raid/components/RaidClient.tsx) and [TeacherRaidOverview.tsx](../../src/features/boss-raid/components/TeacherRaidOverview.tsx) show foreground feedback; [RaidQuestionModal.tsx](../../src/features/boss-raid/components/RaidQuestionModal.tsx) places answer feedback inside the native dialog. [RaidArena.tsx](../../src/features/boss-raid/components/RaidArena.tsx) keeps scene loading within its region. | Preserves the question dialog's top layer, existing HUD and reading surface. Routine background polling is not promoted to a blocking overlay. |
| Tabs move in the chosen direction without resetting the battle | [use-raid-tabs.ts](../../src/features/boss-raid/hooks/use-raid-tabs.ts) uses a 260ms ease-out and skips motion for reduced-motion users; touch cancellation clears the gesture. `RaidClient` keeps the battle panel mounted and hides it when appropriate. | Matches the existing calm tab vocabulary and protects drafts, scene state, and the combat presentation. |
| Choice presentation retains authored order | `RaidQuestionModal` maps the received options directly and sends their original IDs. The [feature README](README.md) records authored choices in both modes and randomized questions in Raid only. | No visual reshuffle or new letter-based answer identity is introduced. Server ordering is outside this design check; migration 012 remains pending manual production execution. |

The work retains the original vintage identity, logo, supplied wallpaper and audio sources. No new production raster was created and no asset-generation/provenance obligation was introduced. Classic, Google sign-in/RBAC, overall timer, five-second answer confirmation, and three-second combat presentation are preservation constraints; this documentation pass does not independently certify their runtime behavior.

## Review evidence and limits

The [finish review](../../.impeccable/review/join-lobby/finish-review.md) records **SHIP** for the supplied source and ten valid captures. Its scope explicitly excludes independent browser execution, full-suite testing, server ordering, auth/data internals, and uncaptured gameplay. This documentation pass read that review and sampled `join-desktop.png`, `join-small.png`, `team-phone.png`, and `answer-loading.png` against source and the incumbent system; it did not repeat the browser review or functional tests.

| Capture set | Sizes and states recorded by the finish reviewer |
| --- | --- |
| `join-desktop`, `join-phone`, `join-small`, `join-tablet`, `join-landscape` | 1440×900, 390×844, 320×640, 768×1024, 844×390; found-room selection with bounded scrolling and a named confirmation. |
| `joining-loading` | 390×844; foreground team-join spinner. |
| `team-phone`, `team-small`, `team-desktop` | 390×844, 320×640, 1440×900; lobby rename and saved feedback. |
| `answer-loading` | 1440×900; centered feedback within the native question dialog. |

The supplied [validation.json](../../.impeccable/review/join-lobby/validation.json) records equal viewport/document dimensions at all five join sizes, a visible 48px confirmation action, a scrollable team grid, no axe violations, and no captured errors. These are browser-recorded results from the review packet, not physical-device or performance certification. Functional results and deployment limits are maintained separately in [validation.md](validation.md) and [README.md](README.md).

## Advisories and drift left outside canon

The supplied [detector.json](../../.impeccable/review/join-lobby/detector.json) contains **0 primary findings and 27 advisories**: 11 type-size entries and 16 color entries. The two join-specific type advisories are the heading's fluid 32px endpoint and the 26px room heading (`globals.css`, lines 450 and 462). The finish reviewer accepted their readability in the captured context. They remain local implementation choices; this pass does not expand the global type ramp to silence the detector. The remaining advisories were not repaired or promoted to tokens.

One pre-existing metadata inconsistency was confirmed against `HEAD`: `.impeccable/design.json` still lists an `audio-popover` shadow (`0 12px 32px rgba(57,40,41,.15)`) under `extensions.shadows`, while `DESIGN.md` describes a flat audio panel, the sidecar's Shared Audio Control snippet has no shadow, and the incumbent `.audio-panel` CSS has no resting shadow. This is retained as historical sidecar drift, not canonized as guidance or repaired during a lobby extension.

Only this design-check document was written by the documenter. The existing product/design records and production source were preserved; no SQL was run against production and no deploy or push was performed by this pass.

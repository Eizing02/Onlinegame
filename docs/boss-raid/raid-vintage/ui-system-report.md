# Boss Raid vintage UI system report

Documentation snapshot: 13 October 2026 (Asia/Bangkok), rechecked after the final VisualViewport, phase-3 combat, explicit teacher-progress styling, legacy empty-packet guard, and valid recaptures. This records the explicitly approved global visual replacement and the observed Boss Raid UI. The reviewer outcome below retains its scored scope; this document is not a physical-device performance result.

## Authorization and scope

The approved implementation combines the complete answer → visible combat → next-question sequence, a continuing overall deadline, a common three-second presentation, five-second automatic confirmation, a collapsible own-team party, and duplicate heroes with a gold selected aura and subdued grayscale alternatives. The visual identity applies across the app: wine, parchment, cream, and mist blue in a gentle vintage/classic contemporary treatment.

This documentation update writes only `DESIGN.md`, `.impeccable/design.json`, the visual-language/motion commitments under `PRODUCT.md` Brand Commitments, and this report. It preserves unrelated product facts, Google identity/RBAC constraints, Classic gameplay, and original raster/audio sources. It does not execute SQL, edit application source, or publish changes.

Direction sources:

- `.impeccable/raid-vintage-direction.md`
- `.impeccable/surfaces/src-features-boss-raid-components-raidclient-tsx.md`
- `.agents/skills/impeccable/reference/document.md`
- `.agents/skills/impeccable/reference/new-work.md`

The existing navy-space system in DESIGN.md was superseded by the authorized durable visual replacement. The documentation follows the actual built tokens rather than retaining obsolete purple/cyan values.

## Source of truth

`src/app/globals.css` contains the final root token override, which takes precedence over earlier declarations. `src/lib/theme/palette.ts` supplies matching numeric colors to canvas scenes.

| Role | Built value | Application |
| --- | --- | --- |
| Wine | #790D16 | Primary actions, selected answers, danger/urgent time |
| Wine hover | #5E0A11 | Primary hover |
| Cream | #F5EFE1 | Background, surface, on-primary text |
| Parchment | #E5D3AF | Panels, question heading, confirmation sweep |
| Strong panel | #EADDC4 | Secondary surface/hover |
| Mist blue | #AEC4D4 | Accent surface and expanded party |
| Brown ink | #392829 | Main text |
| Muted brown | #61463F | Secondary text and placeholders |
| Blue ink | #25475A | Links, focus, selected tabs and success |
| Amber-brown | #634417 | Warning text |
| Brown border | #947754 | Field borders and dividers |
| Selection gold | #D0A04A | Hero selection border/aura |

The earlier semantic name `cyan` now resolves to blue ink. Dark `foreground` must not be used on wine fills: both primary actions and selected answer examples use cream `on-primary`.

Calculated sRGB contrast for the documented opaque pairs is 9.73:1 for wine/cream, 12.13:1 for main ink/cream, 7.46:1 for muted ink/cream, 8.61:1 for blue ink/cream, 7.73:1 for warning/cream, and 3.64:1 for border/cream. These pair calculations do not establish contrast for every composited overlay, disabled state, sprite, or image in the application.

## Implemented patterns documented

- Primary and secondary actions, labeled inputs, account/navigation, status chips, and parchment panels use the shared theme. The sidecar includes self-contained HTML/CSS examples with hover and focus states.
- The teacher team picker's boss-defeat progress explicitly uses blue-ink fill (`--cyan`) and brown-border track (`--border`). Native appearance and WebKit/Mozilla progress pseudo-elements are themed, preventing browser-default green from overriding the approved palette. The progress value is bossMaxHp minus bossHp, accompanied by team context and current HP text; this correction does not redesign the teacher layout.
- The question dialog occupies the viewport, placing timer/party inside its native top layer. A cream card is capped at 680px and separates parchment heading, scrollable prompt, scrollable answers, and fixed confirmation footer.
- The final dialog tracks VisualViewport height and offset on resize/scroll, batches updates through requestAnimationFrame, skips layout resizing at pinch-zoom scale above 1.05, and removes listeners/cancels its pending frame on unmount. Safe-area insets remain part of the dialog spacing. The captures exercise reduced viewport sizes; they do not establish physical mobile-keyboard behavior.
- The timer is shared across answer selection, confirmation, and combat. A textual final-30-second warning accompanies wine styling. Reduced motion replaces the urgency pulse with a static outline.
- The party disclosure exposes only the student's own team with name, hero, HP, and the own-player marker. The panel is width-bounded and internally scrollable.
- A selected answer uses wine/cream and a parchment sweep. Its five-second countdown can be confirmed immediately, restarted by changing a choice, or canceled. Short text enters the confirmation stage after explicit review; editing the draft cancels that stage. Hiding the document cancels automatic confirmation.
- The hero picker uses original portraits. The selected hero keeps color with gold border/aura, check icon, and text; alternative portraits become grayscale with .45 opacity. Rules-version-2 rooms permit duplicate heroes, while legacy room behavior remains explicit in the component.
- Server-confirmed answer presentation owns the scene clips until completion and the common three-second presentation window. The component displays actual result text during the visible combat interval. Static captures alone do not prove sequence completeness or timing.
- Queued and answer-priority boss attacks now use the same `bossAttackClip` selection, including the phase-3 ultimate with its original sound cue and matching effects. The focused final browser test exercises a real phase-3 attack before the next question. If the network drops after acknowledgement, the client waits for a snapshot whose cursor has advanced instead of reopening the old question from cached state.
- Legacy v1 answers do not supply the new answer-presentation packet. The client retains the common presentation delay but guards empty event packets in begin, scene attachment, and completion: it neither acquires an empty priority lock nor calls finishAnswer to suppress the normal combat queue. Manual confirmation and own-team events remain available for those rooms.
- Scene backgrounds are graded once in the decoded Canvas2D texture cache, independently of camera size. Full quality retains native dimensions; low quality caps the longest decoded dimension at 1024px while preserving native alignment ratios. Floor and background receive different mild tonal filters. Original sprites, scene files, and audio sources remain the source assets.

Responsive values were read from code: 800px for login/Raid compact layouts, 767px for Classic bottom navigation, 500px height for compact Raid question controls, 360px for the smallest Raid HUD/footer, and 600px for several account/audio surfaces. No new breakpoint or component primitive was invented for documentation.

## Evidence checked

Code read for this snapshot:

- `src/app/globals.css`, `src/app/room-layout.css`, and `src/app/layout.tsx`
- `src/lib/theme/palette.ts`
- `src/features/boss-raid/raid.css`
- `RaidClient.tsx`, `RaidQuestionModal.tsx`, `RaidStudentHud.tsx`, `RaidTimer.tsx`, `HeroSelectLobby.tsx`, and `RaidArena.tsx`
- `TeacherRaidOverview.tsx` for the team's boss-defeat progress value and accessible label
- `src/features/boss-raid/engine/combat-scene.ts`
- `src/features/boss-raid/audio/cues.ts` for the original ultimate sound mapping
- `src/features/boss-raid/scenes/scene-layers.ts`
- Classic `room-tabs.tsx` and `reveal-moment.tsx` for existing motion behavior

Visually opened screenshots under `.impeccable/review/raid-vintage/`:

| Files | Evidence used |
| --- | --- |
| `login-desktop.png`, `login-mobile.png` | Cream page, parchment login card, wine Google action, Thai hierarchy, original logo |
| `hero-desktop.png`, `hero-mobile.png` | Five/three-column picker, gold selected hero, grayscale alternatives, textual selection |
| `question-party-desktop.png`, `question-party-mobile.png` | Question card and timer/party above it; disclosure content and own-player marker |
| `confirmation-mobile.png` | Wine answer, cream label, visible remaining seconds, parchment sweep, cancel action |
| `urgent-mobile.png` | Wine timer in the final 30 seconds and textual urgency |
| `question-small.png`, `question-landscape.png`, `question-tablet.png` | Compact/landscape/tablet question layout, internally scrollable answers, visible confirmation footer |
| `combat-mobile.png` | Ready phone scene, complete arena with boss/hero visible, actual combat feedback and remaining overall time |

All 12 root PNGs were replaced after hero-selection persistence and scene-profile/font readiness were checked, and the documenter reopened all 12 current files. The earlier camera-dependent cache and partially loaded frames have been superseded; the current `combat-mobile.png` and question captures are included in the evidence.

The build owner inspected all 20 current PNGs in `scene/` (18 arena plus two calibration captures). The documenter additionally reopened `desktop-5.png`, `phone-5.png`, `small-phone.png`, `calibration-desktop.png`, and `calibration-mobile.png` to check the final native-size texture treatment, retained original sprites, formations, and viewport-specific presentation. This is evidence checked, not an independent full finish verdict.

Parsed current supporting artifacts: `hud-and-confirmation.json` contains 10 cases with zero recorded overflow/violations and confirmation controls at least 44px high; `scene/matrix.json` contains 16 viewport/formation cases with zero recorded overflow and zero ungrounded actors. The two verified arena PNGs and two calibration PNGs are additional image evidence, not additional rows in that matrix. `scene/performance-fallback.json` identifies its environment as headless Chromium on this Windows host; its values are not physical-device FPS or exact GPU allocation.

The existing detector artifact `.impeccable/review/raid-vintage-detector.json` was summarized: 89 color, 117 font-size, and 13 radius advisories against the old DESIGN.md. It is historical evidence, not a rerun against this refreshed system and not a claim that every advisory is resolved.

The separately generated Classic UI audit at `.impeccable/review/raid-vintage/classic/report.json` was parsed: 32 captured cases, zero recorded horizontal overflow, zero reported accessibility violations, and zero browser errors. This is the audit's scope; this documentation pass did not visually reopen the entire Classic matrix or certify Google/RBAC and gameplay behavior from those counts.

The build owner's current [validation record](validation.md) reports Production build/TypeScript and ESLint passing, Google Playwright (8 cases), Classic Playwright (15), full Raid Playwright (6), the final focused vintage interaction case (1), and scene/audio browser coverage (5 cases completed through serial reruns). After the final legacy guard, Production build/TypeScript, full and targeted lint, and the focused vintage case passed again. The additional legacy Playwright case passed: no automatic send after 5.2 seconds, one manual submission, no empty answer-priority lock, canvas and own events retained, and next-question entry at least 2.9 seconds after confirmation. These are separately executed local/mock tests, not tests rerun by the documenter; the full Raid count describes its earlier complete run, with the final compatibility change checked by the named focused reruns.

Teacher integration is now PASS in the local production build with mock OAuth and isolated PGlite. The completed run used five actual mock-Google student contexts, exercised HP 0 and the protected question mute control, and resolved the play promises for the original lobby, battle, and final-phase background tracks. The documenter parsed `integration/integration-metrics.json`: 13 captured cases, zero horizontal overflow, and zero reported serious/critical Axe violations. The build owner opened all 13 integration images. `capture-manifest.json` now lists 77 original images with their actual dimensions: 12 root, 32 Classic, 20 scene, and 13 integration captures. This documents local integration evidence, not production OAuth/database or physical audio-device certification.

After the teacher progress correction, the same 13 integration paths were recaptured and reopened by the build owner, and integration passed again with the same overflow/accessibility and three-track playback scope. The documenter reopened `teacher-final-phase.png` and `teacher-hp-zero.png` and checked the final explicit native-progress CSS. The latest metrics and the 77-image manifest remain consistent with the current files.

The static `nominal-animation-budget.json` calculates retained 16-frame attack/hit, kill/victory, and phase-three defeat timing for all five hero classes, including a 350ms projectile and 600ms half-speed effect. Its largest nominal total is 2,489ms within the 3,000ms common window. This is clip math only: it is not measured asset-loading latency, physical frame timing, or an FPS guarantee.

The [finish review](finish-review.md) first returned `disposition: fix` for one material visual defect: browser-green teacher progress. Following the explicit progress styling and valid 13-image integration recapture, the scoped verdict returned `disposition: ship`: the single teacher-progress correction was resolved, all 13 recaptures were valid, and no visual regression was observed in that verdict pass. This records the full prior review plus the scoped correction verdict; it does not describe the verdict pass as a new full-app review or a device/performance certification. The separate legacy compatibility change is supported by its focused regression tests, rather than counted as another scored visual correction.

## Remaining pre-existing drift and limits

- PRODUCT.md still calls the product zero-signup in Positioning, while the current login evidence and source show Google sign-in. Its synchronized-state list describes Classic and does not enumerate Boss Raid's independent flow. These product facts require a separate product-context update; this task preserves them.
- Existing source identifiers such as `SpaceBackground`, `--font-geist-sans`, and `cyan` retain historical names even though the visible palette/font now follow this system. They are documented compatibility names, not new visual instructions.
- The generic legacy `.shadow-sm` utility still contains a black .28 shadow, unlike the newer brown-ink shadows on the reviewed surfaces. This report records it without changing source or promoting it to a new default.
- Original logo and character raster colors may extend beyond the interface palette. They are approved retained assets, not evidence that the interface should reintroduce neon controls.
- The texture cache targets 24MiB and three entries by evicting unreferenced textures; active references are retained and can exceed those thresholds. This policy is source evidence, not a measured memory/frame-time result. Where Canvas2D filters are unsupported, the source image still draws.
- Local regression, teacher-integration results, and the scoped reviewer outcome retain the limits stated above and in `validation.md`/`finish-review.md`. Physical mobile keyboards, device/GPU performance, asset-loading latency guarantees, and live concurrent Supabase load are not established by this documentation recheck.

## Documentation validation

DESIGN.md carries colors, typography, rounded, spacing, and component tokens in YAML with the eight canonical sections. The v2 sidecar carries metadata, tonal ramps, shadows, motion, breakpoints, representative components, and matching narrative without duplicating primitive token arrays. A local structural check passed: all 19 documented colors match the effective CSS variables, all 10 frontmatter component definitions use allowed properties and resolve their token references, all 10 previews reference available CSS variables and parse as CSS, the eight sections are in canonical order, the narrative matches DESIGN.md exactly, and PRODUCT.md is unchanged outside Brand Commitments. Git whitespace validation also passed.

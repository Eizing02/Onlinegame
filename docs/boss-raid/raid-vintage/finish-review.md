disposition: fix

Reviewed scope: all 77 authoritative captures exist, decode, and match the manifest dimensions. I inspected 29 originals at native size (all 12 root captures, all 13 integration captures, and Classic question-editor desktop/mobile, question-active mobile, and teacher-small 320); the other 48 originals were visually inspected on seven labelled reviewer contact sheets. Scene images are arena crops; calibration images are developer full pages. No capture was blank, black, misnamed, or malformed. This is a screenshot and sampled-source review, with supplied local runtime evidence; it does not certify physical devices, keyboards, school GPUs, audio loudness, FPS, production load, or deployment. Unread: 215 individual historical detector advisory contexts and generated sidecar tonal-ramp metadata; existing asset provenance was not re-audited. No approved comp, comp-led state/spec/diffs, or critique-reference comp exists or is owed for this user-pinned, code-led build.

## persistence

Pass. PRODUCT.md, DESIGN.md, and .impeccable/design.json exist. Their current brand, font, palette, responsive dialog, selection, countdown, and combat descriptions agree with the sampled implementation. The direction contract has all six blocks; FORM key 8026d901 is corroborated by .impeccable/questions/roll.json with scope=direction. No comp-round approval obligation applies. PRODUCT's older positioning and Classic state list are outside the authorized visual update and are not treated as a new claim introduced here.

The existing detector contains 0 primary findings and 219 advisories: 89 color, 117 type, and 13 radius. These were measured against the earlier DESIGN.md; neither the documentation update nor this review establishes that all advisory contexts are resolved. No second detector was run.

## fidelity

| Salient element / promise | Verdict | Evidence |
| --- | --- | --- |
| TYPE | match | Native Thai question, answer, lobby, login, and editor captures show readable contemporary lettering and clear weight/size steps. src/app/layout.tsx loads Noto Sans Thai through next/font; the legacy variable name does not substitute a system display face. Compact HUD metadata remains subordinate to question and action text. |
| MATERIAL | match | Original recognizable sprites and scene layers remain raster material, with real transparent character contours and grounded formations across 1–5 actors. scene-layers.ts grades decoded imagery once and preserves native alignment ratios. The pale UI uses ordinary semantic panels; it does not fake embossed, torn, or stamped physical material. Gold halo is the user's explicit selected-hero requirement. |
| GROUND | match | Uncovered hero-desktop.png pixel (500,650) is exactly #F5EFE1. The paper-colored panels, mist arena surround, and wine choices maintain the contract's warm light ground; confirmation-mobile.png pixel (90,436) is exactly #790D16. The question backdrop intentionally dims the underlying room while the dialog stays readable. |
| Global theme / teacher team progress | contradicted | integration/teacher-final-phase.png pixel (90,302) and integration/teacher-hp-zero.png pixel (40,251) are #008000 browser green. src/features/boss-raid/raid.css:31 sets only accent-color for .raid-team-overview progress; the explicit progress-fill rules at line 44 target .raid-arena only. This visible control escapes the approved palette. |
| Hero choice, duplicate selection, gold aura and dim alternatives | match | hero-desktop.png and hero-mobile.png distinguish the colored selected wizard with gold boundary/aura and a textual check; other portraits are grayscale while their labels remain readable. HeroSelectLobby.tsx retains enabled duplicate selection for v2 and identifies the legacy v1 restriction. |
| Overall minutes:seconds timer and final-30-second warning | match | Timer is upper right in the native question dialog and in the room during combat. urgent-mobile.png shows wine 00:27 and a written warning; use-raid-clock.ts projects the shared deadline from a monotonic local anchor, and raid.css provides pulse plus a static reduced-motion outline. Static captures establish placement and state, while the supplied tests establish ticking and deadline behavior. |
| Collapsible own-team party | match | question-party-desktop.png and question-party-mobile.png show a small disclosure with name, hero and HP, including the current-user marker. RaidStudentHud.tsx supplies aria-expanded/aria-controls and receives the student's own-team heroes; its bounded list scrolls independently. |
| Wine answer selection, five-second sweep, immediate confirmation and reset | match | confirmation-mobile.png shows wine selection, parchment sweep, numeric remaining time, confirm and cancel. RaidQuestionModal.tsx restarts the end time on a new choice, guards one submission, stops automatic sending when hidden, and permits immediate confirmation. gameplay.spec.ts:142–145 asserts reset, one submission and subsequent combat. |
| THESIS / visible combat before next question | match | combat-mobile.png exposes actual boss/hero presentation with result text and no question overlay. Sampled RaidClient.tsx and combat-scene.ts prioritize and await acknowledged-answer clips/projectiles; gameplay.spec.ts:143–150 checks phase-3 completion, question entry and acknowledged-answer offline recovery. This row credits those runtime assertions rather than treating the still image as timing proof. The documented bounded renderer-failure fallback is disclosed, not a device-latency guarantee. |
| FIRST VIEWPORT / full detail and fixed actions | adaptation | question-small.png (320×400), question-landscape.png (844×390), and integration/question-audio-320.png expose a bounded question/answer reading region while keeping HUD and a 44px confirmation control in view. Internal scrolling follows the approved contract and preserves the user's full-detail constraint. RaidQuestionModal.tsx supplies a focusable prompt region, image expansion, and VisualViewport adjustment; physical keyboard behavior remains unverified. |
| STORY / navigation and Classic | match | All Classic states named by the packet show consistent theme, standard teacher/student navigation and the original question/control flow. The dense editor and 320 teacher originals keep Thai content and actions legible. Supplied Classic 15-case and Google 8-case results support preserved behavior/RBAC; the review does not promote fixture credentials or sample scores to product claims. |
| Teacher spectator, audio, HP 0 and phase 3 | match | Native integration desktop/mobile/landscape/tablet captures keep spectator, controls, audio disclosure and roster readable. HP 0 has a visible fallen actor and written recovery state. integration-metrics.json reports 13 local captures with no overflow or serious/critical Axe violations and successful music paths; validation.md documents playback success and its limits. |
| Floor / browser surfaces, icons and focus | match | Named primary sources theme selection, caret, scrollbars and focus; icons use Lucide. Protected question focus and native disclosure/forms suit the classroom task. The requested gold aura is a deliberate exception to the decorative-halo warning. No additional material floor issue was found in this bounded review. |

## ceiling

Reached for the approved classroom product direction apart from the progress-fill defect. The restrained cream/paper frame, dark Thai type, compact powder-blue disclosure, original fantasy scene and selected gold hero are carried consistently across the inspected form factors. The distinctive authored sequence is wine selection/countdown followed by visible combat. Extra ornament, theatrical display lettering, or replacement art is not owed by this brief. Physical-device motion and performance ceilings remain unmeasured.

## material_fixes

1. Theme .raid-team-overview progress explicitly, including browser progress-fill pseudo-elements and its track, with the documented blue-ink/mist or parchment tokens; confirm a nonzero team-progress state at integration/teacher-final-phase.png and integration/teacher-hp-zero.png. This resolves the global-palette promise and the craft-floor browser-surface requirement (src/features/boss-raid/raid.css:31, contrasted with arena-only rules at line 44).

## keep

Keep the pinned four-color identity, readable Thai question regions, fixed confirmation actions, upper-right timer/party, gold selected hero, original grounded sprites, and uninterrupted visible combat sequence.

---

## verdict

1. **Resolved — teacher team progress palette.** The same integration/teacher-hp-zero.png and integration/teacher-final-phase.png now visibly render blue ink on the documented brown track at 20% and 60% completion. The previously sampled fill pixels, (40,251) and (90,302), both changed from #008000 to #25475A. src/features/boss-raid/raid.css:45 now authors appearance, track and WebKit/Mozilla fill styling with --border/--cyan. The correction reaches the original global-palette and browser-surface requirement.

All 13 overwritten integration originals were reopened at native size. They decode at the updated manifest dimensions and show valid content; no regression from this visual correction was observed. The updated integration metrics report 0 overflow and 0 reported serious/critical Axe violations. No second detector ran.

## remaining

Clear for the one scored visual fix. This ship verdict covers that correction and its inspected recaptures, not a new whole-surface review or physical-device certification. The separately reported legacy v1 empty-presentation queue guard is a functional compatibility change; its supplied E2E results remain runtime evidence and are not certified by this visual verdict. The initial full review and its stated limits remain above.

disposition: ship

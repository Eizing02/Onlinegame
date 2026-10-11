# Google Auth UI extension audit

Date: 2026-10-11. Disposition: **ship the reviewed UI extension**. The finish reviewer examined all 21 final captures and found no material fixes. This is an ordinary extension of the existing classroom system, with no new visual world or approved design-system change.

## Authority and scope

`PRODUCT.md`, `DESIGN.md` and `.impeccable/surfaces/src-app-login-page-tsx.md` govern this extension. The documenter preserved `PRODUCT.md`, `DESIGN.md` and `.impeccable/design.json`; this report does not add normative tokens or rules.

Source checked: `src/app/login`, `src/app/verify-student`, `src/app/account`, `src/app/access-denied`, `src/app/admin/teachers`, `src/components/auth/student-link-form.tsx`, `src/components/layout/app-shell.tsx`, the first 49 added lines of `src/app/globals.css`, and incumbent font/token/layout declarations for comparison. Test source and the saved audit JSON were also checked. This documentation pass did not modify application code, assets, game behavior or skill files.

## Comparison with the incumbent system

The extension uses the established deep navy background and surfaces, violet primary action, cyan focus and navigation accents, and textual green/amber/pink status treatments. Color assignments reference the existing CSS properties rather than introducing a new palette. `src/app/layout.tsx` continues to load Noto Sans Thai through `next/font`; the Google forms add no font or image asset and reuse Lucide icons and the existing planet scene.

Login retains the incumbent split scene/form composition on desktop and the existing single-column treatment below 800px, where the planet is hidden. Linking and account screens use a restrained single-column form with current identity before the next action. Teacher records use two columns on desktop and stack below 600px. The added fields and buttons retain the existing 10px control corners and 44–48px minimum control heights. The preview's local 14px radius and supporting type sizes are extension details, not new system tokens.

| Contract section | Finished implementation and evidence |
|---|---|
| THESIS | Google login and linking read as classroom tasks inside AppShell; the reviewer accepted the hierarchy across the captured states. |
| OWN-WORLD | Existing navy/violet/cyan, Thai typography, logo and orbit/planet setting remain the visual basis. Forms and native navigation carry the work. |
| STORY | One Google entry action leads to server-resolved identity. Students enter their own five-digit code, preview name/class, edit or confirm; administrators manage teacher access by email. No student directory or role picker is introduced. |
| FIRST VIEWPORT | Login leads with one Google action; verification shows signed-in email and one code field; account shows current identity; teacher management exposes add/search and named statuses. Mobile follows the incumbent adaptation. |
| FORM | Single-column forms, explicit preview/edit, associated labels, inline Thai errors, pending submission locks, wrapping identity values, desktop teacher rows/mobile records and pagination are present in source and the reviewed captures. Existing game destinations remain linked. |
| FINISH evidence | Existing tokens/icons, visible cyan focus, Thai recovery copy, keyboard input, long names/emails and the bounded screenshot/axe checks support the completed extension. The limitations below apply. |

## Recorded evidence

`tmp/google-ui-audit/report.json` contains **21 entries**, each with `overflow: 0` and an empty axe `violations` array. The capture matrix is:

| Captured state | Widths (CSS pixels) |
|---|---|
| Login | 1440, 390, 320 |
| Student-code entry | 1440, 390, 320 |
| Student preview | 1440, 390, 320 |
| Account identity | 1440, 390, 320 |
| Account code change | 1440, 390, 320 |
| Teacher list | 1440, 390, 320 |
| Add-teacher disclosure | 1440, 390, 320 |

PNG names use `{login,verify,preview,account,account-change,teachers,teacher-add}-{1440,390,320}.png` under `tmp/google-ui-audit`. The finish reviewer performed a fresh read-only review of all 21 and accepted fidelity to the incumbent system. Access-denied was inspected in source and exercised by local mock E2E assertions, but has **no named capture in this matrix**; the 21 screenshot/axe results do not cover that page or every error/loading state.

Completed-run results supplied during the UI review: **7 Google mock E2E tests PASS** and **15 legacy E2E tests PASS**. That Google suite includes preview/edit, linking, identity change, teacher administration, denial/suspension and an existing classroom join. These suites were not rerun for this documentation pass. A subsequent full-game Google test brings the implemented suite to 8 tests; its separate validation is recorded in `docs/google-auth-handover.md` and does not change this UI review's capture scope. See `tests/google/auth.spec.ts` and `docs/google-auth-testing.md` for the fixture approach and remaining real-environment checks.

## Five-dimension technical audit

Scores use the Impeccable 0–4 rubric and apply only to this extension and its available evidence. A missing measurement is left unscored; there is no aggregate health score.

| Dimension | Score | Evidence and limit |
|---|---|---|
| Accessibility | 3/4 | No axe violations in 21 states; real labels, semantic forms/details, alerts/status, `aria-busy`, input error descriptions, focus styles and local keyboard input coverage. Full WCAG conformance and physical-device/assistive-technology behavior are not established. |
| Performance | Unscored | Forms reuse incumbent assets and components. No runtime timing, bundle comparison, frame-rate measurement or network-constrained device result supports a performance score. |
| Theming | 3/4 | Added color assignments use incumbent properties and retain the established dark theme. Local sizes/radii and older literal colors remain outside the compact recorded scales; no alternate-theme behavior was tested. |
| Responsive design | 3/4 | Zero horizontal overflow at the three captured widths; wrapped identities, stacked records and minimum control heights are implemented. Evidence is Chromium viewport emulation; physical touch, mobile keyboard behavior and text-zoom coverage remain untested. |
| Implementation integrity | 4/4 | The accepted extension expresses the existing classroom system, preserves one next action and explicit identity confirmation, and uses meaningful text with status colors. The single detector run produced advisory scale findings, with no material UI repair requested after contextual review. |

## Advisory findings and pre-existing drift

`tmp/google-ui-audit/impeccable-findings.json` is the output of **one static detector run**: 74 advisories (39 color, 30 font-size, 5 radius). Eight point into the added CSS block; 66 point into incumbent CSS. These are not 74 verified defects and are not repeated audit passes. The added-block advisories concern supporting type steps and the local 14px preview radius; the color advisories occur in existing styles. The finish reviewer found no material correction after reviewing the rendered extension.

The existing schema-v2 sidecar was generated on `2026-09-09T14:27:25.369Z` and is stale relative to `DESIGN.md`: its component snippets still specify generic `sans-serif`, its narrative is partial, and it does not reflect the later team-reveal/full-screen-room documentation. Its incomplete metadata can contribute to advisory scale findings. **This drift is reported, not repaired or canonized.** The approved scope is an ordinary auth extension, so the authoritative product/design documents and sidecar are preserved rather than expanded to legitimize detector findings.

## Limits of the ship disposition

Actual Google/Google Cloud/Supabase sign-in, physical-device testing and real multi-connection PostgreSQL race tests are **NOT_RUN**. Local mocks and single-connection database evidence do not establish production OAuth configuration, production security, real database locking or performance. The disposition covers the reviewed UI extension and its local regression evidence; `docs/google-auth-testing.md` describes the remaining staging and device work.

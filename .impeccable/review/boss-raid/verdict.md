## verdict

1. **Resolved — confirmation visibility.** `question-keyboard-320.png` now shows the complete input and confirmation control within the dialog. `metrics.json` records both at 44px high; the button occupies y309–353 inside the dialog's y36–364 bounds. The question body yields space without covering either control. This proves the supplied 320×400 simulated keyboard viewport, not a physical phone keyboard.
2. **Resolved — active cumulative score.** The protected question header distinguishes `ข้อนี้ 10 คะแนน` from `คะแนนสะสม`. The short-text captures show 60, the choice capture 30 and the true/false capture 10; each remains readable at 320px while the question is open.
3. **Resolved — hero health states.** `arena-injured-mobile.png` shows green at HP100, yellow at HP40 and red at HP10. `arena-zero-mobile.png` shows the empty muted HP bar, numeric HP0, readable `ช่วยฟื้นเพื่อนได้` status and defeated pose. Health meaning therefore remains available without relying only on color.

All 22 original capture paths were reopened for evidence validity, together with the two added health-state captures. The files show their named states and sensible viewport dimensions; no missing or malformed evidence requires recapture. No regression introduced by this correction batch was observed in the supplied captures.

## remaining

Clear for the three scored fixes. This ship verdict covers that fix list, not a new whole-surface audit. Physical keyboard behavior, physical mobile GPU performance and staging capacity remain outside this verdict and unverified. No browser, render, new screenshot capture, detector rerun or code edit was performed by the reviewer.

disposition: ship

## Keyboard access addendum

- **Supplied keyboard finding: resolved.** `results-student-keyboard-320.png` is a valid 320×700 student-results capture. The cyan focus outline surrounds the scrollable results content without clipping. The inspected source gives room content a named `role="region"` and `tabIndex={0}`, and applies visible focus styling; result, academic and audit table wraps and the question body are likewise keyboard-focusable. The builder reports five Raid E2E tests passing, empty serious/critical axe results for 1/3/5 students, and an assertion that focused content responds to PageDown with `scrollTop > 0`. Those tests were not rerun by this reviewer.
- **220ms dialog opening: no obvious concern in the supplied source change.** The opening animation is separate from the retained 300ms closing fade. The later reduced-motion rules disable both animations, with the completed fade settling hidden. This is a source inspection, not a new animation playback verdict.
- **Four-second ultimate cooldown: no obvious concern in the supplied source change.** `lastUltimateAt` starts at negative infinity, allowing the first eligible ultimate. The local performance clock selects an ultimate or an attack_2 fallback and gates cosmetic effects; the inspected added branch does not write scoring, HP, authoritative state or the game deadline.

This addendum resolves only the supplied keyboard-access finding and checks the two named source changes for obvious concerns. It does not reopen the whole-surface review, extend the previous three-fix ship verdict, or certify physical keyboard, GPU or staging behavior. No browser, rendering, capture or detector run was performed.

## verdict

1. Resolved — shared-host CSS isolation. The new teacher, student-header and calibration phone/desktop captures show the same readable 16px audio labels, full-width sliders, wine mute action, cream button text and bounded close control as the common panel. The refreshed 320×400 Raid question capture retains the complete panel in its protected top layer. Scoped source selectors prevent the old host overrides; audio-host-audit.json records 286px ranges equal to their label width, the expected wine/cream colors and zero scoped Axe violations for teacher/student hosts. The parent supplies corresponding calibration and protected-dialog interaction passes.
2. Resolved — audio-policy persistence. DESIGN.md now states the saved sound rule with sound enabled by default, 65% master, 22% music/video and 70% effects, persisted mute/levels, muted-video autoplay fallback and trusted pointer/key retry without blocking actions. The sidecar mirrors that rule and behavior, and PRODUCT.md records the confirmed audio commitment. The former prohibition is removed. docs/wallpaper-audio/validation.md now exists.

Evidence: all 21 required original/refreshed and additional host captures exist, open correctly and show the claimed surfaces. The original 15 were re-read at their original paths. No regression introduced by this fix batch is visible in the supplied captures.

## remaining

Clear for the two scored fixes. Ship covers the scored fixes, not the whole surface; this is a verdict pass against finish-review.md, not a reopened full review.

disposition: ship

# Validation — 2026-10-13

Completed in the local Windows workspace with isolated local fixtures or mocked Supabase/PGlite. No production database was queried for mutation or migrated.

| Check | Result |
| --- | --- |
| Production Next.js build | PASS after the final shared-panel CSS correction |
| ESLint | PASS |
| Classic/identity/room tabs/power/UI audit + wallpaper/audio | 21 E2E cases PASS in one complete run |
| Google PKCE, account binding/edit/reset, RBAC and gameplay | 8 E2E cases PASS |
| Boss Raid gameplay, pacing/auto-confirm, old rooms, spectator and deadline | 7 unique E2E cases PASS across the suite and targeted reruns |
| New teacher/student-header audio host matrix | 1 E2E case PASS, desktop/phone hosts and 320×400 protected question audio |
| Scene audio real decode/alignment/dedup/music/mute, missing media, OPUS fallback | 3 unique E2E cases PASS across targeted reruns; 50 real sound encodings decoded |
| New calibration shared panel | 1 E2E case PASS at desktop/phone widths |
| After Impeccable correction: wallpaper/audio suite | All 6 cases PASS again and 14 Login/Join/panel captures refreshed |
| Isolated Raid rules/presentation SQL | 135 + 47 checks PASS; no production connection |
| Original PNG artwork | 3 pixel comparisons PASS; source dimensions preserved |
| Derived videos | H.264/AAC stereo, original dimensions, 24 FPS, approximately 10-second loops; 5.14/4.97 MB |
| Impeccable detector | 0 primary findings; 21 pre-existing advisories, no new shared-control findings in the initial scan |
| Raster provenance | 6 shipping PNG/WebP rasters, 0 missing provenance |

The 41 unique browser cases include six new wallpaper/audio cases and two new shared-host regressions. Earlier failed runs uncovered host CSS leakage and testing issues (overlaid test click locations, an incomplete OAuth fixture helper, legacy Login-scene expectations, shared fixture active rooms and concurrent trace-output cleanup). The corrected cases passed; no application behavior was weakened to satisfy old expectations.

Evidence: `.impeccable/review/wallpaper-audio/responsive-audit.json` records six device classes, one matching MP4 URL per class, zero page errors, no horizontal overflow and zero Axe violations. `audio-host-audit.json` records full-width native sliders, 16px labels, wine/cream contrast and zero scoped Axe violations for four Raid hosts. Screenshots cover Login/Join, common panels, teacher/student headers, calibration and the protected Raid question.

Browser interaction evidence is Chromium emulation on this Windows host. The touch regression uses a Pixel 7 context, a native touchscreen tap and CDP touch drag. Wallpaper looping, sound unlock/mute state, persisted settings, visible-first-action outside dismissal, Escape behavior, one background owner and media failures are runtime assertions. Screenshots do not establish audible loudness. Physical iOS/Android, school-PC GPU/network performance, perceived loudness and hardware keyboards were not certified.

The fresh Impeccable reviewer identified two material fixes: host CSS isolation and stale recorded audio policy. Those changes were implemented, host styles were measured, captures refreshed, and DESIGN.md/sidecar/PRODUCT Audio commitment updated. Final scoped verdict is stored in `.impeccable/review/wallpaper-audio/finish-verdict.md`.

No new SQL, Supabase setting or Google Cloud configuration is required. Publication is the user's explicitly authorized GitHub main push; a successful local build is not a claim that Vercel has finished deployment.

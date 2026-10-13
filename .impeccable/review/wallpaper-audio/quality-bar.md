# Wallpaper and shared audio extension

User-pinned artwork extends the existing vintage UI. This is a code-led extension, not a replacement visual world; there is no approved image comp or comp-led state. Keep the existing logo, Thai copy, wine/parchment/cream/mist tokens, authentication, Classic and Raid rules.

Approved behavior: Login plays the supplied phone or PC/tablet video loop with its original audio. Join shows the original matching phone/tablet/PC PNG with exactly 50% image opacity, leaving controls/text crisp. Sound starts enabled, users can mute and adjust it, and preferences persist across routes. Browser autoplay limits are handled with a muted video and retry on trusted interaction, without delaying login. A speaker opens the same three-level audio panel, native outside/Escape dismissal works, sliders remain interactive, and the button remains available inside the Raid question dialog while muted. Only one background owner plays. Keep 5-second confirmation, 3-second combat, deadline, scoring, Google Login, RBAC and old rooms.

Required evidence: login/join for phone 390×844, small 320×568, phone landscape 844×390, tablet 768×1024 and 1024×768, desktop 1366×768; audio panel phone/desktop and Raid dialog 320×400. Screenshots establish layout, not audible loudness. Runtime tests establish looping, mute persistence, native popover behavior, synthetic Chromium touch slider and gameplay. Physical iOS/Android/school PC performance and perceived loudness are not certified. No production database changes or extra SQL.

Publish scope: user explicitly authorized pushing completed changes to GitHub main. Preserve unrelated pre-existing skill/config/AGENTS edits.

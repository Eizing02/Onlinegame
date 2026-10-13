# Wallpaper and shared audio

Login now loops the supplied phone video or PC/tablet video, including its audio track. Join uses the matching original PNG at 50% image opacity. Forms, text, room codes, team selection, Google identity and role routing keep their existing behavior. The Login planet decoration is replaced by the supplied artwork.

`Wallpaper` fixes a touch phone/tablet's artwork class for the document, so landscape, virtual keyboards and a change of pointer do not switch the phone to a wide video. Desktop window widths adapt normally. One video is mounted and fetched; posters remain visible while it loads. A failed clip falls back to the supplied picture and never blocks login.

`AudioProvider` owns one `AppAudioEngine` for the document. Defaults: sound enabled, master 65%, effects 70%, music 22%. Preferences use `kruei:audio:v1` in localStorage, with validated ranges and a storage-unavailable fallback. A user can mute or move any level to zero. Clip audio uses the music bus with a factor of four because the supplied clips have quiet source audio; overall and music sliders still control it. Raid music keeps its existing level and three phase/lobby tracks. Classic music and answer feedback use the same preferences.

There is one background owner. Leaving Login pauses and disconnects the clip before the next page claims music. Released audio routes and feedback timers are cleaned up. Raid borrows the shared context, keeps its bounded SFX cache/voice limits and event deduplication, and never closes another page's context. Visibility pauses playback; visible pages resume subject to browser permissions. Full Google OAuth navigation creates a new document; preferences survive, but continuous sound across Google's page is not promised.

Audio starts automatically when permitted. If audible autoplay is rejected, the video continues muted and the next trusted pointer/key interaction retries sound. This never awaits or intercepts a login/answer action. Websites cannot override a browser's autoplay policy or device volume. See [Chrome autoplay documentation](https://developer.chrome.com/blog/autoplay/).

The speaker opens a native `popover="auto"` with mute and three native sliders. Outside pointer interaction or Escape closes it. Inside controls do not close it. Its placement is clamped to the visual viewport. It is rendered inside protected question/Classic dialogs, so users can reopen it while muted; the underlying Raid header control is omitted while the question is showing. Visual quality settings remain separate.

Assets live in `public/assets/wallpaper`. The originals remain in the parent project's `wallpaper` directory. `node scripts/import-wallpaper.mjs` imports the three PNGs, makes WebP login posters and derives H.264/AAC faststart clips at their original dimensions and 24 FPS. It requires ffmpeg and installed project dependencies. Source origin is recorded in `provenance.json` and Impeccable raster metadata/sidecars. PNG pixel equality and stream metadata are recorded in [media-validation.json](media-validation.json).

No migration, Supabase setting or Google Cloud Console change is needed. This release does not change scoring, deadlines, answer confirmation, combat pacing, RBAC or database rows. Publish the frontend/assets through the existing GitHub main deployment workflow.

Validation and remaining environment limits are recorded in [validation.md](validation.md). UI evidence lives under `.impeccable/review/wallpaper-audio`; the fresh Impeccable finish verdict and design-system comparison are included there.

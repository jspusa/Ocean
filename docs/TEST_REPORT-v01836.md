# v0.18.36 — audio-independent loading

## Scope and diagnosis

The user again reported an indefinite 準備海底聲景 loading screen. The old 1.5-second Promise race was installed after synchronous AudioContext construction, node creation and ambient-buffer setup. It bounded only a returned promise, not the native calls before it. The v0.18.35 CPU boot regression fails the no-pre-entry-audio contract; a native-browser boundary experiment records a controlled 2,200 ms pre-gesture constructor stall while the loading label remains 準備海底聲景. This is evidence of the blocking dependency, not a reproduction or identification of a physical device's native deadlock.

Boot now does no audio initialization. It renders the home independently and reports 呈現海底景色 for its final visual step. Actual start/sound gestures keep the existing audio path and preferences. No geometry, lighting, collision, population, shader or automatic-quality settings changed. Pending realism work remains outside this urgent release.

## Local verification

- Actual production boot CPU boundary: 4/4 (sound on/off, focused/unfocused/hidden), initial expected RED retained.
- Native headless Chrome, desktop plus touch emulation: 10/10 scenarios, 54/54 assertions. Normal start, controlled pre-gesture synchronous stall, constructor failure, pending suspend, pending music download. Every scenario enters and swims through ordinary controls; zero pre-entry audio calls/music requests, no page/WebGL errors.
- Native ordinary audio entry: 32/32 assertions across desktop and touch. Strict autoplay with non-activating CDP observations, trusted entry gestures, two original stems, nonzero analyser output, mute preference/reload, silent entry, lazy sound-on and second-tab save ownership.
- Existing production audio graph: 15/15. Local music races: 11/11. Static build/source/manifest verification: 71/71.
- Source packaging completed with existing compiled geometry; geometry assets are byte-unchanged. The old prewarm lifecycle runner is explicitly historical; current coverage is audio-optional-boot.cjs, audio-optional-boot-browser.cjs and audio-entry-browser.cjs.

Receipts: qa/parity/v01836-audio/{red-clean-observation.json,green-clean-observation.json,cpu-boot.json,audio-entry.json,build.log,static.log}. Initial observer-contaminated runs are retained separately and are not used as acceptance evidence.

## Limits and delivery

Touch is desktop Chrome emulation; no physical-phone, battery, human-listening or universal startup-time claim. A synchronous native audio call can still cost time when the user actually enables sound. The loader itself no longer requests that work. Existing initial-render and background-tab scheduling paths are unchanged.

Public delivery is pending. It requires the Pages build commit and every manifest hash plus ordinary desktop/touch entry to be verified after publication.

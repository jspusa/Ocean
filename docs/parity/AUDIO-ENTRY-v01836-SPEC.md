# v0.18.36 audio-independent entry

User symptom: loading remains at 準備海底聲景 and the player cannot enter.

- Boot must never construct or prepare Web Audio, request music, or start an audio timer before a real sound-enabled start/sound gesture. Stored sound preference does not change this rule.
- Normal home and first rendered frame become ready independently of audio-device availability. The old preload timeout cannot bound synchronous native construction.
- Actual start/sound click or tap still owns resume; preserve preferences, silent entry, in-game sound toggle, original music and existing save ownership.
- Pending suspend or music IO and thrown audio creation must not prevent entering and swimming. Automatic desktop/touch quality is unchanged.
- Existing audio-preparation lifecycle scenarios describe the superseded prewarm design. Validate the new no-prewarm contract and fault boundary, plus real normal audio entry, instead of asserting creation before gestures.
- No new geometry, texture, collision or population changes belong in this urgent release. Physical-device audio deadlock reproduction and phone battery/performance remain unverified.

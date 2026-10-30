# v0.18.45 validation

Baseline: `dbd54ec34adcdad177014d01d3536197ea21fb59` (v0.18.44). This release is an incremental turtle and encounter improvement. It does not complete the broader realism, performance or commercial-quality goal.

## Turtle

| Evidence | Result | Coverage |
|---|---|---|
| Actual source/indexed anatomy | 22/22 checks; preserved baseline produces 7 failures | ★★★★★ CPU geometry, not visual acceptance |
| Near mesh | 14,170 → 12,970 triangles; 529,512 → 477,096 indexed bytes | ★★★★★ exact mesh accounting |
| Far mesh | 1,122 → 1,074 triangles; 43,656 → 42,504 indexed bytes | ★★★★★ exact mesh accounting |
| World render | Desktop and simulated touch: seven views and 120 continuous frames each | ★★★★☆ installed Chrome GPU, not a physical phone |
| Material transport | 48 actual compiled-mesh diagnostic rows, all qualities/LODs; six checks pass | ★★★★★ bounded shader diagnostic |
| Texture ownership | Nine resident textures; existing 1024² RGBA8 slot reused with mipmaps and mirrored wrapping | ★★★★★ resource inspection |
| Download size | One new 649,123-byte JPEG; retained old public texture for cached-page compatibility | ★★★★★ file accounting; no claim of smaller total download |

The single continuous head removes the separate white button-like beak. The head/neck and flippers use the original generated skin described in [TURTLE-SKIN-v01845](TURTLE-SKIN-v01845.md). Root and independent Spec review inspected the world views and updated model-rendered guide portrait. Remaining limitations include conspicuous pale skin seams, a comparatively smooth shell, and visible distant-LOD facets under magnification.

Local receipts: `qa/parity/v01845-turtle/anatomy-current.json`, `native-desktop.json`, `native-touch.json`, `material-diagnostic.json`, `guide.json`, `visual-review.md`, and `spec-fixtures-and-deep-visual-review.md`.

### Bounded GPU material cost

The exact v44 and v45 material-5 programs ran in the same native Chrome context on an Apple M3 Max, with identical current geometry, full world rendering, camera, time, lighting, textures, residency, quality and framebuffer. This isolates the material change; it excludes the geometry savings. The optional imported fish remained idle in both arms, as recorded. Entry UI was usable; its asset only starts after a dive or gallery action and was never a valid boot prerequisite for this stationary test.

After 180 balanced untimed full frames, ABBA uses 30 warm frames and 100 measured frames per block. All 400 samples per profile are retained, with no invalid/disjoint samples or resource changes. Stars describe bounded evidence, not performance rankings.

| Profile on this computer | v44 median GPU frame | v45 median GPU frame | Baseline first/last drift | Coverage |
|---|---|---|---|---|
| Desktop, 2560×1600, quality 2 | 18.408 ms | 18.403 ms | −2.64% | ★★★★☆ controlled material comparison |
| Simulated touch, 585×1266, quality 1 | 8.392 ms | 7.607 ms | −2.55% | ★★★★☆ same desktop GPU, not a phone |

Receipts preserve the failed idle-asset prerequisite attempt, the initial short comparison and the warmed comparison. The initial short touch run had −10.93% baseline drift and a CPU warmup transition, so it was not used as stable performance evidence. The longer run addresses that specific uncertainty. These samples show no observed regression in this controlled view; they do not establish global FPS, phone performance or battery savings. Final receipt: `qa/parity/v01845-turtle/material-cost-warmed.json`.

## Deep encounter variation

The six explicitly listed free-swimming individuals each have three validated home candidates at their original depth. A new dive chooses the arrangement; resume and reload retain it. Authored guide stops, station residents, story representatives and bottom-dwelling organisms remain fixed. This is a bounded first extension beyond reef variation, not universal randomized spawning.

The CPU suite verifies actual mesh/deformation/path envelopes against rocks, floor planes and regional solids, save migration, protected individuals, identity, all candidates and bounded configuration work. It passes 9/9. Desktop and simulated touch each pass 55 UI lifecycle checks, including a new dive and reload.

Both native profiles rendered all six actual compiled actors at their selected homes with unchanged actor poses, default auto quality recorded before inspection, and no GL errors. Root and independent review saw no new rock entrapment in these views. The pelican eels remain very dark; the existing deep animals still have simplified geometry. These captures accept placement and visibility only, not photorealistic animal materials. They use a legal inspection camera and are not a natural journey or performance benchmark.

Local receipts: `qa/parity/v01845-deep-variation/behavior-green.json`, `native-desktop.json`, `native-touch.json`, `visual-desktop.json`, and `visual-touch.json`.

## Guided movement through real contact

The separate [guide contact repair](DEEP-GUIDE-CONTACT-v01845.md) validates finite nearshore detours against actual rocks and the full turning body. Route corners and observation arrivals commit after the existing once-per-frame body owner accepts the movement. A slow blocked approach pauses after 0.5 seconds while preserving its destination; the normal slow-swimming control is unaffected.

Both 120 Hz physics / 60 Hz frames and 120 Hz physics / 30 Hz frames pass all 14 full arrival checks within the original travel and voluntary-stop budgets. The original cold-boat and slow-blocked RED witnesses are retained. The body profile, world rocks and movement speed limits are unchanged.

After the final full build, native desktop and portrait touch simulation pass 104 checks in `qa/parity/v01845-deep-variation/guide-native-final.json`: the first journey continues uninterrupted from the original boat entry, all three destinations and authored stops are reached, manual takeover and continuation work, actual clicks/taps identify the original-sized animals, the viewing centre stays clear, and automatic quality stays enabled. No page or GL errors were recorded. The harness uses production physics at its documented cadence for long travel plus a real RAF interval; this is not a full-length wall-clock playtest.

The final rebuilt archive also passes the actual turtle anatomy 22/22 and deep-encounter 9/9 checks (`anatomy-final.json` and `behavior-final.json`). The final local manifest contains 325 files and every local file matches its declared bytes and SHA-256.

## Regression evidence

The old source-contract fixtures are retained. Narrow normalization permits only the new turtle material branch, slot-5 name and skin-only wrapping. Negative controls reject unrelated lighting, fish, imported-rig, texture-deadline and draw-state changes. Actual collision owners replace missing fixture globals; the resulting real guided-route failure was retained for a runtime fix, not bypassed by widening travel budgets.

The final diver-envelope contract passes 14/14 with its immutable v43 baseline: all 507 non-turtle meshes, 3,725 nodes, contact metadata, diver animation and the eight-volume envelope remain exact. Its only geometry exception is the two existing turtle LODs, each verified against the actual current constructor. Twelve additional mutation controls fail as intended. The original whole-world-identity RED is retained alongside the final GREEN on the same rebuilt archive; see `qa/parity/v01845-turtle/cpu-fixture-repair/DIVER-ENVELOPE-SCOPE-REPAIR.md`.

Texture failure/retry/cleanup and optional-audio-pending entry checks also pass on native desktop and simulated touch. The previously published v0.18.44 audio entry fix passed ten public normal/fault scenarios; this release must retain that nonblocking entry behavior.

No physical-phone, long-duration heat/battery, global FPS or commercial/Wii superiority claim is supported by these checks. Release acceptance additionally requires the final guide regression, source review, matching build manifest, exact Pages commit and public file/entry verification.

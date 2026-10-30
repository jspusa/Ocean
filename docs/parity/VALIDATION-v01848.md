# v0.18.48 — photographed rock surfaces

Baseline: published v0.18.47, `05e830e9f3ab80f9a1a4505c73a38087ff1027a5`. This release replaces only the two runtime rock images with the accepted fixed Rock Boulder Dry preparation. Renderer arithmetic, source geometry, contact catalogue, ecology, animals, audio, save ownership and automatic-quality policy remain unchanged. The broader realism goal remains active; this material slice does not complete it.

## Source and fixed preparation

[Poly Haven Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry), photography Dimitrios Savva and processing Rico Cilliers, is supplied under [CC0](https://polyhaven.com/license). Official source, hashes, license, exact derived bytes and reproducible preparation are shipped in [the asset record](../../assets/rock-surface/LICENSE.md). The original is a dry terrestrial boulder surface, approximately 1.8 m across. It is not verified underwater imagery or limestone. The main game projection remains 2.5 m per repeat; the scale difference is an art adaptation.

One declared 1536-square preparation from the matched 2048-square source pair was made: JPEG 88 diffuse / 90 normal, 4:4:4, same uncropped Lanczos coordinate grid. The normal uses signed floating-point direction resampling and renormalization. No tint, channel flip, source painting or encoding-quality search was used. The retained offline receipt is unchanged after installation. Normal encoding error versus the unquantized normalized resized reference is mean 1.641°, p95 3.530°, p99 4.779°; this excludes resizing loss against the original source and is not a realism score.

Stars in the table indicate the scope of evidence, not a game-quality rating.

| Resource | Published v47 | v48 | Evidence |
| --- | ---: | ---: | --- |
| Compressed two-map payload | 2,215,377 bytes | 1,521,112 bytes | ★★★★★ measured files; −694,265 bytes / −31.34% |
| Desktop upload per map | 2048² | 1536² | ★★★★★ native upload-source records |
| Default touch upload per map | 1024² | 1024² | ★★★★☆ native desktop touch emulation |
| Desktop RGBA8 pair, all mip levels | 44,739,240 bytes | 25,165,808 bytes | ★★★☆☆ dimension accounting only, not measured allocation |

No FPS, battery, full-game memory or physical-phone improvement is inferred from those numbers. The existing v47 optimization and automatic resolution remain in place. The preview keeps extra candidate resources solely for comparison and is not a timing benchmark.

## Actual-world visual evidence

`qa/parity/v01848-rock/visual-initial/report.json` contains desktop and touch-emulation runs, eight fixed full-world views each: home near, oblique, far, blue lamp; hadal wall, cut bottom, slope arrival and slope mud. All 16 views pass their controlled conditions. Each original → candidate → original-restored sequence preserves camera/time/default optics, lamp, shaders, draw work, loaded geometry, collision witness, actors and non-rock textures. All 16 original/restored frames are byte-exact. All 48 PNGs and their SHA-256 are retained. No page, console or GL errors occurred; original pointers and observed native upload methods were restored and added textures deleted.

Only texture slots 2 and 3 switch. The passive pre-boot upload observer forwards native calls unchanged, records actual upload-source dimensions and derives the corresponding mip levels; it is not an allocation query and changes no Renderer method. Desktop defaults q2 / scale1 / 2560×1600; touch defaults q1 / scale1 / 585×1266. Both start with adaptive quality enabled, then freeze it for controlled images. Touch means Chrome emulation on the same computer, not physical-phone acceptance.

Seven views per profile change pixels. `cut-bottom` is unchanged because the replacement rock maps do not visibly contribute there; it is an unchanged witness, not a visual improvement claim. Source response bytes, prepared receipt hashes, and actual decoded dimensions were checked before comparison.

Root and the separate visual reviewer accept this as a limited surface improvement: reef mineral coloration and small-scale relief are more irregular and remain readable under blue lamp light, without the previous candidate's orange/teal cast. Existing silhouettes, flat trench walls, repetitive hadal tiling, straight ledges, geometric fish and simplified corals remain visible. Close hadal images show repeated motifs, especially in portrait framing; no claim of non-repeating terrain or complete trench realism is made. See [independent visual decision](REVIEW-v01848-ROCK-CANDIDATE.md).

## Build, entry and retained scope

`python3 build.py --pack-only` exits 0 with the original source/replay/fingerprint guards. `qa/parity/v01848-release/build-verification.json` verifies all 31 generator inputs and exact unchanged engine, world, app, audio, compiled archive, scene index and growth replay. Archive SHA-256 remains `401f234343c2a405a6cec956812962a5b4b4034cb8c312384dea27f3c257b0c7`. The accepted prepared image bytes are exactly the installed runtime bytes. No runtime JavaScript arithmetic changed; generated configuration differs only in release URLs.

The built local site passes `current-delivery.cjs`: all 330 manifest file hashes, ordinary desktop click and touch tap into the active compiled/streamed underwater world, adaptive quality true, expected 12 programs after the optional Barramundi loads, and zero page/console errors, warnings or network failures. Receipt: `qa/parity/v01848-release/local-delivery.json`. Total run time 8,589 ms includes hashing and both profiles and is not a startup benchmark. The audio-optional CPU boot regression passes 4/4; it verifies that current boot never constructs an audio context before a sound gesture. It does not prove the exact historic native hang or acoustic playback.

The user clarified the stalled page was a long-open original tab. That tab was not present in the currently accessible browser inventory. The earlier visible-UI recovery receipt remains `qa/parity/audio-recovery-20261030/user-tab-recovered.json`; current source still releases entry without sound preparation. An already-running old page must be refreshed to execute the updated code, without clearing website data or saves.

Independent [Standards](REVIEW-v01848-STANDARDS.md) and [Spec](REVIEW-v01848-SPEC.md) reviews retain their scope and limitations. Standards includes disclosed self-review of the preview harness; Spec independently checks that source and the receipts. Native GPU visual testing is root-owned and serialized. No broad unrelated test rerun or historical fixture rewrite is part of this image-only change.

## Public release gate

At commit preparation, local build and entry are complete; publication still requires the exact Pages revision and a separate public run of `current-delivery.cjs` against `https://jspusa.github.io/Ocean/`. Final receipts will be `qa/parity/v01848-release/pages-build-final.json`, `public-delivery-final.json` and `RELEASE.json`. A push alone is not acceptance. The final release receipt must identify the committed revision, verified file count and remaining full-goal work.

The next animal work is recorded in [ANIMAL-NEXT-v01848](ANIMAL-NEXT-v01848.md): turtle anatomical UV/color ownership and continuous silhouette, then deep-fish fin/body differentiation. That investigation is not an animal implementation claim for this release. Physical-phone testing, motion shimmer, larger trench form and complete commercial-quality acceptance remain unverified or unfinished.

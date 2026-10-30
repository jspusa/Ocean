# v0.18.47 — bounded deep-scene rendering optimization

Baseline: published v0.18.46, `d6d8bc0253147623177f224300109cdea721f7c1`. The release source adds one cached fragment specialization for kind10/material0. Vertex motion, fragment arithmetic, species uniforms, shadows, geometry, collision, ecology, textures and automatic quality remain unchanged. If the additional program cannot compile, the existing generic route remains available. No sound or admission dependency was added.

The earlier long-open user tab was recovered by saving through the visible interface and continuing the existing dive on the updated site; the retained receipt is `qa/parity/audio-recovery-20261030/user-tab-recovered.json`. A later inventory no longer listed that tab. This does not identify the historic stalled native operation. The current source does not wait for sound preparation during entry.

## Correctness and independent review

`tests/parity/surface-programs.cjs` passes 11/11 checks, including every abyss species selector, unchanged VS, declaration-restored FS, missing-program and compile-failure fallback, one-time setup and unrelated renderer state. Audio-optional boot passes 4/4 and resize-allocation recovery passes 9/9. Logs are in `qa/parity/v01847-release/`.

The native framebuffer harness uses the actual uploaded high/low meshes of all five abyss species, quality 0/1/2, shallow and genuinely sunless 7000 m fixtures, lamp off/on, plus three actual full-world habitats. Each profile passes all 123 fixtures. All 984 final RGBA comparison arms are byte-identical to their generic references. Fifty linear-scene captures differ by at most one binary16 storage ULP, within the predeclared tolerance; all other linear captures are exact. Alpha, GL errors, nonfinite values, unchanged resources/attributes and shader-creation checks pass. Dark rows require a visible target and the same species/LOD/quality lit partner; they are not standalone visible-color proofs.

Final receipts:

- `qa/parity/v01847-performance/correctness-desktop-sunless.json`
- `qa/parity/v01847-performance/correctness-touch.json`

The initial imported-program readiness failure and the incorrectly placed 1200 m sunless fixture failure are preserved in separately named receipts. The harness now explicitly loads the optional asset for its imported-ready setup and places the sunless fixture at 7000 m. The product was not changed to wait for optional assets, and the numerical acceptance bounds were not relaxed.

The historical `uniform-submission.cjs` check remains 6/7: its immutable v0.18 active-submission hash already disagrees with the exact published v46 engine. An isolated baseline directory contains the three exact `git show d6d8bc0` inputs; candidate and baseline logs are byte-identical, SHA-256 `1fe66f84e1898adb25b5178c2107b931aaec479ce698a21a0829bca867fd6129`. No old fixture was rewritten. This retained pre-existing failure is distinct from the passing current specialization and native framebuffer checks.

Independent reviews: [Standards](REVIEW-v01847-STANDARDS.md), [cost method](REVIEW-v01847-COST-METHOD.md), and [Spec plus independent raw-data aggregation](REVIEW-v01847-SPEC.md). The Standards reviewer authored the tests, disclosed as self-review of test coverage; the separate Spec reviewer independently inspected their source and receipts.

## Fixed-scene GPU measurement

The one predeclared candidate was tested with one A/A control and both ABBA/BAAB orders for each profile, three actual deep habitats per run. Every scene retains 240 warm frames and 400 measured frames: 4,320 warm and 7,200 measured frames total. Queries are asynchronous and bounded to 16; observed peak is 3. No disjoint interval, hidden frame, workload change or invalid sample occurred. All 1,200 candidate quartets have lower B-minus-A GPU time. No competing build, GPU test or image work ran during timing.

The primary statistic is the median of adjacent quartet ratios. It is not the ratio of pooled arm medians. A/A variation is retained without subtraction; its largest absolute median deviation is 2.44%. Absolute costs vary across runs, so only the interleaved comparisons support attribution.

| Profile / actual actor | A/A median change | ABBA candidate change | BAAB candidate change | Evidence |
|---|---:|---:|---:|---|
| Desktop / coelacanth | −0.74% | −76.88% | −78.14% | ★★★★☆ repeated on one GPU |
| Desktop / pelican eel | +0.19% | −61.83% | −56.20% | ★★★★☆ repeated on one GPU |
| Desktop / anglerfish | −2.44% | −55.17% | −54.18% | ★★★★☆ repeated on one GPU |
| Touch emulation / coelacanth | −0.10% | −82.77% | −83.59% | ★★★☆☆ same computer, not phone hardware |
| Touch emulation / pelican eel | +0.30% | −78.82% | −78.17% | ★★★☆☆ same computer, not phone hardware |
| Touch emulation / anglerfish | +0.87% | −71.45% | −70.53% | ★★★☆☆ same computer, not phone hardware |

Installed Chrome used an Apple M3 Max. Desktop quality 2: 2560×1600, 4× MSAA. Touch emulation quality 1: 585×1266, 2× MSAA. Initial automatic quality is verified and then frozen for controlled measurements. Geometry, textures, camera, lamp, actor pose, LOD and draw work stay the same. Optional Barramundi assets deliberately remain idle during timing and their owner state is guarded. Seven cross-session cumulative shadow-update counters differ only in setup history; all are constant throughout their measured intervals, with all precise differences retained in the independent aggregate.

Commands for the exact fixed run plan (run each command sequentially; no other GPU or build workload):

```sh
caffeinate -diu node tests/parity/abyss-specialization-cost-browser.cjs --mode=control --profile=desktop --out=qa/parity/v01847-performance/control-desktop.json
caffeinate -diu node tests/parity/abyss-specialization-cost-browser.cjs --mode=ABBA --profile=desktop --out=qa/parity/v01847-performance/abba-desktop.json
caffeinate -diu node tests/parity/abyss-specialization-cost-browser.cjs --mode=BAAB --profile=desktop --out=qa/parity/v01847-performance/baab-desktop.json
caffeinate -diu node tests/parity/abyss-specialization-cost-browser.cjs --mode=control --profile=touch --out=qa/parity/v01847-performance/control-touch.json
caffeinate -diu node tests/parity/abyss-specialization-cost-browser.cjs --mode=ABBA --profile=touch --out=qa/parity/v01847-performance/abba-touch.json
caffeinate -diu node tests/parity/abyss-specialization-cost-browser.cjs --mode=BAAB --profile=touch --out=qa/parity/v01847-performance/baab-touch.json
```

Use new output paths for any later reproduction; do not overwrite the retained six original runs. Native correctness commands use `abyss-specialization-browser.cjs --profile=desktop` or `--profile=touch` with distinct `--out` paths. All raw results and the independent aggregation are under `qa/parity/v01847-performance/`.

These are warmed fixed-scene GPU durations, not gameplay FPS, battery use, physical-phone performance, lower startup latency or universal stutter elimination. The additional setup program can add compilation/first-use cost; elapsed startup overhead has not been isolated. Generic fallback remains available. Previous inconclusive v46 timing is preserved unchanged.

## Rock candidate rejected

One photographed Rock Face diffuse/normal pair was prepared with verified primary provenance and fixed encoding. All 16 actual desktop/touch original/candidate/restored comparisons passed their conditions, geometry/contact and image-restoration checks. Independent inspection of 14 PNGs nevertheless rejected the result: orange/teal mottling and dark broad reef surfaces, limited hadal relief improvement, and a 37.41% compressed-byte budget increase. This candidate is not shipped. Original production texture hashes are retained; the preview/tool and rejection evidence remain for future work. See [rock review](REVIEW-v01847-ROCK-CANDIDATE.md).

## Build and delivery gates

The full build is required despite unchanged geometry formulas because the source-input provenance includes the engine. Its log is `qa/parity/v01847-release/build.log`. Archive, contact and generated-world identity must be checked after completion, then local normal entry and public delivery verified. A push alone is not release acceptance.

At this document's initial writing those gates remain pending. Final evidence will be appended below. The broader realism, collision coverage, ecological variation, physical-device performance and commercial-readiness goals remain open.

## Completed local release gates

The full phased build exited 0. World/root fitting took 703,658 ms and animal construction 5,479 ms; these are offline build costs, not player load or frame times. Exact source provenance verification passed. The complete compiled archive remains byte-identical to v46, SHA-256 `401f234343c2a405a6cec956812962a5b4b4034cb8c312384dea27f3c257b0c7`; the scene index is also byte-identical. All 509 batches, 3,725 nodes, 458 unique meshes, 185 chunks, contacts and growth replay content are unchanged. Only the replay's source-input fingerprint records the new engine source. The tested engine and both production rock JPEGs retain their pre-build hashes. See `qa/parity/v01847-release/build-verification.json`.

The final built local site passes all 325 manifest file hashes, normal desktop click and touch-emulation tap into the active underwater world, default adaptive quality, exact optional-asset program set, and zero page/console errors. `local-delivery.json` records all 3 checks passing in 8,941 ms total, including hash audit and both profiles. This elapsed total is not a controlled before/after startup benchmark. Separate desktop/touch screenshots are retained and inspected.

Public acceptance still requires the exact committed Pages revision and a separate run of the same delivery check against the public URL. Planned final receipt: `qa/parity/v01847-release/public-delivery-final.json`. These local results do not substitute for it.

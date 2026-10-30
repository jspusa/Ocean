# v0.18.47 Spec review: kind10 fragment specialization

Reviewer: independent `v47_cost_review` agent. Date: 2026-10-30.

Decision: **the kind10/material0 candidate meets its bounded correctness and fixed-scene GPU-cost promotion gates**. No blocking defect was found in the reviewed source or retained final evidence. This is a scoped candidate decision, not approval of the complete v0.18.47 release. Root has rejected the rock asset candidate; it will not ship in this release. Full build/provenance, final Standards review, and public delivery gates remain pending.

The reviewer inspected the specialization diff, native correctness harness, cost harness and method, and all six predeclared timing receipts plus final desktop/touch correctness receipts. Only source reads and lightweight JSON aggregation were performed; no new browser, GPU, test, build, or image-processing work was executed. This review does not independently judge the PNG artwork's realism.

## Evidence integrity and scope

The exact baseline is published v46 commit `d6d8bc0253147623177f224300109cdea721f7c1`, engine SHA-256 `7f6f9657b32efd7a1c336e851b372fd636ecc14d5328763ddf0a63e1b2a119fb`. The tested candidate engine is `bb3d42f47abe4ff1f4de5d9202ce83f729bd463a47a5b8fd1a5115ed394c5c34`. Both final correctness receipts match that current source and the unchanged abyss-geometry source. All timing and final correctness runs agree on these attached shader hashes:

- Original VS: `ae1804acfeedc3f8a0c02d71172e4ef4f5a331ef462b32c3715b11b295baf19b`.
- Original generic FS: `0220ddc74e19ceecbd42f6ee2857a663ae1ae81d212ac7a3516b1b9e31e83674`.
- Specialized FS: `f7a62f67140526a80521b1bbb9e53b1a63564e5524c7a5855dcf9f0e67819b49`.

Source inspection confirms only the two supported fragment selector declarations change; vertex/fragment arithmetic, species uniforms, LOD logic, geometry and shadow programs remain intact. Generic fallback remains available and compilation occurs during setup. The CPU regression source covers all five species selectors and rejected-compiler fallback; this reviewer did not rerun that test.

`qa/parity/v01847-performance/independent-aggregate.json` records the independent recalculation, receipt hashes, shader/geometry agreement, row-level checks, and the explained cross-session counter differences. Raw receipts remain unchanged.

## Native correctness

Each profile completes the declared 120-case cross product: five actual compiled species, high/low uploaded mesh, quality 0/1/2, shallow/actual sunless branch, and lamp off/on. The three additional actual habitats retain the normal full world and LOD bounds. Controlled fixtures copy the uploaded vertex/index bytes and retain the source phenotype; forcing a LOD in an isolated fixture is disclosed and is not normal-distance transition evidence.

The harness changes only the `10:0` route between generic and candidate arms, checks all unrelated programs/textures/actor attributes, compares actual linear scene and final framebuffers, and rejects shader creation/linking after setup. Target-instance non-writing query draws and a separate subject-absent image provide non-vacuous coverage. Dark sunless/lamp-off rows are explicitly visibility-only and require a successful matching lit witness. The corrected 7000 m fixture asserts the production sunless branch; merely naming a 1200 m fixture “sunless” is not accepted.

| Final receipt | Complete fixtures | Final RGBA arm differences | Maximum linear difference | Dark rows paired with lit witness | Bounded evidence |
|---|---:|---:|---:|---:|---|
| `correctness-desktop-sunless.json` | 123 / 123 | 0 across 492 arms | 1 storage ULP; 0.000030517578125 | 18 / 18 | ★★★★★ recorded framebuffer checks |
| `correctness-touch.json` | 123 / 123 | 0 across 492 arms | 1 storage ULP; 0.0000152587890625 | 20 / 20 | ★★★★★ recorded framebuffer checks |

All 984 final RGBA arm images are byte-identical to their generic reference. Linear output differs in 28 desktop arms and 22 touch arms, within the predeclared one-storage-ULP bound; the other 934 arms are exact in both outputs. Alpha, GL-error, nonfinite-output, state, shader-creation/linking and final actor-restoration checks all pass. Both profiles use identical uploaded source mesh hashes. Desktop has 105 meaningful-color rows and touch has 103; the remaining rows are the explicitly paired dark cases.

These are native Chrome checks on an Apple M3 Max. Touch is browser emulation on that computer. They establish the stated framebuffer equivalence for the bounded matrix, not every device, temporal motion state, or visual realism.

## Native GPU-cost decision

All six predeclared runs completed: one control, ABBA and BAAB for each profile. The receipts retain 7,200 measured samples and 4,320 warm frames across 18 scenes. Every scene has exactly 240 warm frames and 400 valid measured frames; there are no disjoint events, invalid rows, queue overflows, hidden frames or failed invariants. Queue peak is at most 3 of the fixed maximum 16. Median measured start intervals are approximately 16.6–16.7 ms.

The independent aggregation recomputes every quartet directly from raw nanoseconds and verifies the reported medians. All 1,200 candidate-comparison quartets have a negative B-minus-A duration. The table uses median quartet ratios for percentages, not a ratio of pooled arm medians. Parenthesized values are median quartet B-minus-A milliseconds. Negative means the candidate costs less in this fixture. Stars rate the strength of this bounded observation, not game quality or cross-device generality.

| Profile / actual actor | A/A median variation | ABBA candidate delta | BAAB candidate delta | Scoped evidence |
|---|---:|---:|---:|---|
| Desktop / coelacanth-002 | −0.74% | −76.88% (−9.042 ms) | −78.14% (−9.442 ms) | ★★★★☆ repeated on one GPU |
| Desktop / pelican_eel-001 | +0.19% | −61.83% (−13.681 ms) | −56.20% (−13.394 ms) | ★★★★☆ repeated on one GPU |
| Desktop / humpback_anglerfish-001 | −2.44% | −55.17% (−4.232 ms) | −54.18% (−3.808 ms) | ★★★★☆ repeated on one GPU |
| Touch emulation / coelacanth-002 | −0.10% | −82.77% (−6.276 ms) | −83.59% (−5.580 ms) | ★★★★☆ repeated on one GPU |
| Touch emulation / pelican_eel-001 | +0.30% | −78.82% (−4.348 ms) | −78.17% (−4.582 ms) | ★★★★☆ repeated on one GPU |
| Touch emulation / humpback_anglerfish-001 | +0.87% | −71.45% (−4.373 ms) | −70.53% (−4.020 ms) | ★★★★☆ repeated on one GPU |

The A/A control is not numerically zero and is retained without subtraction or correction. Its largest absolute median ratio deviation is 2.44%; each candidate effect repeats with the same direction in both orders and is substantially larger. There is no contradictory order or selected favorable scene. Absolute baseline costs vary between runs, so the adjacent quartet estimates remain the basis of the decision; no claim of stable GPU clocks, temperature or power is made.

Each actual camera/actor pose is exact across the three modes of its profile. Draws, submitted triangles/vertices, LOD submission, resolution, quality, MSAA, resources and settled residency remain constant within runs and agree across modes. Desktop is quality 2, scale 1, 2560×1600, 4× MSAA; touch emulation is quality 1, scale 1, 585×1266, 2× MSAA. Initial automatic quality is recorded, then frozen solely for the controlled measurement.

Strict cross-session object comparison initially found seven differences in the cumulative `staticShadowUpdates` counter. Inspection establishes that these are only premeasurement setup-history counts: each counter stays constant throughout its scene's 240 warm and 400 measured frames, while measured shadow draws and the remainder of the workload agree. The original strict observations and their precise differences are retained in the aggregate. No measured row or run was removed.

The timing fixture intentionally keeps the optional Barramundi asset idle and checks its exact status signature. The correctness fixture explicitly loads it before snapshots. These disclosed setups do not share an unresolved background load. The improvement is supported for the existing fixed deep-scene rendering workload; startup cost of the additional setup-time program remains unmeasured.

## Retained failed harness attempts

- `correctness-desktop-initial.json` failed before recording fixtures because the harness expected the optional imported program during still boot, when its owner was correctly idle. The harness now explicitly invokes and awaits the production optional load before that assertion. Production boot was not changed to wait for the asset.
- `correctness-desktop-ready.json` retains 63 completed fixtures and 61 failures: 60 purported sunless cases failed their branch assertion at 1200 m, followed by the incomplete-matrix failure. The production predicate requires at least 4900 m camera depth. The harness was corrected to 7000 m and the complete matrix rerun. Its generic/candidate arithmetic and production engine were unchanged.

These are retained fixture/setup failures, not discarded unfavorable timing runs. They do not satisfy the final correctness gate; the separately named complete receipts do. Historical v46 inconclusive timing remains untouched.

## Follow-up release-check source review

The narrow `tests/parity/current-delivery.cjs` change is correct: immediately after a real start action it permits 11 base programs or 12 when the optional fish has already prepared its program. It then awaits that asset's terminal state, requires successful readiness, and checks the exact 12 program keys including `10:0` and `13:18`. This preserves the optional-load lifecycle while still detecting a missing or incorrect final variant. No public run result is assumed by this source review.

The historical `uniform-submission.cjs` receipt is 6/7. Root retained an isolated published-v46 reproduction rather than changing its immutable v0.18 fixture. The reviewer byte-verified all three isolated inputs against `git show d6d8bc0253147623177f224300109cdea721f7c1:<path>`:

- `src/engine.js`: `7f6f9657b32efd7a1c336e851b372fd636ecc14d5328763ddf0a63e1b2a119fb`.
- `tests/parity/uniform-submission.cjs`: `20ddd527826c16c8ad43e6b193aa2f376255d1c6cd007160710d947be75825e3`.
- `tests/parity/fixtures/uniform-state-v018.json`: `3917b6f2f04bf8ca14d770bdad25ec3c59c126d716918165248c975dfcbf7e5b`.

The latter two inputs remain unchanged in the candidate. `qa/parity/v01847-release/uniform-submission.log` and `uniform-submission-v46-baseline.log` are byte-identical, 1,412 bytes, SHA-256 `1fe66f84e1898adb25b5178c2107b931aaec479ce698a21a0829bca867fd6129`. Both report the same restored-reference hash failure and the same six successful checks. This establishes an inherited failure for this candidate comparison; it is not a full pass and does not repair or waive the old fixture's historical discrepancy. The reviewer did not execute either run.

## Remaining release limits

Promotion of this one specialization is supported. Full scene input provenance and archive/contact identity still need the required build; local receipt version `0.18.46` identifies the tested candidate before release versioning. No rock replacement is approved or included by this review. Final release-source review, ordinary desktop/touch entry with automatic quality, exact published commit and public file verification are still required.

Do not report these measurements as gameplay FPS, physical-phone gains, reduced battery use, lower startup latency, universal stutter removal, or completion of the broader realism/contact/ecology goal. The retained generic route provides the narrow fallback if this optional program cannot compile on another driver.

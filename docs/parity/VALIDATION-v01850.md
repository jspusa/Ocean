# v0.18.50 — original turtle shape and anatomical atlas

Baseline: verified public v0.18.49, `11bec02d5507c01ae9cc7ecf4f7ad0ed7e5f3629`.

Status: all local release gates passed, including final compiled-world visuals, material, rig, contact, controlled cost, catalogue, complete package hashes and ordinary desktop/touch entry with automatic quality. Independent Standards and Spec reviews found no unresolved local release blocker. Publication is verified separately after the release commit; this pre-publication document does not assert that pushing equals deployment.

The original turtle now has a continuous asymmetrical shell outline, swept front flippers, a refined neck and snout, and six anatomical UV charts. A single 1024² original color atlas replaces texture slot 5. The shader uses one explicit-gradient color sample, a footprint-based distant fallback and shallow independent leather grain. Eyes and nostrils retain their original geometry/color. The historical contact-radius floor and v49 all-phase culling inflation remain.

## Build identity and geometry

A complete scene build finished successfully after the final muted atlas and material means were frozen. All 31 generator inputs match its stored before/after identities. Only `world.js` and `engine.js` changed from the baseline generator inputs. Archive SHA-256 is `cc252b5d33d461f74b62d9c9de9ecfed600b984be57e2e8f1f29aab492795370` (25,295,733 bytes). The archived nodes, life, decorLife, shoal, obstacles and rockContact are byte-equivalent JSON values to baseline; only batch geometry changed. Reef growth retains 1,069 actors, content stamp `408df95508343ce2`, identical identities/limits and no failures.

| Budget / identity | Baseline | Current | Acceptance |
| --- | --- | --- | --- |
| High / low triangles | 12,970 / 1,074 | 12,970 / 1,074 | ★★★★★ Unchanged |
| High / low indexed bytes (32-bit archive indices) | 477,096 / 42,504 | 488,088 / 45,912 | ★★★★★ +2.30% / +8.02%, below 12% cap |
| Turtle color download | 649,123 bytes | 434,733 bytes | ★★★★★ Smaller single slot-5 image |
| Resident texture slots | 9 | 9 | ★★★★★ No new production texture slot or pass |
| Contact-radius minimum | 1.719214937115194 | 1.719214937115194 | ★★★★★ Historical clearance retained |

CPU geometry regression began red (14/27), then final current sources pass 27/27. It checks both LODs, actual indexed winding, shared closed shell/head surfaces, UV chart ownership and direction, the ventral head seam, tail-cap area, unchanged eye/nose attributes, RNG use, contact and culling. Final native material diagnostics independently match both actual uploaded LOD vertex/index buffers to current source (indices exact; float attributes within 1e-6).

## Actual built game acceptance

- Material diagnostic: 12/12 checks, 96 rows spanning both LODs, six charts/eyes, fin poses, three quality levels and rigid rotations. Actual slot 5 has CLAMP_TO_EDGE, trilinear mip, maximum level 3 and anisotropy 1. Near body charts depend on the atlas; other charts cannot contaminate the resolved sample; tag-4 eyes ignore the atlas. At an actual UV footprint of at least 8 pixels, color and normal are independent of texture content. Rotation thresholds remain 0.008; cleanup and GL checks pass.
- Actual compiled desktop and touch captures each cover seven anatomical/LOD views plus 261 frames over a complete stroke. No page errors, lost context, blank frame or missing target submission occurred. Adaptation is recorded at default startup then frozen only for controlled cameras; normal entry is checked separately.
- Independent visual review directly inspected all 14 final built screenshots. Continuous rim and attached fin roots, distinct body colors and intact texture placement are accepted for this increment. Close-up face/eye sockets remain simplified; touch grazing angles and rear fins lose detail through the deliberate fade; distant LODs and surrounding coral/rocks remain visibly simplified. This is not photographic realism or whole-game commercial readiness.
- Native rig: 6/6 checks using final source identity. Both LODs retain bounded full-cycle motion and tangent-correct normals. Actual main/shadow culling includes GPU-posed vertices across every frustum plane and rejects fully outside controls.
- Current-source/archive contact bounds: 6/6 checks. Both actual archived LODs match source before acceptance. Continuous phase and arbitrary pitch bounds retain strictly positive signed vertical/radial margins for all six initialized turtles. Actual production routes cover 607 poses per turtle (3,642 total), including large jumps and rewind, with nonnegative floor/surface gaps and unchanged identities/scales. This does not claim every possible horizontal terrain footprint or player encounter route.
- Existing actual-world animal rock contact: 10/10 checks, including first placement, continuous updates, archived moving-vertex envelopes, jumps, rewinds, identity and bounded steady contact work. Optional audio boot CPU regression: 4/4. Audio does not become a startup dependency in this release.
- Current generic and turtle-specialized rendering are pixel-exact in all four retained whole-scene views. This is current shader-path parity, not a baseline-version image comparison. Texture-loading CPU and barramundi renderer contract each pass 10/10, also independently rerun. The latter pins the new turtle branch and narrowly restores known v49 seams; it retains negative controls for fish, lighting, loader deadlines/retry/cleanup and imported animation.

## Controlled material cost

Each profile retains all 400 measured GPU samples in fixed ABBA order, with 180 prewarm frames plus 30 warm frames per block. Baseline v49 material and sampler are compared with the new material and sampler in the same current candidate geometry/world. All samples were valid, invariants/cleanup passed and no samples were removed. Stars mark evidence acceptance, not visual quality or speed.

| Profile on this computer | Baseline median | Current median | Baseline drift | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Desktop | 20.439874 ms | 20.389750 ms | -0.61% | ★★★★★ No meaningful measured cost change |
| Touch emulation | 5.997874 ms | 5.985291 ms | +2.68% | ★★★★★ No meaningful measured cost change |

The tiny differences are smaller than baseline drift; no speedup is claimed. This isolates the material/sampler change with fixed candidate geometry. It is not a whole-version FPS comparison, a battery test or physical-phone performance evidence. Default adaptive quality, fish population, camera, light and production passes are unchanged.

## Provenance and reviews

The original imagegen source, final color edit prompt and reproducible whole-image conversion are retained under `docs/assets/v01850/` and [the source record](TURTLE-ATLAS-v01850-SOURCE.md). Final JPG SHA-256: `a5ab171bbcd879851d90d4b9374af67ee4750baf191978f876506281043f6aa8`. Repeating preparation reproduces the exact JPEG bytes. The generated atlas is artwork, not an external photograph or measured PBR scan.

The first generated layouts/colors and first source-preview diagnostics are retained as historical evidence. A diagnostic-only incomplete FBO binding was corrected before native acceptance; thresholds were unchanged. The initial build was stopped for an art correction, followed by a successful complete final build. Two runner setup failures (missing Playwright location and Linux Chromium path) occurred before GPU execution; final native runs use the installed runtime/Chrome. These do not count as passed product checks. The loader regression then caught an old HTML version label while asset URLs already used v50; the shell label was corrected and the package regenerated. Earlier material/geometry evidence still identifies the same final source/archive bytes; final entry evidence uses the corrected release label.

Standards and Spec reviewers authored none of the production implementation. Their [Standards](REVIEW-v01850-STANDARDS.md) and [Spec](REVIEW-v01850-SPEC.md) final release reviews are recorded separately. Raw evidence is under ignored `qa/parity/v01850-release/` and `qa/parity/v01850-turtle-atlas/`; relevant source regression tools are committed. The shape-candidate harness is a historical pre-integration QA tool requiring its sealed candidate artifacts, not a current clean-checkout smoke test.

## Delivery gates

The final catalogue portrait is captured from the actual production turtle and visually accepted (SHA-256 `da28853d7b6ee5aa8d351280e3f14f91963accb63a414fbae5abb25ca4b98e90`). Final packaging retains the full-build scene archive and verifies all 331 file hashes, with HTML and asset versions both 0.18.50. Native desktop/touch injected HTTP failures pass automatic retry, bounded permanent failure, original-frame preservation, real partial-body cancellation and visible retry followed by normal swimming with automatic quality. Final ordinary entry passes all three delivery checks against `http://127.0.0.1:8765/`: 331/331 hashes and normal desktop click/touch tap with automatic quality, complete compiled/streamed world, optional fish and no page/console/GL errors. This is local evidence despite the shared harness using “Public” check names. Public exact Pages commit/all-manifest checks remain a separate post-commit gate. The broader realism, fauna, environment and interaction goal remains open.

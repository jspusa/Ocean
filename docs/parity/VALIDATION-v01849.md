# v0.18.49 — turtle stroke visibility

Baseline: public v0.18.48, `5a0dfe120d6566fa8dd564a2ae4b77322f9a696c`. The runtime change adds the current turtle's bounded stroke displacement to its frustum sphere before instance scaling. It does not replace geometry, textures, animation, contacts, paths, UI, audio or automatic-quality policy. The broader realism goal remains active.

## Independent bounds

The current kind 2 shader moves soft vertices by at most .07 on local X and .37 on local Y, weighted by a smoothstep in [0,1]. By the triangle inequality, `restRadius + hypot(.07,.37)` covers every phase. Pitch/yaw preserve length; the largest positive instance scale bounds nonuniform scaling. The renderer computes the bound once per batch outside the instance loop, and shares it between main and shadow collection. The bound is conservative, not the exact maximum posed radius.

The separate vertical/contact investigation found no current defect. `qa/parity/v01849-turtle/vertical-audit.cjs` and `vertical-audit.json` record actual archive and source hashes, all vertices of both LODs, an analytic all-phase height bound, and six actual world turtles at 607 poses each. Actual route pitch up to ±.29 has at least .663665 m of clearance inside the existing vertical envelope; even an arbitrary-pitch XY bound retains .0758476 m. Kind 2 ignores the bank input. Consequently this release leaves `individuals.js`, collision bounds and routes unchanged. This proof applies to the existing rig and geometry only; any replacement model requires new bounds.

## Regression and native evidence

The rig regression uses an isolated native WebGL2 fixture with the exact production VS, actual Renderer.batch buffers and Renderer.updateBatch. It covers every indexed vertex of both current source models at 65 fixed times from 0 through `2π/1.45`, including closure. Independent GPU-deformed tangent samples check normals. Analytic all-phase bounds and finite sampling are reported separately.

For each LOD, actual GPU-posed vertices define a plane just inside the moving fin. Four transforms include yaw/pitch, nonuniform scale and shifted render origin. All six plane slots and main/shadow collection must retain that visible fin; planes beyond the complete motion bound must still reject it. The exact baseline engine is retained in the ignored QA folder for the same regression's negative result.

The separate full-world renderer check verifies both compiled/uploaded LOD buffers against their current source models, seven existing anatomical views per profile and 261 rendered frames over one complete stroke. Fixed inspection optics and adaptive-quality freezing are controlled-test conditions, not normal-play or physical-phone acceptance.

Native baseline/candidate results are retained in `qa/parity/v01849-turtle/rig-red.json` and `rig-green.json`. Both use Apple M3 Max through ANGLE Metal, the same shader, 6,697 high-LOD and 617 low-LOD vertices, 65 phase samples and 110 differential points per phase. The interval is .0677067382 seconds; the cycle is 4.3332312463 seconds. Maximum position closure error is 2.3842e-7; maximum normal closure error is 3.9489e-7; minimum independent tangent-normal dot is .9999999184. Native resources clean up without GL errors. These correctness checks ran while the independent CPU scene build was working; no timing result is inferred.

| Visibility condition | Exact v48 renderer | v49 renderer | Evidence |
| --- | ---: | ---: | --- |
| Visible flipper retained | 0 / 96 | 96 / 96 | ★★★★★ actual production buffers, shader and updateBatch |
| Fully outside negative control rejected | 96 / 96 | 96 / 96 | ★★★★★ actual updateBatch |
| Rig contract checks | 5 / 6 | 6 / 6 | ★★★★☆ all vertices, finite phase sampling plus analytic bound |

The baseline fails only the visible-flipper retention check, with a real posed radius of 1.78744184 exceeding the 1.71921494 rest sphere. Static spatial-culling regression remains 5/5. No FPS, energy-use or complete black-flash claim follows from this visibility fix.

## Full build, world and entry

`python3 build.py` completes the full scene build and packing successfully. `qa/parity/v01849-release/build-verification.json` checks all 31 generator inputs against the exact baseline: only `src/engine.js` differs. The actual 25,292,250-byte archive, scene index, world, individuals, app, audio, selection and adaptive-performance modules are byte-exact. All 1,069 growth actors, placement limits and content stamp are unchanged, with zero placement failures; generated provenance correctly records the new engine input. The build guard is intact.

`native-desktop.json` and `native-touch.json` each pass all seven world views and 261 real-pose frames across 4.3332312463 seconds. Both compiled/uploaded LODs have exact indices and source vertex error below 1e-6. They start with automatic quality enabled at q2 desktop / q1 touch, then freeze it only for the controlled inspection. All frames submit the turtle without GL or page errors; no context is lost. Root inspected both oblique images: the existing simplified shell, skin and fins remain visible; this is not a visual-remodel acceptance. Touch remains desktop Chrome emulation.

`animal-rock-contact.cjs` passes 10/10 against the actual rebuilt archive, including 773,700 vertex/phase envelope samples and continuity, discontinuity and encounter re-entry cases. The independent analytic turtle proof covers phases between those finite samples. The audio-optional boot check passes 4/4; it verifies that sound initialization is absent from the entry dependency chain, not the exact cause of the user's historic long-open-tab hang.

`qa/parity/v01849-release/local-delivery.json` passes 3/3: every one of 330 manifest file hashes and ordinary desktop click/touch tap into the playable compiled/streamed game. Automatic quality remains true; optional fish assets load, with expected 12 programs and no shader compile failures, page/console errors, warnings or failed network requests. This is local acceptance; public acceptance remains a separate post-push gate.

## Full model work remains open

The official C.J..Goldman green turtle candidate is CC BY 4.0 with a download option, but the official browser flow currently requires login. No model archive has been acquired or shipped. The current release retains the original simplified turtle. Source research, the original-shape alternative and future UV/rig acceptance notes are preparatory work; none constitutes visual acceptance of a replacement model.

## Publication gate

Independent Standards and Spec review must distinguish the implementation from pending runtime evidence. Final publication requires successful build, local ordinary desktop click/touch tap with default automatic quality, exact GitHub Pages revision and a separate public `current-delivery.cjs` run verifying every manifest entry. Final receipts belong in `qa/parity/v01849-release/`; a push alone is not deployment acceptance. Original long-open game tabs need refresh to run new code, with website data and saves preserved.

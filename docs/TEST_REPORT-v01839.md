# v0.18.39 — reef anatomy and shallow-rock response

Status: native validation and independent review in progress; not published. The broad realism goal remains active. Baseline public release is `c10b3e197622dedaa6f0daa669e97efc7b8b22c0` / v0.18.38.

## Actual baseline and corrected evidence

The independent anatomy audit viewed actual Banggai, longnose and Fire goby final-world PNGs. Main bodies/peduncles/mouths remain overlapping ellipsoids; eyes protrude as pale balls and fins have hard planar edges. A new production-mesh witness confirms disconnected main-skin components and longnose winding inconsistencies, rather than testing a copy of a proposed new profile.

The original v0.18.38 visual runner could select an ecologically absent first actor and only required some fish in the batch to draw. The actual Anthias side capture therefore did not frame the intended fish. The corrected runner chooses an ecologically present actor, matches that actor's encoded position/phase in the real submitted instance prefix, asserts the expected LOD, and frames its complete collision envelope. Actual HTTP-loaded source hashes are recorded instead of treating a local source file as proof of the remote program. Twenty fresh desktop baseline views were captured from an immutable archive of the released commit under `qa/parity/v01839-realism/baseline-site/`; root inspected the corrected Anthias side image.

The previous material diagnostic required the candidate mesh to still contain a baked polygon-colour discontinuity. That requirement would incorrectly preserve a defect in the new continuous body. The revised diagnostic anchors a deliberate incoming-colour intervention at actual candidate compiled vertices. Its second colour is labelled test input, not claimed to be another candidate polygon. The historical seam receipts remain intact. Against the actual pre-fix v0.18.37 engine, the revised test gets a valid 2/12 RED: all eight current-surface colour interventions and both legacy fin roots fail, while mapping, native compilation, coverage and GL prerequisites pass. The diagnostic vertex stage still differs from the production VS and is not beauty/lighting acceptance.

## Mesh RED

`reef-anatomy.cjs --reef-ref=c10b3e1 --compiled --max-bytes=1135440` produced 33/43 passing checks and ten valid failures. All eight generated meshes match the published archive vertex/index arrays exactly; archive SHA-256 is `20e4bf757ce712bf35d41324ddfb7e24ae969f74581e2739dfa13d598503954e`. Finite/unit normals, noncollapsed triangles, complete length normalization and existing resource bounds pass. All body components are individually closed; disconnectedness is the intended RED, not a broken topology harness.

| Species | High / low main-skin components | Additional evidence |
|---|---|---|
| Anthias | 3 / 3 | ★ Separate trunk, peduncle and mouth |
| Banggai | 13 / 3 | ★ Additional high-detail pigment spheres |
| Longnose | 4 / 4 | ★ 18 / 10 inconsistent edge orientations |
| Fire goby | 3 / 3 | ★ Separate trunk, peduncle and mouth |

Stars describe observations, not a quality score. The eight models total 1,135,440 indexed bytes: 876,624 vertex bytes and 258,816 index bytes; 17,120 high- and 4,448 low-detail triangles. New geometry is budgeted against that measured total. Fin attachment and native motion/contact remain separate acceptance checks.

## Implemented geometry and regression evidence

The eight generated/compiled new meshes pass all 67 final compiled checks, including byte-exact generated-to-archive agreement, single closed oriented body skins, closed oriented fin components, finite unit normals, full authored length, fin attachment and eight translated-fin negative controls. Attachment uses actual triangle intersections/distances, a 0.002 normalized-length tolerance, and contact paths through already anchored fins; it is not a copied analytic profile. The original extended attachment baseline retains the same ten body failures (49/59). Adding fin topology assertions produces a final original-source/original-archive RED of 49/67: ten body failures and eight existing fin winding failures. The final current compiled GREEN is 67/67 (`reef-anatomy-final-{red,green}.json`).

| Measured resource | Published baseline | Candidate | Evidence |
|---|---:|---:|---|
| Eight indexed fish meshes | 1,135,440 bytes | 1,039,968 bytes | ★ 8.41% less geometry data |
| Total fish triangles | 21,568 | 20,880 | ★ No extra shared batches |
| High-detail triangles | 17,120 | 15,952 | ★ Measured compiled indices |
| Low-detail triangles | 4,448 | 4,928 | ★ Measured compiled indices |

The aggregate budget passes; low-detail triangles rise by 480. Neither every LOD nor every frame is claimed to be cheaper.

The full scene was rebuilt: 505 batches, 457 unique meshes, 3,725 instances and 184 chunks. The reef regression preserves all 64 actor identities, genes, routes and prior-animal behavior; its 180-second dense path check passes. All ten actual animal/rock-contact checks and six habitat-attachment checks pass. Static validation confirms finite indexed geometry, asset paths, versions and every manifest entry. The final material intervention passes 13/13, retaining unchanged ray/dolphin/oarfish material samples; surface-program lifecycle checks pass 9/9.

An independent binary audit verifies exactly eight fish batches changed; all other 497 batch geometries are byte-identical. Both releases' 184 chunk hashes and all 505 streamed batches match their actual archive. Rock contacts, obstacles, non-reef actors, identities, genes, route inputs and 53 other asset/music files are identical. Changed fish bounds necessarily change 64 derived model centers and 17 phase-zero poses (maximum position difference 0.00051431 m); both releases' results replay exactly through their actual production pose/center functions with zero error. These derived values are not falsely described as byte-identical. Actual transformed-contact validation covers 783,348 fish/shoal/turtle vertex-phase samples. Receipts: `compiled-resource-audit.json`, `resource-derived-node-replay.json`, and retained raw `resource-node-differences.json`.

The reduced indexed geometry is a resident mesh-data saving, not a download saving. The complete compressed archive grows by 52,748 bytes and streamed geometry by 54,325 bytes because the new vertex data compress differently.

Forty current compiled-world images cover all four fish, both desktop and touch profiles, and side/front/oblique/far/lamp views. Every image asserts the selected actor is actually submitted in the intended LOD and its full envelope fits the frame. Root inspected representative views of all four fish: the separate peduncle/mouth balls are removed and head details are seated. Fin transparency still has visible screen-door stippling, and the artwork remains stylized; this is not photoreal acceptance. Independent reviewer `audio_current_audit` inspected all 60 baseline/current images plus six enlarged details and found no blocking regression for this bounded slice; exact paths and limitations are in `fish-art-review.md`.

Receipts: `reef-anatomy-compiled-green.json`, `reef-fish.log`, `animal-rock-contact.log`, `habitat-attachment.log`, `static.log`, `material-release.json`, `surface-programs.log`, `reef-current-{desktop,touch}.json` under `qa/parity/v01839-realism/`.

## Shallow-rock surface correction

The shallow-rock change is restricted to material 2 and retains all geometry/contact data. Both normal-map layers use one projection-weight set from the geometric normal, accumulate surface gradients, then normalize once. The original map already contains crust; the redundant procedural green layer is removed, retaining bare limestone, local green/rose crust and upward deposits. The sample count remains six colour plus six normal fetches; no new asset, AO pass, shader program or runtime allocation is added. [Mikkelsen 2020, section 4.4](https://jcgt.org/published/0009/03/04/) is the gradient-combination reference.

The native rock harness identifies one actual compiled home rock by exact pose/contact and validates its submitted LOD. It swaps only the actual specialized material-2 fragment program while retaining the attached production vertex shader, all other programs, textures, actors, resolution and residency. Four timed scenes use same-context ABBA blocks, each with ten warm frames and 25 measured samples. All 400 samples are valid; none were trimmed, invalidated or missing. Timing finishes before screenshot readback in each profile. Eight before/current view pairs cover near/oblique/far/blue-lamp on desktop and touch. Root reviewed near/oblique pairs and far/lamp images: the surface has less uniform green, while the large block-shaped rock silhouettes remain unchanged. The near scene includes a foreground sea fan; the unobstructed oblique scene supplies the clearer rock-surface view.

| Full-frame GPU measurement | Baseline median ms | Current median ms | Difference | Baseline drift | Evidence |
|---|---:|---:|---:|---:|---|
| Desktop near | 42.781 | 42.200 | −1.36% | −5.67% | ★ 100 valid samples |
| Desktop oblique | 20.819 | 21.406 | +2.82% | −1.49% | ★ 100 valid samples |
| Touch near | 7.522 | 7.278 | −3.24% | −5.75% | ★ 100 valid samples |
| Touch oblique | 5.754 | 5.773 | +0.33% | −6.68% | ★ 100 valid samples |

Stars mark retained evidence, not performance scores. These timings show bounded cost with small mixed changes; they do not prove an overall speedup. Drift is material, and the measurements are complete controlled world submissions, not isolated fragment cost, FPS, battery use or phone hardware. Receipt: `rock-material.json` with all samples and image paths. Hardware: native Chrome/ANGLE Metal on Apple M3 Max.

## Audio complaint recheck

The public v0.18.38 site was rechecked during this work. Its served boot source has no audio preparation or music request before entry, and no longer contains the historical 準備海底聲景 loader label. A fresh strict-autoplay normal-UI desktop/touch run passed 32/32 assertions with zero errors (`public-audio-recheck.json`). An old open page or old HTML is a plausible explanation for seeing the removed wording, not a verified diagnosis of the user's device. The already fixed audio runtime is unchanged in this release.

## Normal gameplay

Both native headless Chrome desktop and touch profiles pass 11/11 normal-input checks: fresh entry, 30 seconds forward, 30 seconds backward and normal menu return. The clock, original movement/simulation, streaming, saved state and automatic quality are untouched. Neither run has page/console errors, a WebGL error or context loss. The desktop swimming legs submit 1,787 and 1,788 complete frames; touch submits 1,807 each. These are JavaScript submissions, not measured display FPS. The outbound/return callback-interval p95 is at most 16.8 ms in both profiles; the desktop maximum is 50 ms. Entry/menu boundaries and every raw sample remain in the reports. These short routes do not establish a universal frame-rate or battery improvement, and touch still uses the computer's GPU.

Receipts: `natural-desktop.json` and `natural-touch.json`. An initial command lacked the local Playwright path and failed before opening a browser; its launch-error receipt is retained separately and not counted as a gameplay test. No renderer changes were needed after the controlled evidence or review pin.

## Limits and outstanding gates

Independent [Standards and Spec review](parity/REVIEW-v01839.md) found no implementation blocker; one optional test-helper duplication cleanup is deferred. Public delivery remains a separate pending gate. Physical-phone performance, battery use, commercial readiness and photorealism are not established. The larger rock silhouettes and other visibly simplistic animals remain part of the unchanged goal.

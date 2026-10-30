# v0.18.47 Rock Face candidate — rejected for publication

The direct replacement of the two production rock textures with the prepared Poly Haven Rock Face pair is **rejected for this release**. Actual game views show a large orange/brown and dark teal color shift across the reef, reduced readability of broad rock forms, and only a modest benefit on the hadal wall. The prepared pair also exceeds the current compressed-file budget by **37.41%**. Retain the existing production rock assets and material shader. This review does not complete the rock-realism goal.

The v0.18.47 release decision is separate: the parent may ship its independently validated kind-10 rendering optimization. No rock visual improvement or rock-rendering speed improvement should be attributed to that release on the basis of this candidate.

## Evidence and review scope

The inspection used the actual PNGs in `qa/parity/v01847-rock/visual-initial/`, not texture thumbnails, isolated preview spheres, generated mockups, or a changed environment. The report is `qa/parity/v01847-rock/visual-initial/report.json`. Its page version is **0.18.46**: these are pre-publication candidate previews associated with the v0.18.47 evaluation, not evidence that a v0.18.47 rock change was published.

Fourteen PNGs were personally inspected: the `original` and `candidate` arms for desktop `home-near`, `home-oblique`, `home-blue-lamp`, `hadal-wall`, and `cut-bottom`; plus touch `home-near` and `hadal-wall`. The remaining far/slope and touch oblique/lamp/cut-bottom views were not visually inspected in this review. Their structural results were read from the report. No new browser or GPU run was performed for this document.

The report covers eight scenes in each profile. All sixteen scenes passed controlled invariants, recorded a nonempty actual target submission, and restored the original framebuffer byte-exactly after the candidate arm. Both profiles finished with no recorded errors, original texture pointers restored, added textures deleted, and GL error zero. These results establish a controlled comparison; they do not establish aesthetic acceptance.

| Controlled profile | Settings and capture | Evidence rating |
| --- | --- | --- |
| Desktop | Quality 2; 2048-square rock maps; 2560 × 1600 capture | ★★★★★ controlled source/state evidence; visual acceptance separate |
| Touch emulation | Quality 1; runtime downscale to 1024-square maps; 585 × 1266 capture | ★★★★★ controlled source/state evidence; not physical-phone testing |

Both use time 6, default 69° FOV, exposure 1.11 and clarity 0.88. The lamp/lighting setting is fixed within each pair. The production world, shader programs, geometry, physical dimensions, contact data and actors remain installed. The experiment changes only rock texture slots 2 and 3. Normal portrait framing is retained; the home-near sea fan substantially occludes the central rock, so the desktop oblique view is a stronger view of broad reef surfaces.

## Visual decision

Stars are qualitative ratings for the stated visual property in these specific captures. They are not a measured realism score, a rating of the source artist, or a comparison against Wii footage.

| Property / inspected views | Existing production pair | Prepared Rock Face pair | Finding |
| --- | --- | --- | --- |
| Coherence with the current pale reef environment — desktop near and oblique | ★★★☆☆ Pale, muted green-gray stone remains consistent with sand and coral surroundings, although still procedural | ★☆☆☆☆ Rust-orange and dark teal mottling dominates foreground and background rocks | Clear regression for the current environment |
| Readability of broad rock forms — desktop oblique | ★★★☆☆ Lighter top surfaces and face transitions remain legible | ★★☆☆☆ Large faces become substantially darker; the same rounded forms remain | Added texture detail does not offset reduced form readability |
| Lamp-lit reef presentation — desktop blue-lamp | ★★★☆☆ Pale stone responds coherently within the illuminated area | ★★☆☆☆ The illuminated region makes the orange/teal patchwork conspicuous; adjacent surfaces remain very dark | The color problem remains with the lamp on |
| Fine irregular surface variation — desktop near and hadal wall | ★★☆☆☆ Soft, repetitive-looking fine structure | ★★★☆☆ More irregular cracks and pigment variation are visible | A real local gain, insufficient for overall adoption |
| Large-scale hadal wall depth — desktop and touch hadal wall | ★★☆☆☆ Broad smooth wall, horizontal ledge and floor remain plainly visible | ★★☆☆☆ The wall has richer pigment, but still reads as a broad smooth face with the same uniform ledge | No substantial improvement in geological depth or pressure impression |
| Portrait reef coherence — touch near | ★★★☆☆ Pale rock remains visible behind the sea fan and at the lower edge | ★☆☆☆☆ Lower rock turns strongly orange/teal; background rock becomes much darker | The same regression survives the runtime downscale |
| Overall suitability as an immediate production replacement | ★★★☆☆ Retain as the current baseline; realism work remains open | ★☆☆☆☆ Reject this direct replacement | Local texture richness is outweighed by environment mismatch and budget failure |

The desktop cut-bottom pair appears identical. The report confirms identical raw framebuffer hashes for original versus candidate in this scene on both profiles. This view is dominated by the lit sediment surface and supplies **no evidence of a rock-texture improvement**. Do not interpret a passed target-submission check as proof that the replaced rock maps visibly contributed to every view.

This inspection does not identify a new detached mesh, changed silhouette, changed collision surface, or misplaced object attributable to the candidate. It also does not establish seam-free motion, absence of flicker during swimming, or long-duration performance: the reviewed evidence consists of frozen captures.

## File-size failure and asset identity

Preparation used one fixed encoding: diffuse JPEG quality 88 and normal quality 90, both 4:4:4, 2048 × 2048, with no resize, semantic color edit, normal channel flip, or alignment change. No additional compression search or alternative variant was created for this review.

| Pair | Compressed bytes | Relative to production | Budget rating |
| --- | ---: | ---: | --- |
| Existing production pair | 2,215,377 | Baseline | ★★★★★ meets the declared baseline budget |
| Prepared candidate pair | 3,044,243 | +828,866 bytes / +37.41% | ★☆☆☆☆ fails the declared budget |
| Original downloaded pair | 7,129,647 | Archival source, not proposed for shipping | ★☆☆☆☆ unsuitable shipping size |

The candidate is 57.30% smaller than the original downloads. That reduction does not make it smaller than the production assets. Two unchanged 2048-square RGBA8 textures also retain the same nominal decoded storage: 33,554,432 base-level bytes, or 44,739,240 bytes including full mip chains. JPEG file-size savings are not GPU-memory or frame-time savings.

The preparation receipt records all original/candidate SHA-256 and MD5 values, source API responses, encoder versions, dimensions and every-pixel normal angular error. Candidate identity for this decision:

- Diffuse: `0acd0ac5fb1027aec7add60875608198bc66e47e97e99fbb65fcc8b035bf2bd8`, 1,019,941 bytes.
- OpenGL normal: `8cf6e2d998028d6c62b61cd95fab8ef26eab6b5a5d9c5fca53ce57c9b07b335f`, 2,024,302 bytes.
- Receipt: `qa/parity/v01847-rock/prepared/receipt.json`.

Mean normal-angle encoding error is 1.848°, p95 3.920° and p99 5.334°, relative to the decoded source JPEG. Those values characterize an additional lossy encoding step; they do not establish scan accuracy or in-game realism. This preview has no performance measurement and must not be used to claim a speed or battery benefit.

## Interpretation and next recommendation — not implemented

The photographed [Rock Face source](https://polyhaven.com/a/rock_face) is a reddish-brown weathered surface, approximately 2.38 m across. Its source quality and physical scale do not guarantee suitability for this pale reef environment. The existing `uMat2` shader was authored for another map: it interprets red/green pigment as crust, remaps other pigment toward limestone, and samples the complete map again at 3.17 times scale as micro detail. The observed patchwork is consistent with that combined source/shader mismatch. This is a source-code interpretation, not an isolated causal experiment on the hue classifier.

A future rock-material slice should define the intended pale carbonate/reef appearance first, then evaluate a matching registered color/normal surface in the real oblique and lamp-lit views. Material pigment and biological cover should have deliberate ownership instead of inferring all cover from arbitrary scan hue. Broad geological depth requires separate attention to visible wall form and layering; texture replacement alone does not demonstrate it. Preserve the existing world/contact contract and automatic-quality behavior while reviewing any future candidate.

This is a future recommendation only. No further source search, compression trial, shader adjustment, geometry change or asset promotion is included here. The current candidate and rejection evidence remain available for audit. Rock realism, animal material quality and the user's broader fidelity objective remain open.

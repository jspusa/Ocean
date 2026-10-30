# v0.18.47 surface realism and equal-quality rendering candidate

Baseline: published v0.18.46, d6d8bc0253147623177f224300109cdea721f7c1. This is an unfinished candidate, not a release claim. Keep the full user realism/contact/ecology/performance goal active.

## Intended visible and performance change

Use a registered photographed rock diffuse/OpenGL-normal pair in place of the two existing procedural rock maps, retaining their dimensions, texture slots, mipmaps, geometry and contacts. Evaluate the actual reef-rock, sloping-sand and trench-wall consumers before acceptance. Preserve the scanned surface's source scale near the existing 2.5 m repeat, its color registration and normal orientation. Source is Poly Haven Rock Face (photography Greg Zaal, processing Dario Barresi), listed CC0 and approximately 2.4 m wide. The game ships local derived files, without a runtime external service. No reference preview or unlicensed creature photo enters the assets. Retain exact source URLs, source/derived hashes and deterministic encoding recipe. Compression is an asset-ingestion step, not proof of visual quality.

Separately test one rendering hypothesis: fragment-only specialization for kind10/material0 allows the driver to eliminate unused material/rig branches. Keep the exact v46 VS and all FS arithmetic; only uKind/uMat declarations become constants in this additional program. Preserve generic fallback, shadow programs, species/tag uniforms, geometry, texture inventory, visibility, LOD, frame cadence and default adaptive quality. Compile once at setup, never in render. Do not promote the variant merely because source code is smaller.

## Fixed optimization budget and gates

One candidate specialization, one A/A control and two predeclared comparisons (ABBA then BAAB), native desktop and touch emulation, three existing deep habitats. Each scene uses 240 warm frames then 400 measured frames at the same RAF cadence; pending queries are bounded to 16. Preserve all samples. Disjoint, queue overflow, missing target or changed workload invalidates the run. Pair adjacent four-frame groups; do not pool temporally distant baseline blocks. A control bias or contradictory comparisons makes performance attribution inconclusive. No image work, build or competing test during GPU measurement. No phone/FPS/power claim.

Correctness is separate: exact declaration-restoration source equality; compile-failure fallback; all five abyss species27–31, both LODs, all quality tiers and relevant shallow/sunless/lamp paths in native image comparisons. All-black/empty fixtures cannot satisfy visible coverage. Preserve all non-target renderer state. Existing world archive/contacts must remain byte-identical if no generator geometry changes. Full scene input provenance is still required before release.

Rock acceptance requires bounded native original/candidate views at unchanged camera, light, exposure and quality. Inspect cracks, registered relief, repetition, dark surfaces and moving distance transitions; do not use a material sphere alone as acceptance. Asset replacement must not increase GPU dimensions or samplers/passes. If the existing limestone pigment interpretation visibly distorts the scan, document and separately validate a narrow material change rather than silently calling a file swap realistic.

## Publication gate

Two independent source/spec reviews, targeted regression checks, full verified build/pack, exact Pages commit and public file hashes, normal desktop click/touch entry and preserved adaptive quality/save behavior. Keep previous failures and inconclusive timing. Never equate this slice with photo-realism, commercial readiness, complete collision coverage or completion of the broader goal.

Primary sources: https://polyhaven.com/a/rock_face and https://polyhaven.com/license (read 2026-10-30). Source scale and geology are material references, not a survey of the fictional game site.

## Evaluated scope decision, before release

The one Rock Face asset candidate is not promoted: its fixed encoding is 37.41% above the existing pair's download budget, and actual near/oblique reef views show dark orange/teal mottling under the legacy pigment interpretation. All 16 desktop/touch scene comparisons and restored-image proofs are retained under `qa/parity/v01847-rock/visual-initial/`. Passing those invariants does not make the visual change acceptable. Production texture bytes remain unchanged; rock realism remains open work. No extra compression search or silent shader-formula adjustment was made.

The release candidate is narrowed to the independently validated kind10 fragment specialization. The two native correctness profiles each pass 123 fixtures. All six predeclared timing runs passed their query/data checks; promotion requires the independent Spec review and the remaining full-build and public-entry gates. This is a performance slice, not completion of the user's realism goal.

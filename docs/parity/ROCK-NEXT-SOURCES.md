# Next rock-material sources — research shortlist only

Reviewed 2026-10-30. **No asset below is accepted for production.** This is a limited, read-only primary-source shortlist for work after the rejected v0.18.47 Rock Face experiment. No texture files were downloaded, decoded, re-encoded or installed; no shader or production file was changed, and no browser/GPU preview was run for this research.

Two candidates are retained rather than filling a third slot with a warmer, darker or poorly scaled surface. The ranking concerns compatibility suggested by official descriptions and metadata, not measured visual quality. Neither official asset page establishes limestone mineralogy or an underwater capture. “Compatible with the current pale limestone appearance” is a visual hypothesis for later testing, not a geological identification.

## Shortlist

| Candidate | Official surface / physical coverage | Same-asset maps and license | Main caveat | Research priority |
| --- | --- | --- | --- | --- |
| [Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry) | Natural weathered boulder, pale sandy-gray, chipped/pitted with irregular cracks; approximately **1.8 × 1.8 m** | Diffuse and `nor_gl` available together at 2K; **CC0**. Photography: Dimitrios Savva; processing: Rico Cilliers | Dry terrestrial appearance; large cracks may not suit every reef face. Its lighter palette still needs verification under the current water, crust and lamp shader | ★★★★☆ first candidate to preview |
| [Rock 01](https://polyhaven.com/a/rock_01) | Natural weathered gray rock with restrained grain/erosion detail; **1.5 × 1.5 m** | Diffuse and `nor_gl` available together at 2K; **CC0**. Author: Rob Tuytel | Official description includes sparse rusty marks. Smoother structure may add little depth; capture method was not independently established in this research | ★★★☆☆ secondary candidate |

Poly Haven identifies both assets as natural outdoor object surfaces rather than masonry or paving. The selected pages do not describe added foliage, grout or artificial joints. This is catalogue evidence; it is not a pixel inspection proving their complete absence. The maps are a matched material set supplied by the publisher. Actual pixel alignment, edge tiling and decoded normal orientation have not been independently verified here. [Rock Boulder Dry metadata](https://api.polyhaven.com/info/rock_boulder_dry), [Rock 01 metadata](https://api.polyhaven.com/info/rock_01).

Poly Haven publishes these assets under CC0 and permits commercial reuse and redistribution. Keep source/author provenance even though attribution is not required. This applies to the assets; do not assume all website preview renders or editorial content share the asset license. [Official license](https://polyhaven.com/license).

## Verified metadata for a later ingestion step

The official asset-information and file APIs were read without saving or fetching texture payloads. Both roles below are explicitly present under the same asset’s `2k` JPG entries. These MD5 values are **publisher metadata only**; no local asset hash was computed because the assets were not downloaded.

| Candidate / role | Official source bytes | Publisher MD5 | Official metadata |
| --- | ---: | --- | --- |
| Rock Boulder Dry / Diffuse | 3,437,626 | `fbc9cf377db427f54381f463c0639e1f` | [File API](https://api.polyhaven.com/files/rock_boulder_dry) |
| Rock Boulder Dry / OpenGL normal | 3,307,320 | `513ef3fdaadd106c38a9c40919918cc0` | [File API](https://api.polyhaven.com/files/rock_boulder_dry) |
| Rock 01 / Diffuse | 3,020,379 | `fd84a894b55e56b17bdfdeec99277f92` | [File API](https://api.polyhaven.com/files/rock_01) |
| Rock 01 / OpenGL normal | 2,989,093 | `1b75b6018dcaa4a6335b9a9b70352651` | [File API](https://api.polyhaven.com/files/rock_01) |

Official 2K source URLs, recorded for provenance rather than fetched:

- Rock Boulder Dry: [Diffuse](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/rock_boulder_dry/rock_boulder_dry_diff_2k.jpg), [OpenGL normal](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/rock_boulder_dry/rock_boulder_dry_nor_gl_2k.jpg).
- Rock 01: [Diffuse](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/rock_01/rock_01_diff_2k.jpg), [OpenGL normal](https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/rock_01/rock_01_nor_gl_2k.jpg).

| Pair | Original source JPG bytes | Shipping-budget assessment |
| --- | ---: | --- |
| Current production rock pair | 2,215,377 | ★★★★★ existing budget reference |
| Rock Boulder Dry source pair | 6,744,946 | ★☆☆☆☆ not a shipping candidate at source size; prepared size unknown |
| Rock 01 source pair | 6,009,472 | ★☆☆☆☆ not a shipping candidate at source size; prepared size unknown |

No compressed-size success, normal-angle fidelity, GPU-memory reduction or rendering-speed benefit is established. A future candidate must earn visual acceptance and meet the declared byte budget independently; source-map availability is not acceptance.

## Scale and next evaluation boundary

The existing main rock projection `vWorld * .40` repeats at 2.5 m. Keeping that projection would display the 1.8 m source approximately 1.39 times its captured size, or the 1.5 m source approximately 1.67 times its captured size. Their native repeat frequencies would be approximately `.556` and `.667` per metre respectively. These are scale calculations only; no projection change was made. The sandy slope and trench material consumers use their own projection rules and would need separate review.

For a later iteration, start with Rock Boulder Dry because its officially described pale sandy-gray palette is more compatible with the intended environment. Evaluate the paired maps at the actual near/oblique reef and lamp-lit views before widening the scope. Keep time, exposure, FOV, geometry, physical sizes, collision and automatic-quality behavior fixed. The legacy pigment-to-crust classification still requires careful review: a neutral-looking source can nevertheless become inappropriate colored cover after that shader logic.

Do not use a global exposure increase to hide a material mismatch, and do not infer improved wall depth from richer color patterns alone. The rejected candidate showed why those are separate problems. No alternative is promoted by this document. Rock realism and the broader animal/environment fidelity objective remain open after the v0.18.47 performance work.

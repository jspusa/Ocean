# 0.18.42 — rounded clownfish tail

This release corrects the clownfish caudal silhouette. The broader realism goal remains unfinished; the new coral scan prototypes are not part of this release. Public acceptance is a separate check against the exact reviewed commit, not inferred from the local results below.

The actual v41 clownfish tail has a straight outer edge and sharp shoulder corners. The new authored caudal arc retains the original root and sample budget. A first candidate exposed near-tangent endpoint normals and was rejected. Candidate B corrects that parametrization; CPU geometry checks pass 50/50, while the baseline preserves four actual silhouette failures.

The complete-world single-actor previews use unchanged baseline cameras, actor poses, neighbors, shader programs and lighting. Actual GPU vertex/index buffers match independently generated source meshes. Seven desktop and five touch-emulation views include side, rear, far and opposing stroke phases; separate views cover either side of the LOD boundary. Independent image review accepts the visible rounded silhouette and continuous root, with explicit remaining limitations: thick dark rims, uniform fin pigment and simplified body anatomy.

Receipts are retained under `qa/parity/v01842-assets/`. The previous entry recovery is separately recorded in `qa/parity/v01842-entry/`; it restored the user's existing Chrome dive and verified 10 public optional-audio cases without a new production change.

## Collision and compiled identity

Simply shrinking the tail also shrinks the geometry-derived contact radius. The preserved RED shows that this moves three of the four actual clownfish on the first world update. The production fix stores the former geometric radius (`0.8845636438380226`) as authored collision clearance, taking the maximum with current geometry. It does not inflate renderer bounds. The independent maximum-stroke bound covers every actual target vertex; 504 actor/time state comparisons retain the previous exact poses and clearances, including repeat/rewind cases and the lazy source-model fallback.

The tracked `tests/parity/clown-tail-compiled-delta.cjs` uses the immutable v41 archive from Git, exact B geometry hashes and actual indexed buffers. It passes 22/22 source/contact/archive checks. Its 10 small controls reject stale targets, non-target changes, forbidden colors/tags/UV, an altered non-tail body corner, changed world identity and undersized contact coverage. These controls are not scene or aesthetic acceptance.

All 3,725 nodes, full contact catalogue and other world header data remain exact. Two clown LOD batches change; the other 507 batches preserve 11,510,736 Float32 words and all index bytes. Root/crown and other creature evidence carries only where geometry and positions are actually unchanged. The full existing animal-rock suite passes 10 checks, including full-world motion, moving vertices, terrain clearance and bounded contact work.

Source SHA: `d5ee7d2b4000949eff380fb1777d086bdd920f90e8fecb1190944c21d6fa6cb1`. Archive SHA: `38cdd35e63955d01b4d7b86916c7736a6fee28afe4b5ed3046c3c69d073b8d10`. The archive is 25,287,510 bytes compressed and 66,449,708 bytes decoded. The streamed scene retains 458 shared meshes and 185 chunks, totaling 20,020,111 compressed geometry bytes. There are no added draw passes, model triangles or shader changes; no measured FPS or battery saving is claimed.

## Native integration and delivery

`clown-compiled-desktop-final.json` and `clown-compiled-touch-final.json` bind the final version to served sources, the actual compiled GPU mesh, unchanged baseline camera/actor pose and production shader. Desktop views include both sides of the actual LOD threshold, opposing stroke phases and lamp lighting. The catalogue JPEG is separately rendered from that exact high mesh and recorded in `clown-guide.json`; it is an isolated model portrait. Touch remains Chrome emulation on this computer.

Final ordinary-entry, source-fallback, manifest and public receipts are recorded separately as `entry-procedural-final.json`, `local-delivery-final.json`, `public-delivery-final.json`, `pages-final.json` and `release-review.json`. Final review must bind the committed tree; a successful push alone does not certify deployment. Existing saves and automatic-quality defaults remain in scope for ordinary-entry verification.

The native previews still show simplified body anatomy, thick dark fin rims and regular pigment. The coral scan work also exposed genuine overlapping triangles in source and reduced meshes; it is retained as research rather than shipped. These limitations keep the overall realism objective open.

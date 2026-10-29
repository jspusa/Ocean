# 0.18.41 — foliose corner-normal correction

This is a local shading correction within the ongoing realism goal, not acceptance of the remaining coral art, animal anatomy, ecology or physical-phone performance work. The baseline is v0.18.40 (`cb665a19bbcf562161e4736640c7c60ae25af63f`). Receipts are under `qa/parity/v01841-tissue/`.

## Defect and causal boundary

`normal-red.json` uses actual source constructors and the shipped compiled meshes. Six foliose LOD meshes fail the new per-corner hemisphere check: 1,512 authored corner normals point behind their own geometric face even though the old triangle-average check passes. A deliberately reversed corner on a real triangle confirms the oracle detects that failure independently of the implementation.

The production change is one emission-loop correction: retain a corner's smooth normal when its dot product with the face normal is safely positive, otherwise use the geometric face normal at that corner. No shape parameters, shader, global lighting, actor count, placement, LOD interval or quality setting changes.

`normal-green-source.json` passes 79 checks. `normal-attribute-identity.json` proves all six foliose builders preserve every non-normal emitted attribute and every expanded indexed Float32 position, colour, UV and tag; all three sea-fan meshes remain byte-identical. Triangle counts are unchanged. Vertex deduplication changes are reported as storage changes, not GPU-time or battery savings.

## Native observation

`normal-only-preview-desktop.json` and `normal-only-preview-touch.json` each contain six actual-actor near/back/root views, with paired v40/corrected captures in the complete world. This is an explicitly declared single-actor geometry intervention before integration. It retains original poses, neighbors, time, cameras, shadows and production shaders, and reads back GPU vertex/index data against independently generated source bytes. Every case passes those invariants. Bind-pose framing is not proof of complete pixel visibility. Touch is desktop Chrome emulation, not a physical phone.

## Rejected shape work and lighting diagnosis

The same-camera lighting diagnostics separately vary normals, texture normals, height occlusion, received shadow and transmission for one uniquely identified actual actor. They do not show that global brightening would remove the cup/plate silhouette. The first face-normal intervention was oriented by the original smooth normal; a separate v2 uses the camera vector and preserves the earlier result and its limitation.

Two isolated shape candidates pass CPU topology checks but fail independent native art review. Candidate A retains a large bowl/handle appearance. Candidate B adds strong folds but still resembles bent sheets with a dark stem. Neither is merged. Their source, failed earlier geometry attempt, native images and review reports are retained. The next art work must address attachment transitions and varied ridge scales; this normal correction is not presented as that solution.

## Release checks

The rebuilt source SHA is `c7b5fa6120845ebc2e9a08f1f93cbedac96d7d7e73466345ce7d3eb698ab7ebc`; archive SHA is `98fbd427abf797eeb56dfc4fdc94a17b44fb532c6ae056f588931fbbb05b0370`. `normal-green-compiled.json` passes 88/88, including exact source/archive indexed meshes.

`normal-compiled-delta.json` verifies all 509 actual batches and 3,725 nodes. Exactly 11 batches use the six corrected foliose LOD meshes; the other 498 batches remain byte-identical. All 38,619,072 expanded non-normal Float32 words, node records, contact catalogue, LOD/shadow policy and other header metadata remain exact. Consequently the previous root/crown positional evidence carries across this normal-only correction; it is not carried to the rejected shape prototypes. The archive is 25,285,625 bytes compressed and 66,449,708 decoded; 458 shared streamed meshes use 185 chunks. No runtime-performance saving is claimed.

`compiled-desktop-views.json` and `compiled-touch-views.json` pass six views each against the rebuilt complete scene: exact HTTP sources, archive/index, actor identity, original shaders, actual submitted LOD/geometry, unchanged locked camera, static preflight and clean WebGL. These supersede the single-actor interventions for final integration evidence, without claiming the unfinished art is accepted.

`entry-procedural.json` passes both profiles with the real generated fallback and ordinary swimming. `entry-compiled.json` passes all 10 desktop/touch optional-audio cases. `local-delivery.json` verifies every manifest file and normal desktop/touch entry with automatic quality. These are native desktop Chrome tests; the touch profile is emulated.

Independent final review and public publication are separate gates. The final review pin and exact Pages commit, public manifest hashes and ordinary-entry receipts are retained in `release-review.json`, `pages-final.json` and `public-delivery-final.json`. A local pass or successful push alone is not publication evidence. The broader realism goal remains unfinished.

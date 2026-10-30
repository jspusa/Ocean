# v0.18.51 coastal terrain and slope ecology

Baseline: `8b717b6d7a5f9109bae6697d6282bac4043e6127` (published v0.18.50).

The normal swimming route at `[-236.6060609817505, -27.8090178307694, -36.666666666666664]` accepts a diver with 3,069 rigid vertices below the actual rendered seabed. The deepest rigid vertex is 0.264242605 m below it. Analytic center-height checks do not describe the sampled triangles or cover the sides of the full body on a slope.

Use the existing public swimming, rendered geometry, residency and encounter seams. This extends the established authorized regression workflow; the user has authorized implementation and verified publication.

- Coastal construction and contact must share the 22-segment tile samples, Float32 rendered positions and triangle diagonal. Use finite triangles for sphere contact and swept translation; do not create an invisible maximum of two LOD surfaces.
- Every normal player footprint, including the full animated body and third-person camera offset, must retain the canonical near terrain on all four desktop/mobile quality scales. Rendering and required/preloaded/resident geometry must use the same terrain distance policy. Keep other materials and shadow distance behavior unchanged.
- Normal continuous descent, lateral motion and turning must remain above the actual archived surface. Clear-water movement and open passages must remain possible. Terrain contact must work independently of downloaded/resident geometry and remain bounded during swimming.
- The existing small reef arch has insufficient comfortable full-body clearance above the sampled seabed; its previous passage fixture also bypassed the app's center clearance. Add a visible 0.30 m scour with a smooth compact rim, using the arch's shared placement. Preserve stone geometry, full body volumes and collision tolerances. Prove an ordinary accumulated-input passage against the new actual seabed and stone; revalidate local coral support. Do not substitute an invisible collider exception or an extremely narrow special pose for usable clearance.
- Extend plausible daytime encounters beyond the shallow reef with the existing longnose butterflyfish and lionfish models; use the documented species depth ranges, immutable saved dive seed and safe candidate habitats. Preserve normal discovery, per-dive variation, saved continuation and existing rendering/contact owners. Details and primary sources belong in `SLOPE-ECOLOGY-v01851.md`.
- Expose the existing chart/mooring panel from the home screen so a player can choose an unlocked entry and plan exploration without entering the story workflow. Reuse the existing panel and actual controls; preserve a readable, touchable mobile footer.
- Preserve automatic quality on desktop and touch, avoid new textures or mesh types for these encounters, verify entry and ordinary movement, and measure local renderer/streaming costs before publication. Desktop touch emulation is not a physical-device or battery measurement.
- The larger realism, material, light, rock, fauna and coral attachment goal remains open. This release must not be represented as complete commercial-quality acceptance.

Verification: independent archived triangles and full diver vertices; actual renderer/stream public behavior; actual encounter update/save behavior; native normal keyboard/touch movement with auto quality; appropriate stone, diver, ecology, terrain and release regressions; independent Standards and Spec reviews; exact public deployment and all served file hashes after publication.

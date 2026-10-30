# v0.18.51 — actual coastal contact and slope encounters

Baseline: public v0.18.50, `8b717b6d7a5f9109bae6697d6282bac4043e6127`. This is an incremental release; the full realism, content and commercial-quality goal remains in progress.

The diver now contacts the actual Float32 coastal tile triangles with the full animated-body envelope. Near terrain selection and streaming use horizontal distance for the terrain color pass, so desktop and mobile quality retain the same surface around the swimmer. Rock geometry, nonterrain selection and shadow distance policy retain their existing owners. A visible 0.30 m scour with a smooth rim provides space through the existing small stone arch; there is no smaller body collider or invisible passage exception.

The homepage exposes the existing chart/mooring panel. Four reused butterflyfish/lionfish instances extend daytime encounters to approximately 62–82 m. New dives vary safe pockets and attendance; saved continuation retains the arrangement. See the [contact specification](COASTAL-CONTACT-v01851-SPEC.md) and [ecology/source record](SLOPE-ECOLOGY-v01851.md).

## Exact build and CPU evidence

The final complete build exited successfully with archive SHA-256 `554503f24f70cf85099211735a83b04c36825bb96693ecf48db6e487d897549f`, 25,296,576 compressed bytes, 509 indexed meshes and 3,729 shared instances. It contains the visible scour and all four new individuals. The first complete build without the scour is retained as historical evidence and is not the final archive.

| Contract | Final result | Evidence scope |
| --- | --- | --- |
| Coastal finite contact | ★★★★★ 8/8 | Independent archived vertices, triangle interpolation, finite face/edge/corner contacts and swept spheres; actual full diver mesh under normal movement |
| Diver movement | ★★★★★ 14/14 | Actual app collision followed by body movement; arch passage uses 404 accumulated inputs of at most 4 cm, complete body and actual archived stone/ground |
| Stone and trench regressions | ★★★★★ 19/19 rock, 10/10 animal, 4/4 interaction, 8/8 trench | Existing finite rock geometry, moving animal envelopes, interaction and trench ground owners |
| Terrain/residency | ★★★★★ 14/14 | 43,904 full-body/camera viewpoints, all four quality scales, archived triangle identity and a mobile-low deep-water residency witness |
| Scene streaming | ★★★★★ 5/5 efficiency, 8/8 streaming, 11/11 recovery | Required geometry, bounded collectors and failure recovery |
| Coral actual attachment/crown | ★★★★☆ 1,338 foliose/fan and 1,291 branch/mound LOD instances | Independent positive-area root support; foliose/fan crown volume checks and branch/mound full surface plus closed-substrate containment pass. Open-substrate volume remains explicitly unknown for 473 branch/mound instances. Detached controls fail |
| Encounters | ★★★★★ 12/12 slope, 18/18 generic, 9/9 deep, 8/8 habitat, 6/6 reef fish | Actual final archive, saved seed/continuation/import, paired attendance, full motion envelopes, feeding and 180 seconds of 66 reef fish |
| Boot and controls | ★★★★★ 4/4 optional audio, 6/6 navigation, 12/12 gamepad UI | Audio remains outside boot readiness; existing panel and input contracts remain valid |

The old coastal descent failed against the rendered surface: 3,069 rigid diver vertices were below the seabed, with a deepest rigid intrusion of 0.264242605 m. The original arch fixture also bypassed app collision; its initial conservative body envelope overlapped the old ground by 0.117625478 m. That is an envelope witness, not a claim that the actual old starting mesh was buried. Both negative controls are retained. The new passage retains the original body dimensions, stone and numerical tolerances.

Historical whole-world immutability tests are **not all green**. `coral-root-contact` retains two failures for the old unchanged-actor/rock-placement contract; its attachment, detached-control and crown checks pass. `diver-envelope-contract` retains four historical v43/v46 identity failures while its twelve body/envelope/accessory/negative-control checks pass. Added fish, the local scour and derived local placements are assessed against v50 separately; the historical rules were not weakened to hide these failures. No claim is made that all repository tests passed.

The independent v50→v51 inventory finds eight changed near/coarse terrain meshes (indices unchanged, current vertices match the actual generator), 501 byte-identical other meshes, four appended fish, and 129 local derived node changes. These comprise 56 static descendants and 73 existing animals; the latter's changed fields reproduce exactly from each version's own world owner at the same phase. Twenty rock-contact poses follow their visible stone placements. The scoped audit remains **6/7**, with its single original failure retained: node 1294 / branch-3 changes the pre-fit diagnostic `reason.crown` from true to false. Both original/final poses and support stone node 258 descend by 0.028417275477045 m; fit delta, limits, support identities, shape and genes stay unchanged. The independent Spec review accepts this as permitted derived fit metadata: `next_reef.js` computes this flag from the original candidate, while final support and clearance still must pass. It is not a flag saying the final crown is penetrating. No broad identity exception was added.

## Native input and visual evidence

Installed Chrome used the Apple M3 Max Metal GPU. Desktop 1280×800 at DPR 2 and touch emulation 390×844 at DPR 3 retain default adaptive quality (initial quality 2/1). Homepage buttons, including the dynamically inserted multiplayer button, all remain at least 44×44 CSS pixels inside the viewport. The visible chart entry opens and closes by actual mouse click or touch tap. Additional 320×568 portrait and 844×390 landscape touch layouts pass the same button bounds, real chart tap and normal entry checks.

After an explicitly disclosed reproducible coastal placement, real held Q/down-touch reaches the seabed. After a second disclosed placement at the arch entrance, real W/forward joystick crosses the opening, constrained to the surveyed local corridor rather than going around the columns. Desktop records 390 descent and 450 passage frames; touch records 395 and 455. Only completed render calls count. The actual displayed diver instance supplies the body pose; it must be submitted, near terrain must be nonempty/resident/submitted, and every recorded full-body envelope clears actual ground and stone. No page/GL errors or context loss occurred. These are normal inputs after diagnostic placement, not a full natural journey to the arch.

The separate desktop ecology route uses only visible UI, keyboard swimming and mouse dragging, with read-only observations: homepage → ruins mooring → dive → chart marker → butterflyfish → lionfish → save/home → continue. All 21 checks pass, including two advancing rendered submissions, pointer selection and earned observation notes. It does not write position, clock, seed or quality.

Direct screenshot review confirms the diver above the seabed, readable desktop/touch homepage, a visible butterflyfish pair and a selectable lionfish. The butterflyfish front view is small; the lionfish still has visibly stylized geometry. These images establish presence, contact and usable interaction, not photographic realism. Touch emulation is not physical iOS/Android performance, heat or battery acceptance.

## Controlled renderer cost

The native ABBA experiment compares immutable v50 with v51 at fixed actual camera/target, time, resolution, quality and MSAA. Every warm/sample render must complete and advance its frame. It records complete-frame GPU queries, CPU submission time, triangles and residency; aborted streaming frames cannot count as cheap samples. Version identity is checked separately for both URLs.

The first short-window run (8 warm / 16 measured frames per view per block) passes all measurement invariants but has appreciable between-block timing variation. It is retained separately. The final run uses 90 warm frames and 48 complete-frame queries in each of 36 rows: all 1,728 samples and measurement invariants pass, with no sample removal. Medians below are milliseconds and use the harness's upper-middle value for even sample counts; stars rate the evidence scope, not speed or visual quality.

| Profile / view on this computer | v50 GPU median | v51 GPU median | Evidence |
| --- | ---: | ---: | --- |
| Desktop / coastal witness | 13.571 | 13.172 | ★★★★☆ Controlled local timing |
| Desktop / deeper coastal floor | 11.649 | 11.193 | ★★★★☆ Controlled local timing |
| Desktop / reef control | 6.951 | 6.080 | ★★★★☆ Controlled local timing |
| Touch emulation / coastal witness | 7.172 | 6.741 | ★★★★☆ Same computer GPU |
| Touch emulation / deeper coastal floor | 5.857 | 6.803 | ★★★★☆ Same computer GPU |
| Touch emulation / reef control | 3.355 | 3.686 | ★★★★☆ Same computer GPU |
| Low touch emulation / coastal witness | 1.034 | 1.072 | ★★★★☆ Same computer GPU |
| Low touch emulation / deeper coastal floor | 1.095 | 1.192 | ★★★★☆ Same computer GPU |
| Low touch emulation / reef control | 1.185 | 1.154 | ★★★★☆ Same computer GPU |

Both versions have the same measured maximum of 41,581,860 resident geometry bytes. Residency varies by view/block as streaming evicts distant geometry; some candidate views retain more nearby ground, with a maximum corresponding-block increase of 156,000 bytes (about 152.3 KiB). Submitted triangles are identical except the touch reef control, where retaining the canonical nearby terrain adds 810 triangles (26,880→27,690). There are no new mesh types, texture slots or rendering passes. CPU render-call medians range 0.7–1.6 ms in the candidate; this excludes simulation/contact update cost. Timing variation remains: for example the two candidate touch/deeper-floor blocks have conventional averaged-middle medians 6.007 and 7.677 ms. The largest paired aggregate GPU increase is 0.946 ms; these runs establish bounded local measurements, not a proven whole-game speedup, stable phone FPS or lower battery use.

## Review and delivery

Independent [Standards](REVIEW-v01851-STANDARDS.md) and [Spec](REVIEW-v01851-SPEC.md) reviews found no unresolved production blocker, including the disclosed derived fit diagnostic. The final pack verifies exact generator/archive replay inputs. Syntax checks pass for 65 source/regression files. Local delivery passes all 331 manifest hashes, ordinary desktop click/touch tap, unchanged default automatic quality, compiled/streamed scene, optional fish, and no page/console/GL errors. `local-final-delivery.json` is local evidence despite historical harness check names containing “public”.

Exact public deployment and all public hashes remain a post-commit gate; a push alone is not publication evidence. Raw receipts, failure history and images are retained under ignored `qa/parity/v01851-environment/`; source regressions and this report are committed. Two homepage test setup failures are retained: the initial fixture omitted the pre-existing dynamically inserted multiplayer button and guessed the panel title. The final assertions use all five actual control IDs and the existing panel's exact contract; no product change or looser hit-target threshold was needed.

Remaining goals include more realistic fish and diver forms/materials, improved lighting/rock/coral detail, broader believable ecology, long-duration device performance and physical-phone acceptance. The original persistent goal and existing issue statuses stay open.

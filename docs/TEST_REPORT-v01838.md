# v0.18.38 — animal surface continuity

Status: candidate validated and independently reviewed; public deployment verification pending. The wider realism goal remains open.

## Change

Turtle shell, skin and plastron have separate continuous local materials. Five median and four paired costal scutes replace the repeated wood-ring texture; skin no longer selects a projection from a world-space normal. Four reef fish species evaluate pigment at the fragment instead of per polygon, and legacy fin roots blend into body pigment. Original geometry, rig, UID, genes, encounters, saves, actor counts and automatic-quality settings are unchanged.

## Evidence and corrections

Native material witnesses use installed Chrome on the Apple M3 Max. The original turtle fails pigment invariance and normal covariance under matched animal/camera rotation, while geometric prerequisites and GL checks pass. The fish witness fails eight actual compiled polygon-color pairs and two actual fin roots. Its first harness attempt had a sampler error and is retained as an invalid harness result, not a material RED.

The first candidate passes these numerical checks, but actual fixed-camera images exposed overly uniform turtle skin and strong fish micro-normal detail. Root requested a bounded visual refinement and identified derivative-filtered height being differentiated again. Final height fields must contain no derivative-derived filtering; footprint fading is applied after the raw surface gradient. This follows [GLSL ES 3.0 section 8.9](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf), whose higher-order derivative results are undefined. The source issue does not by itself prove the sole cause of every visible triangular artifact.

Evidence is retained under `qa/parity/v01838-materials/`. Diagnostic albedo/normal taps are numerical material checks, not beauty renders. Actual game views, native cost, independent review and public delivery are recorded separately below.

The full light path also differentiated the generated bump normal for specular variance. It now uses the original smooth geometric normal for these two material families. That portability repair did not remove the visible triangular web. Separate actual-world ablations retained the web with micro normals disabled and with pigment-only output; replacing only the pigment helper's derivative bandwidth with a fixed width removed it. The final pigment correction therefore computes coordinate footprints before the tag branches and passes those widths into pure edge functions. The fixed-width ablation is diagnostic, not the intended unfiltered production solution.

An initial GPU-cost run retained 100 samples and failed its strict invariant on one sample: draw calls changed from 64 to 117 while submitted geometry, resolution, MSAA and actor submission stayed identical. An actual streaming CPU reproduction confirmed that delayed terrain eviction can invalidate shadows after loading jobs are finished. The original timing receipt is invalid for comparison and is retained. The revised fixture waits for actual streaming eviction and shadow refresh to settle, then requires unchanged residency and shadow counters as well as the original invariants.

## Candidate acceptance

Frozen engine SHA-256: `f1ef55fe3a9f512749a62be0738364d92db8c20c3190770ade481f183fecaf40`; packed manifest SHA-256: `05c974857a1b9eff28ecfa2380c3703eca623629c091f37c6febfe0f7c7a7e23`.

| Check | Evidence | Status |
|---|---|---|
| Turtle material transport | 48 actual compiled-triangle cases, high/low LOD and three quality levels; six assertions | ★ Passed 6/6 |
| Reef pigment and unaffected animals | Eight baked-color pairs, two fin roots, mapping/native GL checks and nine ray/dolphin/oarfish body/fin/eye samples | ★ Passed 13/13 |
| Actual production world views | Seven turtle views plus 120 continuous frames per desktop/touch profile; six fish species × five views × two profiles | ★ 74 fixed captures and 240 motion frames; zero page/GL errors |
| Relevant CPU regression | Surface routing/fallback 9/9, fauna motion 14/14, turtle anatomy 16/16 | ★ Passed |
| Packed public resources | Static checks 73/73; manifest 309 paths; all 239 asset/music files byte unchanged | ★ No new mesh, texture, actor or public path |

Stars describe the stated evidence, not a visual-quality rating. Root visually reviewed selected final turtle oblique/dorsal/underside and touch-oblique images, Banggai oblique/far touch, and longnose side/lamp views. The selected corrected fish views no longer have the triangle-edge pigment web. Root did not individually review all 74 captures. Turtle skin now has restrained irregular detail, but primitive fish body/fin shapes remain visible.

The turtle diagnostic uses production VS/FS and actual compiled triangles with prelighting taps. The reef numerical diagnostic feeds actual compiled local positions/colors through a diagnostic varying vertex stage into production FS; it is not a complete production-VS or lighting test. Separate actual-world view captures use the production Renderer.

Turtle kind 2/material 5 now uses the existing specialization mechanism, preserving the exact vertex shader and changing only the two fragment selector declarations. There are ten precompiled surface programs. Fallback, finite program count, full draw/state equivalence and no per-frame compilation have CPU coverage.

The first exact full-frame specialization test is retained as `turtle-surface-exact.json`: desktop near was exact; desktop far had eight RGB-channel differences of 1/255 and failed the initial exact-only assertion. Independent read-only review accepted the existing anemone precedent: specialized RGB may differ by at most 1/255 in at most 0.001% of channels, alpha must be exact, and generic repeat must remain byte exact. No pixels are filtered or omitted. The numerical cause is unproven.

| Final full-frame comparison | Specialized difference | Controls |
|---|---|---|
| Desktop near | ★ Byte exact | ★ Exact generic repeat, source/work/LOD/GL checks |
| Desktop far | ★ Accepted with tolerance: 8 of 16,384,000 channels, max 1/255 | ★ Alpha and generic repeat exact |
| Touch near | ★ Byte exact | ★ Exact generic repeat, source/work/LOD/GL checks |
| Touch far | ★ Accepted with tolerance: 10 of 2,962,440 channels, max 1/255 | ★ Alpha and generic repeat exact |

Final receipt: `turtle-surface-parity.json`. The whole generic/specialized/generic world is compared, including high and low turtle LODs. This is not byte-exact parity for every view.

## Native cost

Final complete-candidate measurement passed all 400 native GPU samples with unchanged draw, geometry, residency, shadow and resolution invariants. Both desktop and touch profiles loaded; page/console errors were zero. The process prevented idle sleep for this rerun, without establishing the cause of the prior timeout. The initial valid unspecialized-material run retained 400 samples and found modest additional whole-frame cost, motivating the turtle specialization. A subsequent specialized run completed desktop samples but touch boot timed out; desktop block durations also varied greatly. It is retained as `cost-specialized-incomplete.json` / `.log`, an incomplete run and is not used for a performance claim. Host sleep/interference was suspected but not established.


The final `cost-specialized.json` / `.log` uses the complete production world, original and current animal material/program sets in same-context ABBA blocks (10 warm frames then 25 samples each). Automatic quality is verified enabled on entry, then frozen only for measurement: desktop quality 2, 2560×1600, 4× MSAA; touch quality 1, 585×1266, 2× MSAA. No screenshot/pixel readback occurs during timing. All raw samples remain in the receipt.

| Controlled camera/profile | Original median GPU | Current median GPU | Observed change | Original A1→A2 drift | Evidence |
|---|---|---|---|---|---|
| desktop / turtle | 29.366 ms | 23.121 ms | -21.27% | +14.36% | ★ 100/100 structurally valid |
| desktop / banggai | 14.633 ms | 14.767 ms | +0.92% | -2.25% | ★ 100/100 structurally valid |
| touch / turtle | 5.762 ms | 5.336 ms | -7.40% | -11.88% | ★ 100/100 structurally valid |
| touch / banggai | 6.369 ms | 6.499 ms | +2.05% | -11.52% | ★ 100/100 structurally valid |

Stars describe sample validity. Baseline drift is substantial in three rows and is not removed from the results: these numbers do not establish precise speedup percentages, statistical significance, natural-play FPS or phone battery use. Desktop turtle candidate block medians were below both original block medians; touch results and fish differences are not a firm performance-improvement claim. The material tradeoff remains bounded in these tested scenes, with no extra geometry or draw work; automatic resolution remains enabled for ordinary play.

## Independent review

[Standards and Spec](parity/REVIEW-v01838.md) found no blocking issue. One optional P3 test-observation deduplication suggestion is deferred. Both reviewers separately checked the final-cost report delta. Runtime and test sources remain identical to the pinned review candidate. Public verification is still required before delivery.

## Limits

This is a surface-material slice. Several reef fish still have primitive body/fin construction, and the broader lighting, rock and animal fidelity work remains open. Touch checks emulate a phone on the computer; they do not establish physical-phone performance or battery use. No photorealism, commercial-readiness or Wii-superiority claim is made.

# v0.18.50 independent Spec review

Baseline: `11bec02d5507c01ae9cc7ecf4f7ad0ed7e5f3629`. Reviewer authored none of the production changes. Read-only source/document/receipt audit; this reviewer did not run the build, browser or GPU tests. **Production implementation aligns with the limited turtle specification, and local acceptance gates pass. Exact public deployment remains a separate future gate.** Stars indicate evidence completeness, not realism or performance rankings.

| Spec requirement | Verified evidence | Status |
| --- | --- | --- |
| Shape, seams, anatomical charts and budgets | Current geometry 27/27; closed shared shell/head, all six inset charts, unchanged eye/nose attributes; triangles 12,970/1,074, indexed bytes +2.30%/+8.02% | ★★★★★ Accepted |
| Final build and preserved world | 31 generator inputs; final archive `cc252b5d…`, only batch changes; archived actors/routes/rocks and 1,069 reef actors/limits retained | ★★★★★ Accepted |
| Rig, culling and clearance | Fresh rig 6/6; archived contact 6/6, six turtles ×607 route poses; positive continuous radial and arbitrary-pitch signed vertical margins | ★★★★★ Accepted within documented scope |
| Atlas/material and built appearance | Material 12/12, 96 diagnostic rows; 9 slots, one atlas fetch, max mip 3/aniso 1, footprint 4→8 fade; 14 built images independently reviewed; 261 motion frames/profile | ★★★★★ Limited increment accepted |
| Controlled cost | 400 retained valid ABBA samples/profile; differences below baseline drift | ★★★★★ No meaningful measured cost change |
| Version and texture recovery | Shell/requests now 0.18.50; desktop/touch retry and failed-upgrade rollback preserve byte-exact frames, GL 0/errors empty | ★★★★★ Accepted |
| Catalogue portrait and package | Inspected actual `guide_turtle.jpg`; current turtle-002 mesh/material, 12,970 triangles, matching guide/package hash `da28853d…`; HTML/version 0.18.50 and 331/331 manifest files match | ★★★★★ Accepted locally |
| Normal entry and recovery/swimming | Local desktop/touch click/tap enters compiled world, 47 species, adaptive quality 2/1; real partial-image timeout → retry → keyboard/touch movement succeeds, no stuck input or GL/page errors | ★★★★★ Accepted locally; touch emulated |

The contact derivation matches the pinned kind-2 shader: bounded x/y stroke, pitch before scale, no bank/morph displacement, yaw preserving Y. It first identifies actual archived indexed meshes and six initialized production profiles. Continuous analytical bounds establish all-phase containment; sampled production routes establish their recorded floor/surface gaps. Neither claims arbitrary terrain-footprint or interaction-route safety.

Current engine `a1c03bbb…`, world `5a93139e…` and archive hashes were rechecked after the shell-only version/package correction and still match accepted receipts. Existing native source proof remains applicable. Documented geometry/material/rig/contact/audio/loader counts and cost limitations agree with receipts.

The identified documentation ambiguity is resolved: `VALIDATION-v01850.md` now correctly describes **current generic versus turtle-specialized whole-scene rendering** in four controlled views, not baseline-versus-current non-target parity. All four final comparisons are exact.

Final local receipts reviewed: `guide.json`, `package-final.json`, `startup-image.json`, `texture-loading-browser.json`, and completed/passed `local-delivery.json`. The last verifies 331/331 files and both normal starts with zero reported errors/warnings/network failures. Its URL is `http://127.0.0.1:8765/`; inherited “Public” check labels do not turn this into deployed-site evidence.

Remaining SPEC:36 gates: exact release commit and public Pages verification of every manifest file and normal desktop/touch entry. No public deployment is inferred. Face detail, touch grazing-angle detail loss, distant LOD and surrounding-world simplification remain disclosed; this is not whole-game photorealism or commercial-game parity. No unresolved local Spec blocker.

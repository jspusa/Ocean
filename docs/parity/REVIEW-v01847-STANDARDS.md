# v0.18.47 Standards review — abyss program specialization

Date: 2026-10-30. Baseline: published v0.18.46, `d6d8bc0253147623177f224300109cdea721f7c1`.

Verdict: no blocking correctness or maintainability defect found in the reviewed production specialization diff. The final narrow release-source review below also passes. This is not completed build or public-delivery acceptance. The proposed rock replacement was subsequently rejected and is not part of the release.

Reviewer: `v47_performance_audit`. Root authored the production `src/engine.js` edit; this reviewer did not. This reviewer authored the `surface-programs.cjs` extension and the separate native correctness harness, so the test discussion below is author self-review, not an independent review of those tests. No test, browser, GPU, build or image inspection was performed for this review. The initial source review did not inspect timing data; the final addendum checks retained metadata and the separately produced aggregate without rerunning measurements or independently recalculating raw timing quartets.

Reviewed the actual working diff of `src/engine.js` and `tests/parity/surface-programs.cjs` against the published baseline, with the adjacent production shader compiler, uniform setters and program selection code. Also read the candidate specification and the separate cost-method source review. Runtime receipts were not reread while root was measuring GPU cost.

Stars identify evidence scope here: ★★☆ means directly inspected source; ★☆☆ means a reported result or remaining measurement boundary. They do not rate visual quality or claim runtime performance.

| Check | Source finding | Evidence |
|---|---|:---:|
| Bounded supported pair | `surfaceShaderSource` adds only numeric kind `10`, material `0` to the existing whitelist. Unsupported pairs still throw. `surfaceProgram` routes only the exact numeric `10:0` pair to its cache entry; other material/kind combinations retain their previous route. | ★★☆ |
| Vertex and fragment invariants | The setup expression passes the exact original `VS` for `10:0`. Only `uniform int uKind;` and `uniform int uMat;` become constants in its fragment source. The actual diff contains no edits to either shader body, species/tag arithmetic, lighting, normal transport, LOD discard or animation. | ★★☆ |
| Species remain runtime inputs | One shared `10:0` program handles species 27–31. `uSpecies`, material profiles, tags and packed instance attributes are not specialized or rewritten. No species-specific program proliferation is introduced. | ★★☆ |
| Generic fallback | A compiler/link failure is caught for that pair, recorded in `surfaceProgramFailures`, and leaves no successful `10:0` cache entry. Selection then returns the existing generic program. A missing entry or absent map also preserves generic selection for this pair. Successful unrelated programs are retained. | ★★☆ |
| Compile once | The constructor uses the existing setup path. `setupSurfacePrograms` returns immediately when its map already exists, including after one variant failed. `surfaceProgram` performs a map lookup and fallback only. No compilation, relinking or failure retry was added to the frame loop. | ★★☆ |
| Failure cleanup | The unchanged `makeProgram` deletes a failed program and marks temporary shader objects for deletion in its existing catch/finally paths. This is GL resource lifecycle handling, not a guarantee of immediate driver memory reclamation or a timeout for a stalled compiler. | ★★☆ |
| Other branches and render workload | The previous ten base entries remain in the same order; the new entry is appended. The imported `13:18` route/readiness gate, generic program, shadows, geometry, visibility, textures, framebuffer allocation, draw order, cadence and automatic quality policy are unchanged by the production diff. | ★★☆ |
| Regression intent | The source test covers all five abyss selectors, exact original VS, declaration-restored FS, successful routing, missing-key fallback, one failed compile, subsequent frames, source counts and the existing interleaved pass/state assertions. Tests are mocked GL/CPU coverage, not native compiler or image evidence. | ★★☆ |
| Root's native result | Root reports both profiles completed 123 cases after the controlled sunless fixture was corrected to 7000 m. This review does not independently inspect or reproduce those results and makes no timing claim from them. | ★☆☆ |

The direct code references are `src/engine.js:1305` for supported source specialization, `:1375` for compiler cleanup, `:1382` for setup, `:1392` for routing and `:1408` for the unchanged optional imported path. Test references are `tests/parity/surface-programs.cjs:92`, `:103`, `:118`, `:124`, `:131`, `:144` and `:154`.

The CPU fixture proves selector/state behavior with placeholder species profiles; it does not contain the actual five abyss meshes or material profiles. Its restored-source equality is against the current formal shader strings. The reviewed production diff separately establishes that those formal shader bodies were not edited relative to v46. Root's native harness supplies the actual compiled mesh/material comparisons; neither source mechanism alone establishes native pixel equality.

## Startup overhead boundary

The extra setup work is bounded in count, not in elapsed time. Per new `Renderer`, this change adds at most one `makeProgram` attempt: two shader compile calls and one program link on the successful path, plus one cached program. A failed vertex or fragment compile can stop earlier. The base surface map grows from 10 to 11 entries; after the independently owned optional imported material is ready it grows from 11 to 12. No new texture, framebuffer, geometry allocation or runtime asset request is part of this production change.

Shader compilation/linking is synchronous in the existing setup path. There is no source-level millisecond cap, and this review has no before/after cold-start measurement. A driver may also defer internal work until first use even without another JavaScript `compileShader`/`linkProgram` call. Therefore “compiled once” cannot be presented as zero startup overhead, lower launch latency or absence of first-use stutter. The fixed-scene warm GPU measurements explicitly do not measure this cost.

Before publication, root still needs successful normal desktop and touch entry for the final built candidate, with adaptive quality and save behavior retained. Any observed startup or first-use regression must be assessed separately; this source pass does not waive that acceptance work. No numerical startup improvement or maximum startup duration is accepted by this report.

## Evidence and remaining boundaries

Root identifies these native correctness receipts, retained separately from this source review:

- `qa/parity/v01847-performance/correctness-desktop-sunless.json`
- `qa/parity/v01847-performance/correctness-touch.json`

The earlier readiness and 1200 m fixture failures remain evidence. The readiness fix explicitly loads the production optional asset before requiring 12 programs; the depth fix changes only the diagnostic placement to enter the existing sunless predicate. Neither correction relaxes the production shader requirements or framebuffer tolerances.

At the initial source-review stage, this review permitted the narrow source change to proceed to the remaining acceptance gates. It did not establish a GPU speedup, physical-phone performance, gameplay FPS, battery savings, full-world realism, collision/ecology completion or public deployment. Root still had to evaluate all retained A/A, ABBA and BAAB measurements without favorable-run selection and obtain the separate asset/spec decisions. The following addendum records the later narrow release-source review without treating pending build or public-entry checks as complete.

## Final narrow release-source addendum

Reviewed the frozen release source while root's full build was in progress: the complete tracked diff, `README.md`, `VERSION`, `src/shell.html`, `tests/parity/current-delivery.cjs`, `docs/parity/VALIDATION-v01847.md`, the separate Spec and rejected-rock reviews, and the relevant asset selection in `build.py`. Lightweight reads checked the correctness receipt summaries/source hashes, all six cost-run initial shader identities, and `independent-aggregate.json`. No additional native run, build, image processing or test execution was performed.

| Release check | Finding | Evidence |
|---|---|:---:|
| Runtime diff remains narrow | The only behavioral runtime edit remains the reviewed `10:0` specialization. The shell diff changes only its version attribute. No audio, entry, collision, ecology, geometry, texture loader, adaptive quality or shader-body edit appears in the release source diff. Additional changed files are documentation, versioning, QA exclusions, tests and offline tooling. | ★★☆ |
| Version alignment | `VERSION`, the README title and the shell's `data-version` all identify `0.18.47`. Earlier correctness/cost receipts explicitly retain the pre-release page label `0.18.46`; their tested engine/shader identity is checked separately below. Generated output and manifest alignment remain build gates. | ★★☆ |
| Normal public-entry program gate | `current-delivery.cjs:74` allows 11 or 12 immediately after the real start action because the optional owner may already have prepared its program. Lines 75–77 wait at most 16 seconds for its terminal state, require successful asset/actor readiness and then compare the exact 12 program keys, including `10:0` and `13:18`. Missing, duplicate or extra final keys cannot pass. | ★★☆ |
| Reader-facing scope | The README describes lower deep-animal rendering work while retaining models, lighting, motion, population and automatic quality. It links the bounded validation and explicitly says this release does not replace the rock assets. It does not claim a physical-phone, battery, universal FPS or full-realism result. | ★★☆ |
| Validation arithmetic and boundaries | The reported 246 fixtures, 984 byte-exact final arms, 50 changed linear arms within one storage ULP, 7,200 measured/4,320 warm frames, all 1,200 negative candidate quartets, peak queue 3, A/A bound 2.44%, and the displayed percentage table agree with the independent aggregate. The document retains failed fixture attempts, the inherited 6/7 historical test, startup uncertainty, touch-emulation limits and pending build/delivery gates. | ★★☆ |
| Rejected rock candidate excluded | Both production rock JPEGs are byte-identical to exact v46 git blobs. The packer selects the production `assets/*.jpg`; the prepared candidate stays in ignored QA storage and the offline preparation tool refuses a production-assets source directory. This review accepts exclusion, not the candidate's visual quality. | ★★☆ |

The frozen `src/engine.js` SHA-256 is:

`bb3d42f47abe4ff1f4de5d9202ce83f729bd463a47a5b8fd1a5115ed394c5c34`

It exactly matches the full source-file hash in both final correctness receipts. All six cost-run initial records and both correctness receipts agree on the attached original VS, generic FS and specialized FS hashes:

- VS: `ae1804acfeedc3f8a0c02d71172e4ef4f5a331ef462b32c3715b11b295baf19b`.
- Generic FS: `0220ddc74e19ceecbd42f6ee2857a663ae1ae81d212ac7a3516b1b9e31e83674`.
- Specialized FS: `f7a62f67140526a80521b1bbb9e53b1a63564e5524c7a5855dcf9f0e67819b49`.

The cost receipts contain the published baseline engine-file hash and actual attached shader hashes; they do **not** contain a full candidate engine-file hash. Accordingly, this review establishes current-file identity with correctness and attached-shader identity with cost, together with the unchanged reviewed production diff. It does not claim a nonexistent candidate-file-hash field in the timing records.

The original shipping rock files verified against v46 are:

- `assets/rock_diff.jpg`: 903,525 bytes, SHA-256 `4700e02d365e21bebb89696c321854bacedf12e1c3dcdc7a0aed4ffa622ddaef`.
- `assets/rock_nor_gl.jpg`: 1,311,852 bytes, SHA-256 `4627612be3a3462bfdc13eeec4d57b16a02d18753c7e85d3b55434b4648c0e0a`.

No blocking Standards issue was found in this final narrow source/documentation scope. The independent Spec review supports the bounded specialization promotion, and the separate rock review rejects that direct replacement. The full build, scene-input provenance, generated archive/contact/world identity, normal local desktop/touch entry and exact public manifest/commit verification were still root-owned and pending when this addendum was written. Their results must be recorded before delivery is called complete. The startup-overhead boundary above remains unchanged.

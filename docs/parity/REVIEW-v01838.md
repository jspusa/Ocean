# v0.18.38 independent review

Reviewed on 2026-10-29. Baseline `153f76a8e01832dacd2e7861359cfa84b3da49be`; immutable candidate `f707524a77f8203abd1a54988255b42af85eb55e`, tree `dc36d3f3fc41cf9989b4bb2892cbc3d903acd720`. Exact command: `git diff 153f76a8e01832dacd2e7861359cfa84b3da49be...f707524a77f8203abd1a54988255b42af85eb55e`. The review snapshot is not the main-branch publication commit. Independent reviewers also read the subsequent report-only final-cost delta. Runtime and test sources did not change after the pin.

## Standards

Independent reviewer: `material_parity_review`, not an implementation author. Sources: `docs/agents/issue-tracker.md`, `CONTEXT.md`, existing repository patterns and the complete twelve-item Fowler smell baseline from AskMatt's code-review skill. All 20 changed files reviewed; no tests, GPU, build or edits performed by the reviewer.

No documented-standard violation or blocking finding. One possible **Duplicated Code**, an optional P3 heuristic: `tests/parity/animal-material-cost-browser.cjs` and `tests/parity/turtle-surface-browser.cjs` both implement the same bounded two-frame production-stream settling observation. A future test-only helper could keep that observation aligned while retaining independent timing/pixel assertions. Deferred: it is not a functional defect and does not justify expanding this release. The final-cost report delta introduced no additional finding; all samples and baseline drift are disclosed without asserting precise speedup, FPS or battery gains.

## Spec

Independent reviewer: `materials_spec_review`, not an implementation author. Source: `ANIMAL-MATERIAL-v01838-SPEC.md`. No demonstrated missing requirement, incorrect implementation or scope creep in this bounded material slice. The reviewer additionally viewed Anthias and Fire goby before/after oblique images: authored species colors remain and Fire goby's polygon-color divisions are removed. Original identity, mesh, rig, save and automatic quality are preserved. Turtle specialization retains the original VS, bounded compilation, generic fallback and work invariants. Four native pixel comparisons meet the explicit narrow policy. The repeated complete-candidate cost measurement contains 400 valid samples and documents drift and touch-emulation limits.

At candidate review, public file hashes, desktop/touch entry and strict audio entry were pending deployment gates. Post-publication results now close these gates: 309/309 file hashes, both entry profiles and 32/32 strict audio assertions passed. Evidence is recorded in [the release report](../TEST_REPORT-v01838.md). The complete realism goal remains open.

| Axis | Hard/blocking findings | Nonblocking finding | Acceptance |
|---|---|---|---|
| Standards | 0 | 1 optional P3 duplicated test observation | ★ Accepted; helper deferred |
| Spec | 0 | Public verification is a release gate | ★ Accepted; delivery verified separately |

Standards: zero hard violations, one P3 heuristic. Spec: zero implementation findings; the separately recorded public verification is complete for this slice.

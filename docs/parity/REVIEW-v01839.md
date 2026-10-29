# v0.18.39 independent review

Baseline `c10b3e197622dedaa6f0daa669e97efc7b8b22c0`; immutable candidate `4c774c3774b2538939ee1ac1b3eb26b6bd766627`, tree `4d5cd30f8a714fc2e306c5732204fa52ac868b6b`. Exact command: `git diff c10b3e197622dedaa6f0daa669e97efc7b8b22c0...4c774c3774b2538939ee1ac1b3eb26b6bd766627`. Commit list: `4c774c3 Immutable v0.18.39 precommit review snapshot`. This pin does not move the main branch. Runtime, assets and test sources are unchanged after the pin; the final delta records completed evidence.

## Standards

Independent reviewer `v39_standards` reviewed all 22 changed files against `CONTEXT.md`, `docs/agents/issue-tracker.md`, repository patterns and all twelve Fowler smell heuristics. No hard documented-standard violation or blocker. One optional P3 **possible Duplicated Code**: the stream/shadow readiness observation in `rock-material-browser.cjs` repeats the animal-material cost and turtle surface runners. A future test-only helper could align readiness checks while retaining independent timing/visual assertions. Deferred to avoid expanding this release. An editorial stale pending-cost sentence was corrected in the final report.

## Spec

Independent reviewer `v39_spec` reviewed `REEF-ANATOMY-ROCK-v01839-SPEC.md`, implementation, actual mesh/material receipts, resource audit and representative fish/rock images. No demonstrated missing requirement, incorrect implementation or scope creep in this bounded slice. The 64 derived model centers and 17 sub-millimetre phase-zero pose differences are reproduced exactly by production APIs and are disclosed separately from unchanged identity/route inputs. Only eight intended model geometries change. Reduced aggregate indexed data, increased compressed download data, increased low-detail triangle count, mixed GPU timings and baseline drift are all disclosed.

At initial review, desktop gameplay passed and touch/public delivery were still pending. Both desktop and touch natural-input runs pass 11/11. Both independent reviewers subsequently read the final report-only delta and confirmed no additional blockers. After publication, the current release separately passed 309/309 public file hashes, both entry profiles and 32/32 strict audio assertions; the existing v0.18.38 receipt was not substituted for them. See [the release report](../TEST_REPORT-v01839.md).

| Axis | Hard/blocking findings | Nonblocking item | Disposition |
|---|---|---|---|
| Standards | 0 | 1 optional P3 test-helper duplication | ★ Accepted; deferred cleanup |
| Spec | 0 | Public delivery verified separately after publication | ★ Accepted; current release gates passed |

Both reviewers were read-only and performed no tests, GPU work, build or source edits. The larger realism and physical-phone goals remain open.

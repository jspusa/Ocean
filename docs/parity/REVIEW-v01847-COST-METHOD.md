# v0.18.47 cost-method source review

Reviewer: independent `v47_cost_review` agent. Date: 2026-10-30.

Status: source review passed for the bounded native measurement. No blocking source defect found. This is not performance acceptance, native correctness acceptance, or release approval.

## Scope

Reviewed `tests/parity/abyss-specialization-cost-browser.cjs`, `qa/parity/v01847-performance/METHOD.md`, `docs/parity/SURFACE-REALISM-v01847-SPEC.md`, and the `src/engine.js` kind10/material0 specialization diff against published v46 commit `d6d8bc0253147623177f224300109cdea721f7c1`. Also inspected the production render loop, stream lifecycle, and optional Barramundi load lifecycle to check the fixture's assumptions.

The reviewer performed source reads only. No browser, GPU, test, build, image work, or timing-data analysis was executed. Root's native measurements were pending/in progress when this review was written; no results or favorable outcome are assumed here.

## Reviewed safeguards

- The engine change adds a setup-time `10:0` fragment specialization. The original vertex source and fragment arithmetic remain unchanged; only the supported `uKind` and `uMat` declarations become constants. Failed specialization retains the generic route. No per-frame shader compilation is introduced.
- The harness pins the exact v46 engine hash and generic shader strings, then checks the attached generic/candidate shader sources. Only the existing `10:0` Map entry changes between arms.
- Warm-up and measurement render once per RAF. Query availability is polled without an additional per-sample wait, and the pending queue is bounded to 16. The separate final drain is bounded.
- All three declared actors are attempted, with 240 warm frames and 400 measured frames per valid scene. Actual target submission, native hardware, resource identity, geometry buffers, draw workload, resolution, quality, and settled residency are checked. The world remains frozen during measurement.
- A/A uses the same generic program for both labels. ABBA and BAAB pair adjacent four-frame groups, with the conventional median across quartet deltas/ratios. Pooled arm medians are labeled secondary diagnostics.
- Disjoint observations invalidate the complete measured interval. Other failures retain collected rows and produce an invalid scene; there is no sample replacement or favorable-run selection in the harness. Pending queries are deleted and the production candidate route is restored on normal completion and handled failure.
- Query-data success is explicitly separate from optimization acceptance. The declared control, both orders, every scene, and independent image correctness must be considered together.

## Optional-asset clarification and follow-up confirmation

The cost harness opens a frozen `?still` page and does not start a dive. Production boot calls `oceanBarramundi.ensure(renderer)` (`src/app.js:552`); the optional asset load normally begins after a dive action (`src/voyage.js:145`) or gallery action. `renderer.loaded` covers base textures and is not a Barramundi readiness promise. Waiting unconditionally for `oceanBarramundi.status(renderer).ready` in this still fixture would therefore wait on work that has never been started.

Root's narrow follow-up is source-confirmed:

- Line 50 requires the exact intended `idle` state before the initial snapshot.
- Line 51 retains the complete reported optional-asset status in the receipt.
- Line 56 stores its serialized signature with the other resource identities.
- Line 69 checks that signature during the per-frame resource invariants, alongside program and texture identity.

This makes the fixed fixture explicit and rejects an unexpected optional-asset lifecycle change. It does not trigger a load or silently wait for an idle owner. The separate correctness harness intentionally initiates and awaits that production asset load; its imported-ready fixture is a distinct, disclosed setup.

## Remaining acceptance work

Root must evaluate the retained A/A, ABBA, and BAAB data for both profiles and complete the separate native image-correctness checks before deciding whether to promote this specialization. Ambiguous or contradictory timing remains inconclusive. Fixed-scene GPU duration does not establish natural gameplay FPS, physical-phone performance, battery savings, or lower startup latency; the extra setup-time program's compilation cost is outside this measurement.

Full build/provenance checks, overall independent Standards and Spec release reviews, and exact public deployment verification remain required. This method review covers only the stated specialization and measurement protocol, not the rock asset candidate or the broader realism/contact/ecology goal.

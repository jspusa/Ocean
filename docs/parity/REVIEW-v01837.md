# v0.18.37 independent review

Base: `2451003907279518c09a2534ae3102ffca7a8761`. Initial immutable candidate: `433a1415f12414156fcc485405bf331f8d18b260`. Both independent axes used `git diff BASE...CANDIDATE`; the review-only commit does not move the working branch. Reviewers did not edit sources or execute GPU work.

| Axis | Initial result | Required follow-up |
|---|---|---|
| Standards | ★★☆☆☆ — one P2: ecology modifies final animal positions after the new contact guard. | Actual feeding/partner movement must end with visible-rock contact, with no duplicate heavy per-frame pass. |
| Spec | ★★☆☆☆ — one P2: changing a habitat waypoint can change routes/attendance on resume despite an unchanged seed. | Persist each dive's arrangement inputs and verify the real mark/save/continue/reload lifecycle. |

Stars describe this review's state only, not visual realism or product readiness.

## Standards

The actual `features.init` wrapper called `ecology.afterLife` after the new individual contact check. Feeding/recovery and `movePartner` then overwrote `f.p`; the partner step still used legacy ellipsoid avoidance. This violated the actual visible-surface requirement. A final affected-pose correction must use coherent previous interaction positions and keep normal interaction behavior.

One nonblocking heuristic remains: `encounters.js` derives transformed rock bounds that the contact backend also owns. This is a possible duplication/feature-envy maintenance concern, not a documented-standard violation. No unsupported refactor is included in this correction.

## Spec

The initial encounter state stored only a seed. `apply()` rebuilt protection from the current waypoint, accepted requests and partners, so a normal habitat mark changed the inputs used on the next resume. This contradicted the resumed-dive continuity requirement. The native regression now uses real journal clicks followed by save/home/continue, and fails on the initial candidate.

The broader lighting, material, other-species anatomy and physical-device requirements remain open. Final performance and public delivery are separate gates and were not claimed complete by either initial reviewer.

## Correction review

Corrected candidate: `311f7acc822fb0ef10378fd32d56b0365dc401c2`, same base and one review-only commit (`Review snapshot: final interaction contact and stable resumed encounters`). Both original reviewers independently read the full three-dot diff and correction delta without running tests, builds or GPU work.

| Axis | Correction result | Remaining scope |
|---|---|---|
| Standards | ★★★★☆ — prior P2 resolved; no remaining documented-standard violation in the delta. | One nonblocking bounds-duplication heuristic remains. |
| Spec | ★★★★★ — prior continuity P2 resolved; no new finding or scope creep. | At review time, native correction acceptance, natural performance and publication were still pending. See the final test report for their later results. |

Standards confirmed one final world contact pass, coherent feeding/partner positions, actual 4/4 regression evidence and unchanged 31-frame direct/wrapped poses plus query work. Historical fixtures remain intact; only four independently validated clownfish heights are exempted, and the full 821-actor identity/route digest remains protected.

Spec confirmed schema-2 saved protection inputs, reuse on init/reset/resume, refresh only at new-dive entry, and documented seed-only migration limits. Real boot loads voyage after actor initialization, so valid saved partner UIDs survive sanitization. The final interaction pass follows all `afterLife` hooks and synchronizes ecology to the rendered position.

Final counts by axis: Standards — 0 unresolved hard findings, 1 nonblocking heuristic; Spec — 0 unresolved findings in this slice. The full realism goal remains open.

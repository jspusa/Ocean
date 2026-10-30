# v0.18.45 guided swimming and accepted body movement

This repair is separate from `DEEP-ENCOUNTER-v01845-SPEC.md`, whose deepsea change concerns slowdown around live encounter homes. That existing change is retained. This repair changes only route planning and guided-motion feedback in `src/trench.js` / `src/deepsea.js`; `src/player_contact.js`, all eight body spheres, their radii, rendered geometry, speed limits and observation budgets remain unchanged.

## Defect and scope

The original CPU fixture did not load the real contact owners or run the camera/body frame owner during navigation. Restoring those owners exposed a genuine cold-boat route defect in both exact v44 and the first v45 candidate: from `[-22.6,-2.2,52.5]`, the swimmer stopped at `[188.11680168588686,-0.7005913143510353,32.54950339401218]` while guidance and a nonzero velocity continued.

`OceanTrench.route` had checked a small region/floor clearance but not the actual nearshore rock catalogue. `collide(next.p, before)` also mutated the very array used for the correction comparison. Finally, route progress was committed before `updateCamera` accepted the complete diver body.

The prior native receipt passed. It ran about 1.2 seconds of real RAF from the same navigation boat entry, used W to take over, then replanned before its long journeys. It did not test the same uninterrupted cold-boat trip; the exact position immediately before that replan was not recorded. This distinction neither invalidates its observed success nor cancels the CPU blocker. Native validation of the repaired uninterrupted trip belongs to the release gate.

## Repair

- Nearshore departure uses the original direct route only when clear. Otherwise it chooses the shortest clear route from six finite open-water lane candidates. Every candidate leg is tested against actual rendered rocks and the complete rotating-body envelope, derived from the unchanged profile and actual diver scale, with a 0.035 m margin. Region/floor clearance also uses that envelope nearshore. Deep route topology remains the finite existing corridor, with 0.81 m region clearance and actual ground sweeps; full eight-volume acceptance remains authoritative everywhere.
- Planning runs only when a trip is requested or explicitly continued. No route or full-body solve is added to the 120 Hz physics loop.
- Physics proposes movement using independent copies of requested positions. A frame ends at its next route corner instead of consuming additional legs before acceptance. The existing `afterCamera` feature seam reads the real accepted pose, derives its velocity, and commits a corner or observation arrival only when that pose reached the proposal.
- A correction greater than 0.25 m stops guidance immediately. At observation speed, true correction plus less than 10% accepted directional progress accumulates a stall duration; 0.5 continuous simulated seconds stops guidance and retains its destination. Normal accepted slow motion resets the meter. Neither path claims arrival, teleports, shrinks the body, nor automatically restarts.

## CPU evidence

Evidence stars describe coverage, not visual quality or device speed.

| Evidence | Before repair | Final candidate |
|---|---|---|
| Uninterrupted cold boat, real 8-volume owner, 120 Hz physics / 60 Hz frames | ★ RED: remains in nearshore obstruction within original 12 s bound | ★★★★★ Enters descent to 150 m in 4.27 s; no body correction |
| Same cold boat, 120 Hz physics / 30 Hz frames | ★ Prior native long trip replanned after manual takeover | ★★★★★ Enters descent to 150 m in 4.33 s; only floating-point correction |
| Low-speed accepted-frame rejection, 0.28 m/s request | ★ RED: 2 s, zero accepted displacement, still traveling; each correction only 0.00467 m | ★★★★★ Both cadences stop at 0.5 s, retain midwater, report zero velocity |
| Open-water 0.28 m/s control | — | ★★★★★ Both cadences travel 0.56 m in 2 s without false pause |
| Full 60 Hz arrival and observation suite | ★ Real-owner fixture exposed the route blocker | ★★★★★ 14/14; midwater 123.5 s, slope 167.6 s, hadal 338.5 s |
| Full 30 Hz arrival and observation suite | — | ★★★★★ 14/14; midwater 123.8 s, slope 167.9 s, hadal 339.0 s |

Both full arrival runs use 120 Hz physics and the real compiled rock catalogue/body owner at the selected frame cadence. The original 300-second travel allowance plus 15 seconds per planned voluntary stop is unchanged. All route continuity, approach-speed, cancellation, natural animal framing/selection, three viewport, giant squid distance and frilled shark side-view assertions remain. Low-speed negative tests explicitly seed a previously accepted contact pose and hold its orientation while requesting small upward movement against the actual body/surface bound. This is an isolated feedback test, not a purported normal route or a stubbed collision result. The independent cold-boat journeys do not reposition the player.

`deepsea-lifecycle` and `deepsea-guide` retain their lightweight lifecycle IO fixtures and now dispatch the actual frame-end hook each frame. They do not claim physical route acceptance; `deepsea-contact` and `deepsea-arrival` provide that evidence. Final lifecycle 11/11, resumable guide 7/7, trench geometry 16/16, deepsea, deepsea-speed, trench-ground-contact and diver-contact are green.

The initial historical `diver-envelope-contract` run was 11/12: its whole-world v43 archive identity assertion rejected the independently authorized turtle mesh change. A separate fixture repair now passes 14/14 on the final rebuilt archive, retaining every diver proof and byte-exact comparison of all 507 non-turtle batches, 3,725 nodes and contact metadata. Only the two original turtle LOD buffers and their consequent packing offsets may change, and both must match their current constructors. Twelve negative controls reject unrelated changes. The original RED remains recorded in `cpu-fixture-repair/diver-envelope-contract-baseline-red.json`; scope and final receipts are documented in `DIVER-ENVELOPE-SCOPE-REPAIR.md`.

## Reproduction and receipts

```sh
node tests/parity/deepsea-contact.cjs
OCEAN_GUIDE_FRAME_HZ=60 node tests/parity/deepsea-arrival.cjs
OCEAN_GUIDE_FRAME_HZ=30 node tests/parity/deepsea-arrival.cjs
node --require ./qa/parity/v01845-turtle/cpu-fixture-repair/v44-source-preload.cjs tests/parity/deepsea-contact.cjs
node --require ./qa/parity/v01845-turtle/cpu-fixture-repair/guide-pre-stall-preload.cjs tests/parity/deepsea-contact.cjs
```

The final two commands deliberately replay RED, respectively exact v44 source/archive and the exact candidate before the low-speed meter. They never write production files. The latter source SHA-256 is `dbbc78b566254d6ca9dd3ff746b1017caf37de30eab4096be62f7689368a50e4`.

All logs, full arrival receipts and source/test hashes are retained under `qa/parity/v01845-turtle/cpu-fixture-repair/`. The original blocker and fixture repair history remains in `REPAIR-AND-BLOCKER.md`; final records are `guide-contact-final-green.log`, `guide-low-speed-replay-red.log`, `guide-contact-v44-red.log`, `arrival-120-{30,60}-final-green.{json,log}` and `guide-final-manifest.json`. This child ran no browser, GPU, world build, commit, push or deployment. CPU evidence is not a native visual, frame-rate or physical phone claim.

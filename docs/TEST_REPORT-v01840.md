# 0.18.40 — entry fallback, fin coverage and measured reef attachment

This increment continues the realism/contact/ecology/automatic-quality goal. It is not full photoreal, commercial-quality, physical-phone or battery acceptance. The public baseline is `cffbc44761ed53b1f1af58a3da7a13cf40bdef57` (0.18.39). Receipts below live under `qa/parity/v01840-realism/` unless stated otherwise.

## Entry and the reported audio stall

The user's original inaccessible tab was not reproduced. Current public 0.18.39 has no audio preparation before entry; its 10 desktop/touch audio-fault cases passed, and the user's actual Chrome reached the underwater HUD and was left paused. That establishes a working entry, not a proven cause for the older stuck tab.

Candidate testing uncovered and fixed a separate real fallback failure: the native Renderer generated the legacy branching forms without the compiler's `SCULPTED_CORAL`, consumed a different random sequence, and correctly failed the attachment replay check. `native-growth-diagnostic.json` records that RED; supplying the same authored forms restored the exact content stamp and random seed. The final loader fetches those forms only if streamed and archived scenes both fail, bounds the body to 4 MiB and the request/body to 15 seconds, and uses the existing recoverable error UI. The portable build includes the same data URL. Temporary forms and fan source geometry are released after upload; aquarium construction also clears its fan cache.

Final actual native Chrome results:

- `entry-compiled-final.json`: 10/10 desktop/touch cases, 54 checks. Normal, pre-gesture audio stall, constructor failure, pending suspend and pending music all allow entry and normal swimming; no audio constructor or music request precedes the activating start gesture.
- `entry-archive-final.json`: actual full-archive fallback passes desktop/touch entry and swimming. The measured 25,277,709-byte archive fits the explicit 26 MiB compressed guard; the 80 MiB decoded guard remains.
- `entry-procedural-final.json`: actual Renderer fallback passes both profiles, replays all 596 growth records, and retains neither authored-form data nor fan construction cache. Local diagnostic boot times were 4.604/4.493 seconds, not internet or physical-phone timing.
- `aquarium-cache-lifecycle.json`: actual viewer frames, released cache, seed preservation, retained world traits, clean GL and repeated visits without new GPU batches pass in both fresh profiles. Ecology eligibility is a declared fixture.
- `scene-loading-efficiency.log`: 6/6 streaming/deduplication/bounded-body checks. `reef-growth-pack-final.log`: five actual isolated pack-pipeline mutation cases pass.

## Fin and geometry evidence

`fin-coverage-red.json` reproduced 154 failures of 728 actual compiled-attribute checks; `fin-coverage-green.json` passes 728/728 across real material-6 fins, kinds 1/11 and 0/2/4 samples. Only the artificial coverage holes are removed; pigment, backlighting and global MSAA remain. The earlier actual desktop/touch fish views are retained. No subsequent shader change was made.

The fourth foliose/fan form passes `reef-colony-art4-geometry-green.json` (69/69), including zero non-adjacent leaf triangle crossings at all three LODs. Authoring envelopes are 7,440/2,984/1,476 triangles for each foliose variant and 28,734/4,548/1,860 for the shared fan. The same two hero and nine cliff fans gain four shared LOD batch headers, not new actors.

Earlier rejected shape previews, failed fit builds, cross-engine REDs and pair-level wreck diagnostics remain in the QA directory. They are not accepted release evidence.

## Final scene integrity and contact

The final build is source SHA `6861c9d2e9d3748c78070f496ac81a420ced47a79998abd4911ef14bb05a7cb5`, archive SHA `d677fd8f139e3c20bd9c390341fea075b30a80ecdcd49b7df2acaba76a29d538`, index SHA `97151d7926e70a0737311c4b71baa5d1007316a1b4b06d88e0dbe909baeaa8de`.

- `resource-audit-final.json`: 9/9. 509 batches, 3,725 nodes, 458 shared meshes, 185 chunks. Exactly 23 changed tissue batches, 408 recorded growth fits and two exact deck translations. Other nodes, animals, habitats and all 835 rock/island contact instances remain exact.
- `coral-root-compiled-final.json`: 6/6. All 1,338 actual LOD root witnesses have positive-area attachment to every potentially co-visible substrate LOD at four quality scales. All 1,338 crowns clear the actual substrate oracle; zero unresolved contacts. Nine genuinely detached real-geometry controls are rejected.
- Three source-enumerated cliff actors alone use the measured <=4.6 m horizontal exception; other 593 replay targets retain 3.3/2.5 m limits. The two wreck translations are exact 0.35/0.40 m corrections outside the replay. Full identity, scale, genes/tint and the other 18 wreck actors remain protected.
- `growth-replay-guards.json`: 30/30; `root-wreck-exception-guards.json`: 15/15; resource exception guards: 21/21. These checks reject altered identities, tiny destination changes and third exceptions without weakening contact predicates.
- Final `growth-engine-replay.json`: actual construction replays 596 actors in Node and WebKit. Maximum final pose arithmetic difference is 1.7764e-15. Actual fan Float32 attributes match exactly across engines. The 1e-10 pose validation precision does not relax raw geometry or source fingerprints.

The costly placement search runs offline. Live fallback validates every input before applying the precomputed record. `scene_inputs.cjs` binds generator input bytes, replay and archive; mid-pack source/archive/replay mutations are rejected. The builder is not an atomic multi-file publisher.

## Actual visuals and remaining quality gap

`current-colony-desktop-views.json` and `current-colony-touch-views.json` contain 36 actual complete-world captures: near, oblique, back, middle, far and root for both leaf variants and the fan. They verify final HTTP source/index hashes, actual actors, production shaders, submitted geometry/LOD, static ray visibility and clean GL. Touch is desktop emulation.

These are explicitly supplemental cameras centred on final poses. The original immutable-baseline camera comparison remains failed in `static-visibility-desktop-final.json`: 9/18 current views are obstructed or insufficient, predominantly by neighbouring colonies. New cameras do not erase those failures or support same-camera improvement claims. The final current-index assertion was added after the desktop run; an independent hash check confirms all 18 existing desktop captures already used the exact final current index. Touch ran with that assertion enabled.

Independent `visual-final-review.md` reviewed all 36 images. It found no demonstrated new severe functional/contact/exploded-geometry defect blocking this limited entry/fin/attachment increment. It did **not** accept the overall realism target: repeated thin plates, sharp inner cuts, dark cup-like bases, perceived floating from some angles and regular wire-like fan openings remain visible. Geometric attachment is not proof that contact looks convincing.

## Natural automatic-quality cost

Four serialized native Chrome runs use fresh contexts, ordinary start, 30 seconds forward and 30 seconds back, unchanged default automatic quality and real streaming. No concurrent build or other GPU test ran. Files are `swim-{baseline,current}-{desktop,touch}-final.json`. All pass with zero page/WebGL errors or context loss. One or two pending final GPU queries per run remain explicitly excluded.

| Actual observation | 0.18.39 | 0.18.40 | Interpretation |
|---|---:|---:|---|
| Desktop mean GPU elapsed | 11.60 ms | 11.81 ms | ★ Recorded; no demonstrated GPU saving |
| Desktop GPU p95 | 19.58 ms | 19.27 ms | ★ Single route per version |
| Touch-profile mean GPU elapsed | 4.60 ms | 5.03 ms | ★ Recorded added mean work |
| Touch-profile GPU p95 | 7.45 ms | 9.28 ms | ★ Tail cost remains a concern for real phones |
| Desktop submission-interval p95 | 18.40 ms | 18.20 ms | ★ JS submission, not displayed FPS |
| Touch submission-interval p95 | 17.70 ms | 17.70 ms | ★ JS submission, not displayed FPS |

Both versions kept scale 1 during the two swimming legs, then scale 0.935 after settlement; desktop quality 2 and touch quality 1 remained. The approximately 0.75-second report-collection/settlement holds are retained and must not be presented as ordinary swimming frames. These are single natural routes on one Apple M3 Max GPU, not isolated geometry benchmarks or statistical proof of equivalence. This increment does not establish lower total GPU load, universal smoothness or phone battery savings.

## Review and delivery boundary

Independent Standards and Spec review are required against the final pinned candidate before commit. Public delivery must separately verify the exact Pages commit, every manifest hash, ordinary desktop/touch start and the strict optional-audio suite. A successful local test or push is not deployment evidence. The full original goal remains active, including unfinished animal anatomy, rock silhouettes, convincing tissue/contact lighting and physical-device performance.

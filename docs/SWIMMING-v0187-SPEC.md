# Swimming reliability — 0.18.7

Continuation of the user's desktop and phone black flashes, stutter and automatic quality request. Baseline: `1449c0f` (0.18.6). Keep the existing deeper trench, fauna, pointer/tap observation and free swimming.

Acceptance seams are the existing rendered canvas, streamed-region fetch boundary, native keyboard events, and voyage save/load. Continue the established AskMatt implementation and regression workflow.

- A failed resize allocation must retain the last viable drawing targets and canvas dimensions, release incomplete candidates and avoid retrying every frame. A successful replacement still commits immediately before drawing; pending terrain never clears the displayed frame.
- Region headers and compressed response bodies have a 12-second deadline. Failed chunks get at most three automatic attempts with a two-second backoff. A visible retry action restarts required failures. Leaving a failed region restores the last complete swimming position without losing discoveries or photos.
- Pending regional requests have one completion/error observer per job, not one new observer per mesh per rendered frame. Dispose cancels network and queued work.
- A lost WebGL context presents a readable recovery screen, accurate save result, export rescue and a low-power restart. Low-power restart keeps automatic resolution enabled. It does not promise transparent GPU recovery or that every reported black flash is reproduced.
- Focused native controls retain Space/Enter/editing behavior; the canvas retains gameplay shortcuts.
- Corrupt primary voyage data must not replace a valid backup. A failed optional backup write must not prevent an otherwise successful primary save; actual primary failure remains visible.

Validate CPU fault cases, native desktop and simulated-touch browser recovery, resize presentation, real region request failure/retry, existing deep-sea selection and applicable regressions. Publish only after review and verify Pages commit plus public asset hashes and playable boot. Physical phones and long-duration thermal performance remain separate evidence.

Cross-tab stale progress writes, journal backups, crash-atomic photo imports and the wider commercial completion checklist remain open work; this release does not mark commercial readiness complete.

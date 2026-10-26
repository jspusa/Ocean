# First admission recovery — v0.18.17

Scope: complete the in-memory Stage A boundary where the first host or approved guest `joined` response is lost. This does not implement persistent identity, a public backend, or the multiplayer frontend.

The pre-agreed test seams are real HTTP, WebSocket and TCP transport. Tests must not read or write the room authority's internal state. The TCP proxy may drop transport bytes after hello. Each behavior is developed RED → GREEN.

## Contract

- Every initial `create` and `request` includes a private 32-byte cryptographic `admissionNonce` encoded as 43 base64url characters. The client retains the exact initial request until joined is received. It is not a name, room identifier, URL parameter, log field, or save field.
- On an uncertain outcome, close the old socket and send `{type:'recover', admission:<exact original create/request>}` over a new connection. Recovery never creates a room, duplicates an application, or bypasses approval. Unknown, changed, expired, cancelled, denied and confirmed requests return `admission_invalid` without room state.
- The proof is bound to operation, protocol, content version, exact name, target room where present, and nonce. Server records only SHA-256 digests, not nonce plaintext. Initial reuse of an occupied nonce returns `admission_used`; clients must never resend initial create/request after an uncertain result. A new deliberate intent uses a fresh nonce.
- Waiting applications survive transport loss only until their original `pendingTtlMs` deadline. Recovering pending transfers that same request to the new socket and returns only pending/requestId. It sends no duplicate join-request or snapshot. Explicit `cancel` on the current pending socket revokes it and notifies the host; closing transport is no longer cancellation.
- Approval starts one fixed `resumeGraceMs` recovery window, separately from the pending deadline. Late approval therefore gets the full initial joined recovery window. Approval while the applicant is disconnected is allowed, but reserves only the same one guest seat; the host sees its disconnected state. Host creation starts its fixed window when created. Recovery never extends either window.
- Each member recovery rotates resume capability, increments generation and replaces the old socket, with the same snapshot and presence rules as resume. A late close or operation on the replaced socket cannot affect its replacement.
- After receiving joined, save the new capability/generation and immediately confirm. Confirm or the first operation admitted by current socket/epoch/generation/sequence revokes both initial-admission and resume proofs. A normal resume using the current capability also retires initial admission proof. Lost confirm acknowledgements remain recoverable through the already received capability, not through revoked initial proof.
- Closing visits rejects pending applications but does not revoke already approved members. Rejection, cancellation, pending expiry, member departure, host departure/expiry and room closure revoke the corresponding admission authority. Third-party requests cannot claim another request's seat. Version mismatches cannot read or change its state.
- A bounded global admission registry holds no more than `maxRooms * (maxPendingPerRoom + 2)` records, including short-lived terminal nonce tombstones. Each record has a fixed expiry and no retry history. Capacity failure returns `recovery_full` before any room/application allocation. Sweep reclaims expired records. Existing message/connection/payload limits, heartbeat and slow-consumer handling apply to recovery.

## Required evidence

Real TCP loss of initial host joined, initial approved guest joined, repeated retry joined, and pending response; same room/member/request identity visible through public messages. Isolation for altered nonce/name/type/room/version, host approval/rejection, cancel/visits/room closure, third member, confirmed or current-capability-resumed admission. Fixed waiting/approval recovery deadlines and bounded record exhaustion/reclamation. Existing real slow-consumer, handshake, size and flood tests remain green.

Record individual red/green output under `qa/parity/v01817-admission-*`. Parent agent performs independent standards/spec review and repository delivery; this delegated change does not commit or deploy.

## Local evidence (2026-10-26)

- `npm test --prefix server`: 49/49 passed, including real TCP/HTTP/WebSocket and CLI subprocess tests; approximately 2.4 seconds in `qa/parity/v01817-admission-integration-green.log`.
- `npm run check --prefix server`: passed in `qa/parity/v01817-admission-check.log`; `git diff --check -- server` passed.
- Seven behavioral RED → GREEN slices: `host`, `guest`, `pending`, `late-approval`, `cancel`, `revoke`, `expiry`, each saved as `qa/parity/v01817-admission-<slice>-red.log` and `-green.log`.
- Additional isolation, confirmation/current-capability recovery, unknown/expired recovery and bounded terminal-record checks: `qa/parity/v01817-admission-boundaries.log`.
- The first integration run retained one obsolete expectation that disconnect cancels pending; `qa/parity/v01817-admission-integration-first.log` preserves that failure. Its test now verifies disconnected pending still occupies the limit and explicit recovered cancellation frees it. A preliminary revocation run did not wait for the server's TCP close event and was already green; preserved separately as `v01817-admission-revoke-preliminary-green.log`, not counted as RED evidence.
- No renderer, browser/GPU run, public backend, paid service or frontend change is part of this scope. Parent performs independent reviews and final version/deployment reporting.

- Independent Spec/security review initially found one test-only gap: the confirm-ack-loss scenario could not prove normal resume itself revokes an unconfirmed admission. Added a separate public WebSocket test with no prior confirm/operation; the reviewer verified the exact requirement is now covered, with no remaining findings. No confirmed implementation/security blocker was found. Parent still owns the separate Standards review and whole-release review.

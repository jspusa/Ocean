/* Temporary room transport. Credentials never enter a voyage, URL or public snapshot. */
const OceanRoomClient = (() => {
 'use strict';
 const PROTOCOL = 1;
 const PRESETS = { social: ['hello', 'thanks', 'goodbye'], navigation: ['follow', 'wait', 'return'], discovery: ['found', 'look', 'help'] };
 const presetOK = m => Object.hasOwn(PRESETS, m.category) && PRESETS[m.category].includes(m.preset);
 const errors = new Set(['invalid_message', 'invalid_pose', 'invalid_preset', 'version_mismatch', 'not_admitted', 'already_pending', 'host_only', 'stale_session', 'stale_sequence', 'resume_invalid', 'admission_invalid', 'admission_used', 'recovery_full', 'room_unavailable', 'host_unavailable', 'room_full', 'visits_closed', 'server_full', 'pending_full', 'request_unavailable', 'preset_rate_limited', 'rate_limited']);
 const reasons = new Set(['left', 'host_left', 'host_disconnected', 'resume_expired', 'host_rejected', 'visits_closed', 'room_full', 'request_expired', 'server_shutdown']);
 const copy = value => JSON.parse(JSON.stringify(value));
 const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
 const exact = (value, keys) => record(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
 const text = (value, max = 128) => typeof value === 'string' && value.length > 0 && value.length <= max;
 const nameOK = value => text(value, 24) && !!value.trim() && !/[\p{Cc}\p{Cf}]/u.test(value);
 const integer = value => Number.isSafeInteger(value) && value > 0;
 const capability = value => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
 const finite = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
 const poseOK = value => exact(value, ['position', 'yaw', 'pitch', 'tool', 'paused']) && Array.isArray(value.position) && value.position.length === 3 &&
  finite(value.position[0], -20000, 20000) && finite(value.position[1], -12000, 50) && finite(value.position[2], -20000, 20000) &&
  finite(value.yaw, -Math.PI, Math.PI) && finite(value.pitch, -Math.PI / 2, Math.PI / 2) &&
  ['observe', 'feed', 'pen', 'camera', 'touch', 'grab', 'partner'].includes(value.tool) && typeof value.paused === 'boolean';
 const memberOK = member => exact(member, ['id', 'name', 'role', 'generation', 'connected', 'pose']) && text(member.id) && nameOK(member.name) &&
  ['host', 'guest'].includes(member.role) && integer(member.generation) && typeof member.connected === 'boolean' && (member.pose === null || poseOK(member.pose));
 const requestOK = request => exact(request, ['requestId', 'name', 'expiresAt']) && text(request.requestId) && nameOK(request.name) && finite(request.expiresAt, 0, Number.MAX_SAFE_INTEGER);
 function joinedOK(message) {
  if (!exact(message, ['type', 'protocol', 'contentVersion', 'roomId', 'roomEpoch', 'memberId', 'role', 'generation', 'resumeToken', 'snapshot']) ||
   message.protocol !== PROTOCOL || !text(message.contentVersion) || !text(message.roomId) || !text(message.roomEpoch) || !text(message.memberId) ||
   !['host', 'guest'].includes(message.role) || !integer(message.generation) || !capability(message.resumeToken)) return false;
  const s = message.snapshot;
  if (!exact(s, message.role === 'host' ? ['visitsOpen', 'members', 'pending'] : ['visitsOpen', 'members']) || typeof s.visitsOpen !== 'boolean' ||
   !Array.isArray(s.members) || s.members.length < 1 || s.members.length > 2 || !s.members.every(memberOK) ||
   new Set(s.members.map(m => m.id)).size !== s.members.length || s.members.filter(m => m.role === 'host').length !== 1) return false;
  const self = s.members.find(m => m.id === message.memberId);
  return !!self && self.role === message.role && self.generation === message.generation && self.connected &&
   (message.role !== 'host' || Array.isArray(s.pending) && s.pending.length <= 4 && s.pending.every(requestOK) && new Set(s.pending.map(r => r.requestId)).size === s.pending.length);
 }
 function address(endpoint) {
  try {
   if (typeof endpoint !== 'string' || /[\s\u0000-\u001f\u007f?#]/.test(endpoint) || /^wss?:\/\/[^/]*@/i.test(endpoint)) return null;
   const u = new URL(endpoint), loopback = u.hostname === 'localhost' || u.hostname === '[::1]' || /^127(?:\.\d{1,3}){3}$/.test(u.hostname);
   if (u.username || u.password || !['', '/', '/v1'].includes(u.pathname) || u.protocol !== 'wss:' && !(u.protocol === 'ws:' && loopback)) return null;
   return u.origin + '/v1';
  } catch (_) { return null; }
 }
 function create(options = {}) {
  const Socket = options.WebSocket || globalThis.WebSocket, random = options.crypto || globalThis.crypto, url = address(options.endpoint);
  const version = options.contentVersion;
  let state = { status: 'idle', roomId: null, memberId: null, role: null, members: [], pending: [], visitsOpen: false, error: null };
  let socket = null, admission = null, session = null, resume = null, seq = 0, timer = null, phase = 'hello', leaving = false;
  let admissionSent = false, pendingId = null, retryTimer = null, deadlineTimer = null, controlTimer = null, retryUntil = 0, attempts = 0;
  const controls = new Map(), received = new Map();
  const snapshot = () => copy(state);
  const notify = () => { if (typeof options.onChange === 'function') options.onChange(snapshot()); };
  function nonce() {
   const bytes = new Uint8Array(32); random.getRandomValues(bytes);
   const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'; let out = '', bits = 0, value = 0;
   for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 6) { bits -= 6; out += alphabet[(value >>> bits) & 63]; } }
   if (bits) out += alphabet[(value << (6 - bits)) & 63]; return out;
  }
  function finish(error = null) {
   clearTimeout(timer); clearTimeout(retryTimer); clearTimeout(deadlineTimer); clearTimeout(controlTimer);
   timer = retryTimer = deadlineTimer = controlTimer = null; retryUntil = 0; attempts = 0; const old = socket; socket = null;
   admission = resume = session = null; admissionSent = false; pendingId = null; seq = 0; leaving = false; controls.clear(); received.clear();
   state = { status: 'closed', roomId: null, memberId: null, role: null, members: [], pending: [], visitsOpen: false, error };
   if (old) try { old.close(); } catch (_) { /* No transport error text may expose input. */ }
   notify();
  }
  function send(message) {
   if (!socket || socket.readyState !== 1) return false;
   if (socket.bufferedAmount > 65536) { disconnected(); return false; }
   try { socket.send(JSON.stringify(message)); return true; } catch (_) { disconnected(); return false; }
  }
  function settled() {
   clearTimeout(timer); clearTimeout(retryTimer); clearTimeout(deadlineTimer);
   timer = retryTimer = deadlineTimer = null; retryUntil = 0; attempts = 0;
  }
  function waitForReply(ms = 5000) { clearTimeout(timer); timer = setTimeout(disconnected, ms); }
  function disconnected(error = null) {
   if (['closed', 'idle'].includes(state.status)) return;
   clearTimeout(timer); timer = null;
   const old = socket; socket = null; if (old) try { old.close(); } catch (_) {}
   controls.clear(); clearTimeout(controlTimer); controlTimer = null;
   if (!admission && !session) return finish('connection_closed');
   if (!retryUntil) {
    retryUntil = Date.now() + 30000;
    deadlineTimer = setTimeout(() => finish('recovery_expired'), 30000);
   }
   if (Date.now() >= retryUntil || attempts >= 12) return finish('recovery_expired');
   state.status = 'reconnecting'; state.error = error;
   for (const member of state.members) member.connected = false;
   clearTimeout(retryTimer); retryTimer = setTimeout(connect, Math.min(2000, 200 * 2 ** attempts++));
   notify();
  }
  function connect() {
   retryTimer = null;
   if (['closed', 'idle'].includes(state.status)) return;
   if (retryUntil && Date.now() >= retryUntil) return finish('recovery_expired');
   phase = 'hello';
   try { socket = new Socket(url, 'ocean.v1'); } catch (_) { disconnected(); return; }
   const current = socket;
   current.addEventListener('message', event => { if (socket === current) receive(event.data); });
   current.addEventListener('error', () => {});
   current.addEventListener('close', event => {
    if (socket !== current) return;
    if ([4001, 1003, 1008, 1009].includes(event.code)) finish(event.code === 4001 ? 'session_replaced' : 'connection_rejected');
    else disconnected();
   });
   waitForReply();
  }
  function op(type, fields = {}, control = false) {
   if (!session || !socket || socket.readyState !== 1 || control && controls.size >= 4) return false;
   const message = { type, roomEpoch: session.roomEpoch, generation: session.generation, seq: ++seq, ...fields };
   if (control) {
    controls.set(seq, { type, ...fields });
    if (!controlTimer) controlTimer = setTimeout(() => disconnected('control_timeout'), 5000);
   }
   if (send(message)) return true;
   controls.delete(seq); return false;
  }
  function ordered(message) {
   const member = state.members.find(m => m.id === message.memberId);
   if (!member || !member.connected || message.generation < member.generation) return null;
   const prior = received.get(member.id);
   if (prior && (message.generation < prior.generation || message.generation === prior.generation && message.seq <= prior.seq)) return null;
   if (message.generation > member.generation) { member.generation = message.generation; member.pose = null; }
   received.set(member.id, { generation: message.generation, seq: message.seq }); return member;
  }
  function receive(raw) {
   let message;
   try { if (typeof raw !== 'string' || raw.length > 8192) throw Error(); message = JSON.parse(raw); } catch (_) { finish('invalid_server_message'); return; }
   if (!record(message) || typeof message.type !== 'string') return finish('invalid_server_message');
   if (exact(message, ['type', 'protocol', 'contentVersion']) && message.type === 'hello') {
    if (phase !== 'hello') return finish('invalid_server_message');
    if (message.protocol !== PROTOCOL || message.contentVersion !== version) return finish('version_mismatch');
    phase = 'admission';
    if (session) {
     if (!resume) {
      let proof; try { proof = nonce(); } catch (_) { return finish('random_unavailable'); }
      resume = { type: 'resume', protocol: PROTOCOL, contentVersion: version, roomId: session.roomId, memberId: session.memberId, resumeToken: session.resumeToken, resumeNonce: proof };
     }
     send(resume);
    } else if (admissionSent) send({ type: 'recover', admission });
    else if (leaving) finish();
    else { admissionSent = true; send(admission); }
    return;
   }
   if (message?.type === 'joined' && ['admission', 'pending'].includes(phase) && joinedOK(message) && message.contentVersion === version) {
    if (session && (session.roomId !== message.roomId || session.memberId !== message.memberId || session.roomEpoch !== message.roomEpoch || message.generation <= session.generation) ||
     admission && (message.role !== (admission.type === 'create' ? 'host' : 'guest') || admission.type === 'request' && message.roomId !== admission.roomId)) return finish('invalid_server_message');
    settled();
    session = { roomId: message.roomId, memberId: message.memberId, roomEpoch: message.roomEpoch, generation: message.generation, resumeToken: message.resumeToken };
    admission = resume = null; pendingId = null; seq = 0; phase = 'active'; received.clear(); controls.clear();
    state = { status: 'joined', roomId: message.roomId, memberId: message.memberId, role: message.role,
     members: copy(message.snapshot.members), pending: copy(message.snapshot.pending || []), visitsOpen: message.snapshot.visitsOpen, error: null };
    op('confirm');
    if (leaving) { state.status = 'reconnecting'; op('leave'); waitForReply(); }
    else notify(); return;
   }
   if (message?.type === 'pending' && exact(message, ['type', 'requestId']) && text(message.requestId) && admission?.type === 'request' && phase === 'admission') {
    if (pendingId && pendingId !== message.requestId) return finish('invalid_server_message');
    pendingId = message.requestId; settled(); phase = 'pending'; state.status = 'pending';
    if (leaving) { send({ type: 'cancel' }); waitForReply(); }
    else { waitForReply(35000); notify(); } return;
   }
   if (message?.type === 'error' && exact(message, ['type', 'code']) && errors.has(message.code)) {
    if (!session || state.status !== 'joined' || ['stale_session', 'stale_sequence', 'not_admitted', 'version_mismatch'].includes(message.code)) return finish(message.code);
    // Business errors carry no seq. Resolve an uncertain control from the authoritative
    // resume snapshot rather than guessing which operation failed or resending it.
    if (controls.size) return disconnected(message.code);
    state.error = message.code; notify(); return;
   }
   if (message?.type === 'rejected' && exact(message, ['type', 'reason']) && reasons.has(message.reason) && !session) return finish(message.reason);
   if (message?.type === 'cancelled' && exact(message, ['type', 'requestId']) && text(message.requestId) && leaving && !session) return finish();
   if (!session) return finish('invalid_server_message');
   if (message.type === 'ack' && exact(message, ['type', 'seq']) && integer(message.seq) && message.seq <= seq) {
    const control = controls.get(message.seq); controls.delete(message.seq);
    if (!controls.size) { clearTimeout(controlTimer); controlTimer = null; }
    if (control?.type === 'decide') state.pending = state.pending.filter(r => r.requestId !== control.requestId);
    if (control?.type === 'visits') { state.visitsOpen = control.open; if (!control.open) state.pending = []; }
    if (control) { state.error = null; notify(); } return;
   }
   if (message.type === 'join-request' && exact(message, ['type', 'requestId', 'name']) && text(message.requestId) && nameOK(message.name) && state.role === 'host') {
    if (!state.pending.some(r => r.requestId === message.requestId)) {
     if (state.pending.length >= 4) return finish('invalid_server_message');
     state.pending.push({ requestId: message.requestId, name: message.name });
    }
    notify(); return;
   }
   if (message.type === 'request-cancelled' && exact(message, ['type', 'requestId']) && text(message.requestId) && state.role === 'host') {
    state.pending = state.pending.filter(r => r.requestId !== message.requestId); notify(); return;
   }
   if (message.type === 'member-joined' && exact(message, ['type', 'member']) && memberOK(message.member) && message.member.id !== state.memberId) {
    if (state.members.some(m => m.id === message.member.id) || state.members.length >= 2) return finish('invalid_server_message');
    state.members.push(copy(message.member)); notify(); return;
   }
   if (message.type === 'member-left' && exact(message, ['type', 'memberId', 'reason']) && text(message.memberId) && reasons.has(message.reason) && message.memberId !== state.memberId) {
    state.members = state.members.filter(m => m.id !== message.memberId); received.delete(message.memberId); notify(); return;
   }
   if (message.type === 'presence' && exact(message, ['type', 'memberId', 'generation', 'connected']) && text(message.memberId) && integer(message.generation) && typeof message.connected === 'boolean') {
    const member = state.members.find(m => m.id === message.memberId);
    if (!member || message.generation < member.generation) return;
    if (message.generation > member.generation) { member.pose = null; received.delete(member.id); }
    member.generation = message.generation; member.connected = message.connected; notify(); return;
   }
   if (message.type === 'pose' && exact(message, ['type', 'memberId', 'generation', 'seq', 'pose']) && text(message.memberId) && integer(message.generation) && integer(message.seq) && poseOK(message.pose)) {
    const member = ordered(message); if (!member) return;
    member.pose = copy(message.pose); notify(); return;
   }
   if (message.type === 'preset' && exact(message, ['type', 'memberId', 'generation', 'seq', 'category', 'preset']) && text(message.memberId) && integer(message.generation) && integer(message.seq) && presetOK(message)) {
    if (ordered(message) && typeof options.onPreset === 'function') options.onPreset({ memberId: message.memberId, category: message.category, preset: message.preset }); return;
   }
   if (message.type === 'left' && exact(message, ['type', 'reason']) && message.reason === 'left') return finish();
   if (message.type === 'room-closed' && exact(message, ['type', 'reason']) && reasons.has(message.reason)) return finish(message.reason);
   finish('invalid_server_message');
  }
  function begin(type, name, roomId) {
   if (!['idle', 'closed'].includes(state.status)) return false;
   if (!url || typeof Socket !== 'function' || !random?.getRandomValues || typeof version !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/.test(version)) { state.error = 'invalid_configuration'; notify(); return false; }
   if (!nameOK(name) || type === 'request' && !text(roomId)) { state.error = 'invalid_input'; notify(); return false; }
   let proof; try { proof = nonce(); } catch (_) { finish('random_unavailable'); return false; }
   admission = { type, protocol: PROTOCOL, contentVersion: version, name, admissionNonce: proof, ...(type === 'request' ? { roomId } : {}) };
   state.error = null; state.status = 'connecting'; phase = 'hello'; leaving = false; admissionSent = false; notify();
   connect();
   return true;
  }
  return { create: name => begin('create', name), request: (name, roomId) => begin('request', name, roomId),
   decide(requestId, approve) { return !leaving && state.status === 'joined' && state.role === 'host' && typeof approve === 'boolean' && state.pending.some(r => r.requestId === requestId) && op('decide', { requestId, approve }, true); },
   visits(open) { return !leaving && state.status === 'joined' && state.role === 'host' && typeof open === 'boolean' && op('visits', { open }, true); },
   sendPose(pose) { return !leaving && state.status === 'joined' && poseOK(pose) && op('pose', { pose: copy(pose) }); },
   preset(category, preset) { return !leaving && state.status === 'joined' && presetOK({ category, preset }) && op('preset', { category, preset }); },
   leave() {
    if (leaving || ['idle', 'closed'].includes(state.status)) return false;
    leaving = true;
    if (!admissionSent && !session) finish();
    else if (state.status === 'joined') { op('leave'); waitForReply(); }
    else if (phase === 'pending' && socket?.readyState === 1) { send({ type: 'cancel' }); waitForReply(); }
    // An uncertain admission/resume must resolve before cancelling; never recreate it.
    return true;
   },
   close() { if (session) op('leave'); else if (phase === 'pending') send({ type: 'cancel' }); finish(); }, snapshot };
 }
 return Object.freeze({ create });
})();
if (typeof module === 'object' && module.exports) module.exports = OceanRoomClient;

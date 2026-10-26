import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { restoreRoomState, encodeRoomState } from './room-state.mjs';

const id = () => randomBytes(16).toString('base64url');
const capability = () => randomBytes(32).toString('base64url');
export const PRESETS = Object.freeze({ social: Object.freeze(['hello', 'thanks', 'goodbye']), navigation: Object.freeze(['follow', 'wait', 'return']), discovery: Object.freeze(['found', 'look', 'help']) });
const tools = new Set(['observe', 'feed', 'pen', 'camera', 'touch', 'grab', 'partner']);
const finite = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
function validPose(pose) {
  return pose && typeof pose === 'object' && Object.keys(pose).length === 5 &&
    Array.isArray(pose.position) && pose.position.length === 3 &&
    finite(pose.position[0], -20000, 20000) && finite(pose.position[1], -12000, 50) && finite(pose.position[2], -20000, 20000) &&
    finite(pose.yaw, -Math.PI, Math.PI) && finite(pose.pitch, -Math.PI / 2, Math.PI / 2) &&
    tools.has(pose.tool) && typeof pose.paused === 'boolean';
}
const fields = {
  create: ['protocol', 'contentVersion', 'name', 'admissionNonce'],
  request: ['protocol', 'contentVersion', 'name', 'roomId', 'admissionNonce'],
  recover: ['admission'],
  cancel: [],
  resume: ['protocol', 'contentVersion', 'roomId', 'memberId', 'resumeToken', 'resumeNonce'],
  confirm: ['roomEpoch', 'generation', 'seq'],
  decide: ['roomEpoch', 'generation', 'seq', 'requestId', 'approve'],
  visits: ['roomEpoch', 'generation', 'seq', 'open'],
  pose: ['roomEpoch', 'generation', 'seq', 'pose'],
  preset: ['roomEpoch', 'generation', 'seq', 'category', 'preset'],
  leave: ['roomEpoch', 'generation', 'seq']
};
function validMessage(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message) || typeof message.type !== 'string' || !Object.hasOwn(fields, message.type)) return false;
  const required = fields[message.type];
  if (message.type === 'recover' && (!['create', 'request'].includes(message.admission?.type) || !validMessage(message.admission))) return false;
  if (Object.keys(message).length !== required.length + 1 || required.some(key => !Object.hasOwn(message, key))) return false;
  if ('admissionNonce' in message && (typeof message.admissionNonce !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(message.admissionNonce))) return false;
  if ('name' in message && (typeof message.name !== 'string' || !message.name.trim() || message.name.length > 24 || /[\p{Cc}\p{Cf}]/u.test(message.name))) return false;
  if (message.type === 'decide' && (typeof message.approve !== 'boolean' || typeof message.requestId !== 'string')) return false;
  if (message.type === 'resume' && (typeof message.resumeNonce !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(message.resumeNonce))) return false;
  if (message.type === 'visits' && typeof message.open !== 'boolean') return false;
  for (const key of ['roomId', 'memberId', 'roomEpoch', 'contentVersion']) if (key in message && (typeof message[key] !== 'string' || message[key].length > 128)) return false;
  return true;
}
const digest = value => createHash('sha256').update(value).digest();

// Transport-independent room authority. The adapter supplies send/close, never player state.
export function createRooms({ contentVersion, resumeGraceMs = 30000, pendingTtlMs = 30000, maxRooms = 32, maxPendingPerRoom = 4, store = null, leaseMs = 5000 }) {
  if (![resumeGraceMs, pendingTtlMs, maxRooms, maxPendingPerRoom, leaseMs].every(n => Number.isSafeInteger(n) && n > 0)) throw new TypeError('invalid room limits');
  const initial = store ? store.load() : null;
  let clock = Date.now();
  const now = () => (clock = Math.max(clock, Date.now()));
  const { rooms, admissions } = initial !== null ? restoreRoomState(initial, { contentVersion, maxRooms, maxPendingPerRoom, resumeGraceMs, pendingTtlMs, now: clock }) : { rooms: new Map(), admissions: new Map() };
  const peers = new Set();
  let effects = null, changed = false, failed = false, stopped = false, leaseAt = clock;
  const leaseInterval = Math.min(leaseMs, Math.max(1, Math.floor(resumeGraceMs / 3)));
  const dirty = () => { changed = true; };
  const emitSend = (peer, message) => { if (peer) effects.push(() => peer.send(message)); };
  const emitClose = (peer, code, reason) => { if (peer) effects.push(() => peer.close(code, reason)); };
  function transaction(action) {
    if (failed || stopped) return;
    effects = []; changed = false;
    try {
      const at = now();
      if (store && at - leaseAt >= leaseInterval) {
        leaseAt = at;
        for (const room of rooms.values()) for (const member of room.members.values()) if (member.peer) { member.resumeUntil = at + resumeGraceMs; dirty(); }
      }
      action();
      if (store && changed) store.commit(encodeRoomState(rooms, admissions, contentVersion, now()));
    } catch {
      effects = null; failed = true;
      // Commit may be uncertain. Never continue from the mutated in-memory authority.
      for (const peer of peers) peer.close(1011, 'storage_unavailable');
      return;
    }
    const committed = effects; effects = null;
    for (const effect of committed) effect();
  }
  const maxAdmissions = maxRooms * (maxPendingPerRoom + 2);
  const admissionKey = message => digest(message.admissionNonce).toString('hex');
  const admissionHash = message => digest(JSON.stringify(['ocean.admission.v1', message.type, message.protocol, message.contentVersion, message.name, message.roomId ?? null, message.admissionNonce]));
  function retireAdmission(record) {
    if (!record) return;
    if (record.hash || record.member || record.request) dirty();
    record.hash = null; record.member = null; record.request = null;
  }
  const error = (peer, code) => emitSend(peer, { type: 'error', code });
  function publicMember(member) {
    return { id: member.id, name: member.name, role: member.role, generation: member.generation, connected: !!member.peer, pose: member.pose ?? null };
  }
  function snapshot(room, member) {
    const state = { visitsOpen: room.visitsOpen, members: [...room.members.values()].map(publicMember) };
    if (member.role === 'host') state.pending = [...room.pending.values()].map(request => ({ requestId: request.id, name: request.name, expiresAt: request.expiresAt }));
    return state;
  }
  function closeRoom(room, reason) {
    rooms.delete(room.id); dirty();
    for (const member of room.members.values()) {
      retireAdmission(member.admission);
      const peer = member.peer;
      if (peer) { peer.member = null; peer.room = null; emitSend(peer, { type: 'room-closed', reason }); emitClose(peer, 1000, reason); }
      member.peer = null;
    }
    for (const request of room.pending.values()) {
      retireAdmission(request.admission);
      if (request.peer) { request.peer.pending = null; request.peer.room = null; }
      emitSend(request.peer, { type: 'rejected', reason }); emitClose(request.peer, 1000, reason);
    }
    room.members.clear(); room.pending.clear();
  }
  function join(room, peer, name, role, admission = null) {
    const token = capability();
    const member = { id: id(), name, role, generation: 1, resumeHash: digest(token), resumeUntil: now() + resumeGraceMs, peer, pose: null, admission }; dirty();
    if (admission) { admission.member = member; admission.until = now() + resumeGraceMs; }
    room.members.set(member.id, member);
    if (peer) { peer.member = member; peer.room = room; peer.seq = 0; }
    else member.resumeUntil = now() + resumeGraceMs;
    emitSend(peer, { type: 'joined', protocol: 1, contentVersion, roomId: room.id, roomEpoch: room.epoch, memberId: member.id, role, generation: member.generation, resumeToken: token, snapshot: snapshot(room, member) });
    return member;
  }
  // Authorization and proof revocation stay with each request type.
  function handoff(room, member, peer) {
    const previousPeer = member.peer; const token = capability();
    member.generation++; member.resumeHash = digest(token); member.peer = peer; member.resumeUntil = now() + resumeGraceMs; dirty();
    peer.member = member; peer.room = room; peer.seq = 0;
    emitClose(previousPeer, 4001, 'replaced');
    emitSend(peer, { type: 'joined', protocol: 1, contentVersion, roomId: room.id, roomEpoch: room.epoch, memberId: member.id, role: member.role, generation: member.generation, resumeToken: token, snapshot: snapshot(room, member) });
    for (const other of room.members.values()) if (other !== member) emitSend(other.peer, { type: 'presence', memberId: member.id, generation: member.generation, connected: true });
  }
  const authority = {
    connect(peer) { emitSend(peer, { type: 'hello', protocol: 1, contentVersion }); },
    message(peer, message) {
      if (!validMessage(message)) return error(peer, 'invalid_message');
      if (peer.pending && ['create', 'request', 'resume', 'recover'].includes(message.type)) return error(peer, 'already_pending');
      if (['create', 'request', 'resume'].includes(message.type) && (message.protocol !== 1 || message.contentVersion !== contentVersion)) return error(peer, 'version_mismatch');
      if (message.type === 'recover' && !peer.member && !peer.pending) {
        const original = message.admission;
        if (original.protocol !== 1 || original.contentVersion !== contentVersion) return error(peer, 'version_mismatch');
        const record = admissions.get(admissionKey(original)); const at = now();
        const room = record && rooms.get(record.roomId); const member = record?.member;
        if (!record?.hash || record.until <= at || !timingSafeEqual(record.hash, admissionHash(original)) || !room) return error(peer, 'admission_invalid');
        if (record.request) {
          const request = record.request;
          if (room.pending.get(request.id) !== request || request.expiresAt <= at) return error(peer, 'admission_invalid');
          const previousPeer = request.peer;
          request.peer = peer; peer.pending = request; peer.room = room;
          if (previousPeer) { previousPeer.pending = null; previousPeer.room = null; emitClose(previousPeer, 4001, 'replaced'); }
          emitSend(peer, { type: 'pending', requestId: request.id });
          return;
        }
        if (!member || room.members.get(member.id) !== member || (!member.peer && member.resumeUntil <= at)) return error(peer, 'admission_invalid');
        handoff(room, member, peer);
        return;
      }
      if (message.type === 'resume' && !peer.member && !peer.pending) {
        const room = rooms.get(message.roomId); const member = room?.members.get(message.memberId);
        const at = now();
        if (!member || (!member.peer && member.resumeUntil <= at) || typeof message.resumeToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(message.resumeToken)) return error(peer, 'resume_invalid');
        const proof = digest(JSON.stringify(['ocean.resume.v1', message.protocol, message.contentVersion, room.id, member.id, message.resumeToken, message.resumeNonce]));
        const current = timingSafeEqual(member.resumeHash, digest(message.resumeToken));
        const retry = member.resumeRetry && member.resumeRetry.until > at && timingSafeEqual(member.resumeRetry.hash, proof);
        if (!current && !retry) return error(peer, 'resume_invalid');
        retireAdmission(member.admission);
        if (current) member.resumeRetry = { hash: proof, until: at + resumeGraceMs };
        handoff(room, member, peer);
        return;
      }
      if (message.type === 'cancel' && peer.pending?.peer === peer) {
        const request = peer.pending; const room = peer.room;
        room.pending.delete(request.id); retireAdmission(request.admission);
        request.peer = null; peer.pending = null; peer.room = null;
        emitSend(peer, { type: 'cancelled', requestId: request.id }); emitClose(peer, 1000, 'cancelled');
        for (const member of room.members.values()) if (member.role === 'host') emitSend(member.peer, { type: 'request-cancelled', requestId: request.id });
        return;
      }
      if (peer.member) {
        if (peer.member.peer !== peer || message.roomEpoch !== peer.room.epoch || message.generation !== peer.member.generation) return error(peer, 'stale_session');
        if (!Number.isSafeInteger(message.seq) || message.seq <= peer.seq || message.seq > peer.seq + 1000) return error(peer, 'stale_sequence');
        peer.seq = message.seq;
        // A current-session operation proves joined reached this client.
        if (peer.member.resumeRetry) { peer.member.resumeRetry = null; dirty(); }
        retireAdmission(peer.member.admission);
        if (['visits', 'decide'].includes(message.type) && peer.member.role !== 'host') return error(peer, 'host_only');
      }
      if (message.type === 'create' && !peer.member) {
        const key = admissionKey(message);
        if (admissions.has(key)) return error(peer, 'admission_used');
        if (rooms.size >= maxRooms) return error(peer, 'server_full');
        if (admissions.size >= maxAdmissions) return error(peer, 'recovery_full');
        const room = { id: id(), epoch: id(), members: new Map(), pending: new Map(), visitsOpen: true };
        rooms.set(room.id, room);
        const admission = { key, hash: admissionHash(message), roomId: room.id };
        admissions.set(key, admission); dirty();
        join(room, peer, message.name, 'host', admission);
      } else if (message.type === 'request' && !peer.member && !peer.pending) {
        const key = admissionKey(message);
        if (admissions.has(key)) return error(peer, 'admission_used');
        const room = rooms.get(message.roomId);
        if (!room) return error(peer, 'room_unavailable');
        if (![...room.members.values()].some(member => member.role === 'host' && member.peer)) return error(peer, 'host_unavailable');
        if (room.members.size >= 2) return error(peer, 'room_full');
        if (!room.visitsOpen) return error(peer, 'visits_closed');
        if (room.pending.size >= maxPendingPerRoom) return error(peer, 'pending_full');
        if (admissions.size >= maxAdmissions) return error(peer, 'recovery_full');
        const admission = { key, hash: admissionHash(message), roomId: room.id, until: now() + pendingTtlMs };
        admissions.set(key, admission); dirty();
        const request = { id: id(), name: message.name, peer, expiresAt: admission.until, admission };
        admission.request = request;
        room.pending.set(request.id, request); peer.pending = request; peer.room = room;
        emitSend(peer, { type: 'pending', requestId: request.id });
        for (const member of room.members.values()) if (member.role === 'host') emitSend(member.peer, { type: 'join-request', requestId: request.id, name: request.name });
      } else if (!peer.member) error(peer, 'not_admitted');
      else if (message.type === 'confirm') emitSend(peer, { type: 'ack', seq: message.seq });
      else if (message.type === 'leave') {
        const room = peer.room; const member = peer.member;
        emitSend(peer, { type: 'left', reason: 'left' });
        if (member.role === 'host') closeRoom(room, 'host_left');
        else {
          room.members.delete(member.id); dirty(); retireAdmission(member.admission); member.peer = null; peer.member = null; peer.room = null;
          for (const other of room.members.values()) emitSend(other.peer, { type: 'member-left', memberId: member.id, reason: 'left' });
          emitClose(peer, 1000, 'left');
        }
      }
      else if (message.type === 'preset') {
        if (Object.keys(message).some(key => !['type', 'roomEpoch', 'generation', 'seq', 'category', 'preset'].includes(key))) return error(peer, 'invalid_message');
        if (typeof message.category !== 'string' || typeof message.preset !== 'string' || !Object.hasOwn(PRESETS, message.category) || !PRESETS[message.category].includes(message.preset)) return error(peer, 'invalid_preset');
        const at = now();
        const budget = peer.member.presetBudget ?? { tokens: 4, at };
        budget.tokens = Math.min(4, budget.tokens + Math.max(0, at - budget.at) * 2 / 1000); budget.at = at;
        peer.member.presetBudget = budget; dirty();
        if (budget.tokens < 1) return error(peer, 'preset_rate_limited');
        budget.tokens--;
        for (const member of peer.room.members.values()) emitSend(member.peer, { type: 'preset', memberId: peer.member.id, generation: peer.member.generation, seq: message.seq, category: message.category, preset: message.preset });
      }
      else if (message.type === 'pose') {
        if (!validPose(message.pose)) return error(peer, 'invalid_pose');
        peer.member.pose = message.pose;
        for (const member of peer.room.members.values()) if (member !== peer.member) emitSend(member.peer, { type: 'pose', memberId: peer.member.id, generation: peer.member.generation, seq: message.seq, pose: message.pose });
      }
      else if (message.type === 'visits' && peer.member.role === 'host' && typeof message.open === 'boolean') {
        peer.room.visitsOpen = message.open; dirty();
        if (!message.open) {
          for (const request of peer.room.pending.values()) {
            retireAdmission(request.admission);
            if (request.peer) { request.peer.pending = null; request.peer.room = null; }
            emitSend(request.peer, { type: 'rejected', reason: 'visits_closed' });
            emitClose(request.peer, 1000, 'visits_closed');
          }
          peer.room.pending.clear();
        }
        emitSend(peer, { type: 'ack', seq: message.seq });
      }
      else if (message.type === 'decide' && peer.member.role === 'host') {
        const request = peer.room.pending.get(message.requestId);
        if (!request || request.expiresAt <= now()) return error(peer, 'request_unavailable');
        peer.room.pending.delete(request.id); if (request.peer) request.peer.pending = null;
        if (!message.approve || peer.room.members.size >= 2) {
          const reason = message.approve ? 'room_full' : 'host_rejected';
          retireAdmission(request.admission);
          if (request.peer) request.peer.room = null;
          emitSend(request.peer, { type: 'rejected', reason });
          emitClose(request.peer, 1000, reason);
          emitSend(peer, { type: 'ack', seq: message.seq });
          return;
        }
        request.admission.request = null;
        const member = join(peer.room, request.peer, request.name, 'guest', request.admission);
        emitSend(peer, { type: 'member-joined', member: publicMember(member) });
        emitSend(peer, { type: 'ack', seq: message.seq });
      } else error(peer, 'invalid_message');
    },
    disconnect(peer) {
      if (peer.pending?.peer === peer) {
        peer.pending.peer = null;
        peer.pending = null; peer.room = null;
      }
      if (peer.member?.peer === peer) {
        peer.member.peer = null;
        peer.member.resumeUntil = now() + resumeGraceMs; dirty();
        for (const member of peer.room.members.values()) if (member !== peer.member) emitSend(member.peer, { type: 'presence', memberId: peer.member.id, generation: peer.member.generation, connected: false });
      }
    },
    sweep() {
      const at = now();
      for (const [key, record] of admissions) if (record.until <= at) { retireAdmission(record); admissions.delete(key); dirty(); }
      for (const room of rooms.values()) {
        for (const request of room.pending.values()) if (request.expiresAt <= at) {
          room.pending.delete(request.id); retireAdmission(request.admission);
          if (request.peer) { request.peer.pending = null; request.peer.room = null; }
          emitSend(request.peer, { type: 'rejected', reason: 'request_expired' }); emitClose(request.peer, 1000, 'request_expired');
          for (const member of room.members.values()) if (member.role === 'host') emitSend(member.peer, { type: 'request-cancelled', requestId: request.id });
        }
      }
      for (const room of rooms.values()) for (const member of room.members.values()) {
        if (member.resumeRetry?.until <= at) { member.resumeRetry = null; dirty(); }
        if (member.peer || member.resumeUntil > at) continue;
        if (member.role === 'host') { closeRoom(room, 'host_disconnected'); break; }
        room.members.delete(member.id); dirty(); retireAdmission(member.admission);
        for (const other of room.members.values()) emitSend(other.peer, { type: 'member-left', memberId: member.id, reason: 'resume_expired' });
      }
    },
    shutdown() { rooms.clear(); admissions.clear(); }
  };
  // Startup expiry cleanup commits before listening; a restart never renews a lease.
  if (store && initial === null) store.commit(encodeRoomState(rooms, admissions, contentVersion, now()));
  transaction(() => authority.sweep());
  if (failed) throw new Error('room_storage_unavailable');
  return {
    healthy: () => !failed && !stopped,
    connect(peer) { peers.add(peer); if (failed || stopped) return peer.close(1011, 'storage_unavailable'); transaction(() => authority.connect(peer)); },
    message(peer, message) { transaction(() => authority.message(peer, message)); },
    disconnect(peer) { transaction(() => authority.disconnect(peer)); peers.delete(peer); },
    sweep() { transaction(() => authority.sweep()); },
    shutdown() {
      if (stopped) return;
      transaction(() => { for (const peer of peers) authority.disconnect(peer); });
      stopped = true; peers.clear(); authority.shutdown();
    }
  };
}

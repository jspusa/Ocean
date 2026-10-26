import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';

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
  create: ['protocol', 'contentVersion', 'name'],
  request: ['protocol', 'contentVersion', 'name', 'roomId'],
  resume: ['protocol', 'contentVersion', 'roomId', 'memberId', 'resumeToken', 'resumeNonce'],
  confirm: ['roomEpoch', 'generation', 'seq'],
  decide: ['roomEpoch', 'generation', 'seq', 'requestId', 'approve'],
  visits: ['roomEpoch', 'generation', 'seq', 'open'],
  pose: ['roomEpoch', 'generation', 'seq', 'pose'],
  preset: ['roomEpoch', 'generation', 'seq', 'category', 'preset'],
  leave: ['roomEpoch', 'generation', 'seq']
};
function validMessage(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message) || !Object.hasOwn(fields, message.type)) return false;
  const required = fields[message.type];
  if (Object.keys(message).length !== required.length + 1 || required.some(key => !Object.hasOwn(message, key))) return false;
  if ('name' in message && (typeof message.name !== 'string' || !message.name.trim() || message.name.length > 24 || /[\p{Cc}\p{Cf}]/u.test(message.name))) return false;
  if (message.type === 'decide' && (typeof message.approve !== 'boolean' || typeof message.requestId !== 'string')) return false;
  if (message.type === 'resume' && (typeof message.resumeNonce !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(message.resumeNonce))) return false;
  if (message.type === 'visits' && typeof message.open !== 'boolean') return false;
  for (const key of ['roomId', 'memberId', 'roomEpoch', 'contentVersion']) if (key in message && (typeof message[key] !== 'string' || message[key].length > 128)) return false;
  return true;
}
const digest = value => createHash('sha256').update(value).digest();

// Transport-independent room authority. The adapter supplies send/close, never player state.
export function createRooms({ contentVersion, resumeGraceMs = 30000, pendingTtlMs = 30000, maxRooms = 32, maxPendingPerRoom = 4 }) {
  const rooms = new Map();
  const error = (peer, code) => peer.send({ type: 'error', code });
  function publicMember(member) {
    return { id: member.id, name: member.name, role: member.role, generation: member.generation, connected: !!member.peer, pose: member.pose ?? null };
  }
  function snapshot(room, member) {
    const state = { visitsOpen: room.visitsOpen, members: [...room.members.values()].map(publicMember) };
    if (member.role === 'host') state.pending = [...room.pending.values()].map(request => ({ requestId: request.id, name: request.name, expiresAt: request.expiresAt }));
    return state;
  }
  function closeRoom(room, reason) {
    rooms.delete(room.id);
    for (const member of room.members.values()) {
      const peer = member.peer;
      if (peer) { peer.member = null; peer.room = null; peer.send({ type: 'room-closed', reason }); peer.close(1000, reason); }
      member.peer = null;
    }
    for (const request of room.pending.values()) {
      request.peer.pending = null; request.peer.room = null;
      request.peer.send({ type: 'rejected', reason }); request.peer.close(1000, reason);
    }
    room.members.clear(); room.pending.clear();
  }
  function join(room, peer, name, role) {
    const token = capability();
    const member = { id: id(), name, role, generation: 1, resumeHash: digest(token), peer, pose: null };
    room.members.set(member.id, member);
    peer.member = member; peer.room = room; peer.seq = 0;
    peer.send({ type: 'joined', protocol: 1, contentVersion, roomId: room.id, roomEpoch: room.epoch, memberId: member.id, role, generation: member.generation, resumeToken: token, snapshot: snapshot(room, member) });
    return member;
  }
  return {
    connect(peer) { peer.send({ type: 'hello', protocol: 1, contentVersion }); },
    message(peer, message) {
      if (!validMessage(message)) return error(peer, 'invalid_message');
      if (peer.pending && ['create', 'request', 'resume'].includes(message.type)) return error(peer, 'already_pending');
      if (['create', 'request', 'resume'].includes(message.type) && (message.protocol !== 1 || message.contentVersion !== contentVersion)) return error(peer, 'version_mismatch');
      if (message.type === 'resume' && !peer.member && !peer.pending) {
        const room = rooms.get(message.roomId); const member = room?.members.get(message.memberId);
        const now = Date.now();
        if (!member || (!member.peer && member.resumeUntil <= now) || typeof message.resumeToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(message.resumeToken)) return error(peer, 'resume_invalid');
        const proof = digest(JSON.stringify(['ocean.resume.v1', message.protocol, message.contentVersion, room.id, member.id, message.resumeToken, message.resumeNonce]));
        const current = timingSafeEqual(member.resumeHash, digest(message.resumeToken));
        const retry = member.resumeRetry && member.resumeRetry.until > now && timingSafeEqual(member.resumeRetry.hash, proof);
        if (!current && !retry) return error(peer, 'resume_invalid');
        if (current) member.resumeRetry = { hash: proof, until: now + resumeGraceMs };
        const previousPeer = member.peer; const token = capability();
        member.generation++; member.resumeHash = digest(token); member.peer = peer;
        peer.member = member; peer.room = room; peer.seq = 0;
        previousPeer?.close(4001, 'replaced');
        peer.send({ type: 'joined', protocol: 1, contentVersion, roomId: room.id, roomEpoch: room.epoch, memberId: member.id, role: member.role, generation: member.generation, resumeToken: token, snapshot: snapshot(room, member) });
        for (const other of room.members.values()) if (other !== member) other.peer?.send({ type: 'presence', memberId: member.id, generation: member.generation, connected: true });
        return;
      }
      if (peer.member) {
        if (peer.member.peer !== peer || message.roomEpoch !== peer.room.epoch || message.generation !== peer.member.generation) return error(peer, 'stale_session');
        if (!Number.isSafeInteger(message.seq) || message.seq <= peer.seq || message.seq > peer.seq + 1000) return error(peer, 'stale_sequence');
        peer.seq = message.seq;
        // A current-session operation proves joined reached this client.
        peer.member.resumeRetry = null;
        if (['visits', 'decide'].includes(message.type) && peer.member.role !== 'host') return error(peer, 'host_only');
      }
      if (message.type === 'create' && !peer.member) {
        if (rooms.size >= maxRooms) return error(peer, 'server_full');
        const room = { id: id(), epoch: id(), members: new Map(), pending: new Map(), visitsOpen: true };
        rooms.set(room.id, room);
        join(room, peer, message.name, 'host');
      } else if (message.type === 'request' && !peer.member && !peer.pending) {
        const room = rooms.get(message.roomId);
        if (!room) return error(peer, 'room_unavailable');
        if (![...room.members.values()].some(member => member.role === 'host' && member.peer)) return error(peer, 'host_unavailable');
        if (room.members.size >= 2) return error(peer, 'room_full');
        if (!room.visitsOpen) return error(peer, 'visits_closed');
        if (room.pending.size >= maxPendingPerRoom) return error(peer, 'pending_full');
        const request = { id: id(), name: message.name, peer, expiresAt: Date.now() + pendingTtlMs };
        room.pending.set(request.id, request); peer.pending = request; peer.room = room;
        peer.send({ type: 'pending', requestId: request.id });
        for (const member of room.members.values()) if (member.role === 'host') member.peer?.send({ type: 'join-request', requestId: request.id, name: request.name });
      } else if (!peer.member) error(peer, 'not_admitted');
      else if (message.type === 'confirm') peer.send({ type: 'ack', seq: message.seq });
      else if (message.type === 'leave') {
        const room = peer.room; const member = peer.member;
        peer.send({ type: 'left', reason: 'left' });
        if (member.role === 'host') closeRoom(room, 'host_left');
        else {
          room.members.delete(member.id); member.peer = null; peer.member = null; peer.room = null;
          for (const other of room.members.values()) other.peer?.send({ type: 'member-left', memberId: member.id, reason: 'left' });
          peer.close(1000, 'left');
        }
      }
      else if (message.type === 'preset') {
        if (Object.keys(message).some(key => !['type', 'roomEpoch', 'generation', 'seq', 'category', 'preset'].includes(key))) return error(peer, 'invalid_message');
        if (!Object.hasOwn(PRESETS, message.category) || !PRESETS[message.category].includes(message.preset)) return error(peer, 'invalid_preset');
        const now = performance.now();
        const budget = peer.member.presetBudget ?? { tokens: 4, at: now };
        budget.tokens = Math.min(4, budget.tokens + (now - budget.at) * 2 / 1000); budget.at = now;
        peer.member.presetBudget = budget;
        if (budget.tokens < 1) return error(peer, 'preset_rate_limited');
        budget.tokens--;
        for (const member of peer.room.members.values()) member.peer?.send({ type: 'preset', memberId: peer.member.id, generation: peer.member.generation, seq: message.seq, category: message.category, preset: message.preset });
      }
      else if (message.type === 'pose') {
        if (!validPose(message.pose)) return error(peer, 'invalid_pose');
        peer.member.pose = message.pose;
        for (const member of peer.room.members.values()) if (member !== peer.member) member.peer?.send({ type: 'pose', memberId: peer.member.id, generation: peer.member.generation, seq: message.seq, pose: message.pose });
      }
      else if (message.type === 'visits' && peer.member.role === 'host' && typeof message.open === 'boolean') {
        peer.room.visitsOpen = message.open;
        if (!message.open) {
          for (const request of peer.room.pending.values()) {
            request.peer.pending = null;
            request.peer.send({ type: 'rejected', reason: 'visits_closed' });
            request.peer.close(1000, 'visits_closed');
          }
          peer.room.pending.clear();
        }
        peer.send({ type: 'ack', seq: message.seq });
      }
      else if (message.type === 'decide' && peer.member.role === 'host') {
        const request = peer.room.pending.get(message.requestId);
        if (!request || request.expiresAt <= Date.now()) return error(peer, 'request_unavailable');
        peer.room.pending.delete(request.id); request.peer.pending = null;
        if (!message.approve || peer.room.members.size >= 2) {
          const reason = message.approve ? 'room_full' : 'host_rejected';
          request.peer.send({ type: 'rejected', reason });
          request.peer.close(1000, reason);
          peer.send({ type: 'ack', seq: message.seq });
          return;
        }
        const member = join(peer.room, request.peer, request.name, 'guest');
        peer.send({ type: 'member-joined', member: publicMember(member) });
        peer.send({ type: 'ack', seq: message.seq });
      } else error(peer, 'invalid_message');
    },
    disconnect(peer) {
      if (peer.pending) {
        const requestId = peer.pending.id;
        peer.room.pending.delete(requestId);
        for (const member of peer.room.members.values()) if (member.role === 'host') member.peer?.send({ type: 'request-cancelled', requestId });
        peer.pending = null; peer.room = null;
      }
      if (peer.member?.peer === peer) {
        peer.member.peer = null;
        peer.member.resumeUntil = Date.now() + resumeGraceMs;
        for (const member of peer.room.members.values()) if (member !== peer.member) member.peer?.send({ type: 'presence', memberId: peer.member.id, generation: peer.member.generation, connected: false });
      }
    },
    sweep() {
      const now = Date.now();
      for (const room of rooms.values()) {
        for (const request of room.pending.values()) if (request.expiresAt <= now) {
          room.pending.delete(request.id); request.peer.pending = null; request.peer.room = null;
          request.peer.send({ type: 'rejected', reason: 'request_expired' }); request.peer.close(1000, 'request_expired');
        }
      }
      for (const room of rooms.values()) for (const member of room.members.values()) {
        if (member.resumeRetry?.until <= now) member.resumeRetry = null;
        if (member.peer || member.resumeUntil > now) continue;
        if (member.role === 'host') { closeRoom(room, 'host_disconnected'); break; }
        room.members.delete(member.id);
        for (const other of room.members.values()) other.peer?.send({ type: 'member-left', memberId: member.id, reason: 'resume_expired' });
      }
    },
    shutdown() { rooms.clear(); }
  };
}

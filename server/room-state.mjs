// Private persistence representation. It never contains sockets, raw capabilities,
// world poses or personal saves; successful recovery is tested through WebSocket.
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const identity = value => typeof value === 'string' && /^[A-Za-z0-9_-]{22}$/.test(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const time = value => Number.isSafeInteger(value) && value >= 0;
const name = value => typeof value === 'string' && value.trim() && value.length <= 24 && !/[\p{Cc}\p{Cf}]/u.test(value);
const need = valid => { if (!valid) throw new Error('invalid_room_state'); };

export function encodeRoomState(rooms, admissions, contentVersion, savedAt) {
  return {
    schema: 1, contentVersion, savedAt,
    rooms: [...rooms.values()].map(room => ({
      id: room.id, epoch: room.epoch, visitsOpen: room.visitsOpen,
      members: [...room.members.values()].map(member => ({
        id: member.id, name: member.name, role: member.role, generation: member.generation,
        resumeHash: member.resumeHash.toString('hex'), resumeUntil: member.resumeUntil,
        resumeRetry: member.resumeRetry ? { hash: member.resumeRetry.hash.toString('hex'), until: member.resumeRetry.until } : null,
        admissionKey: member.admission?.hash ? member.admission.key : null,
        presetBudget: member.presetBudget ? { ...member.presetBudget } : null
      })),
      pending: [...room.pending.values()].map(request => ({ id: request.id, name: request.name, expiresAt: request.expiresAt, admissionKey: request.admission.key }))
    })),
    admissions: [...admissions].map(([key, record]) => ({
      key, hash: record.hash?.toString('hex') ?? null, roomId: record.roomId, until: record.until,
      memberId: record.member?.id ?? null, requestId: record.request?.id ?? null
    }))
  };
}

export function restoreRoomState(document, { contentVersion, maxRooms, maxPendingPerRoom, resumeGraceMs, pendingTtlMs, now }) {
  need(exact(document, ['schema', 'contentVersion', 'savedAt', 'rooms', 'admissions']));
  need(document.schema === 1 && document.contentVersion === contentVersion && time(document.savedAt) && document.savedAt <= now);
  need(Array.isArray(document.rooms) && document.rooms.length <= maxRooms);
  need(Array.isArray(document.admissions) && document.admissions.length <= maxRooms * (maxPendingPerRoom + 2));
  const deadline = (value, ttl) => time(value) && value <= document.savedAt + ttl;
  const rooms = new Map(), admissions = new Map(), identifiers = new Set();
  function unique(value) { need(identity(value) && !identifiers.has(value)); identifiers.add(value); }
  for (const row of document.admissions) {
    need(exact(row, ['key', 'hash', 'roomId', 'until', 'memberId', 'requestId']));
    need(hash(row.key) && !admissions.has(row.key) && (row.hash === null || hash(row.hash)) && identity(row.roomId) && time(row.until));
    need((row.memberId === null || identity(row.memberId)) && (row.requestId === null || identity(row.requestId)));
    need(row.hash === null ? row.memberId === null && row.requestId === null : (row.memberId === null) !== (row.requestId === null));
    need(deadline(row.until, row.requestId ? pendingTtlMs : row.memberId ? resumeGraceMs : Math.max(resumeGraceMs, pendingTtlMs)));
    admissions.set(row.key, { key: row.key, hash: row.hash === null ? null : Buffer.from(row.hash, 'hex'), roomId: row.roomId, until: row.until, member: null, request: null });
  }
  const references = new Set();
  function admission(key, roomId) {
    need(hash(key) && !references.has(key));
    const value = admissions.get(key); need(value?.hash && value.roomId === roomId);
    references.add(key); return value;
  }
  for (const row of document.rooms) {
    need(exact(row, ['id', 'epoch', 'visitsOpen', 'members', 'pending']));
    unique(row.id); unique(row.epoch); need(typeof row.visitsOpen === 'boolean');
    need(Array.isArray(row.members) && row.members.length >= 1 && row.members.length <= 2 && row.members.filter(m => m?.role === 'host').length === 1);
    need(Array.isArray(row.pending) && row.pending.length <= maxPendingPerRoom && (row.visitsOpen || row.pending.length === 0));
    const room = { id: row.id, epoch: row.epoch, visitsOpen: row.visitsOpen, members: new Map(), pending: new Map() };
    rooms.set(room.id, room);
    for (const m of row.members) {
      need(exact(m, ['id', 'name', 'role', 'generation', 'resumeHash', 'resumeUntil', 'resumeRetry', 'admissionKey', 'presetBudget']));
      unique(m.id); need(name(m.name) && ['host', 'guest'].includes(m.role) && Number.isSafeInteger(m.generation) && m.generation > 0 && hash(m.resumeHash) && deadline(m.resumeUntil, resumeGraceMs));
      need(m.resumeRetry === null || exact(m.resumeRetry, ['hash', 'until']) && hash(m.resumeRetry.hash) && deadline(m.resumeRetry.until, resumeGraceMs));
      need(m.presetBudget === null || exact(m.presetBudget, ['tokens', 'at']) && Number.isFinite(m.presetBudget.tokens) && m.presetBudget.tokens >= 0 && m.presetBudget.tokens <= 4 && time(m.presetBudget.at) && m.presetBudget.at <= document.savedAt);
      const member = { ...m, resumeHash: Buffer.from(m.resumeHash, 'hex'), resumeRetry: m.resumeRetry ? { hash: Buffer.from(m.resumeRetry.hash, 'hex'), until: m.resumeRetry.until } : null, peer: null, pose: null, admission: null };
      delete member.admissionKey;
      if (m.admissionKey !== null) { member.admission = admission(m.admissionKey, room.id); member.admission.member = member; }
      room.members.set(member.id, member);
    }
    for (const p of row.pending) {
      need(exact(p, ['id', 'name', 'expiresAt', 'admissionKey'])); unique(p.id); need(name(p.name) && deadline(p.expiresAt, pendingTtlMs));
      const request = { id: p.id, name: p.name, expiresAt: p.expiresAt, peer: null, admission: admission(p.admissionKey, room.id) };
      need(request.admission.until === request.expiresAt);
      request.admission.request = request; room.pending.set(request.id, request);
    }
  }
  for (const row of document.admissions) {
    const record = admissions.get(row.key);
    need((record.member?.id ?? null) === row.memberId && (record.request?.id ?? null) === row.requestId);
  }
  return { rooms, admissions };
}

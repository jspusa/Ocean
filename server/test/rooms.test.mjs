import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';
import { createOceanServer } from '../server.mjs';

const origin = 'https://jspusa.github.io';
const contentVersion = 'test-world-1';
const handshake = { protocol: 1, contentVersion };

async function fixture(t, options = {}) {
  const app = createOceanServer({ allowedOrigins: [origin], contentVersion, ...options });
  await app.listen(0, '127.0.0.1');
  t.after(() => app.close());
  const url = `http://127.0.0.1:${app.address().port}`;
  async function connect(path = '/v1', wsOptions = {}, endpoint = url) {
    const ws = new WebSocket(endpoint.replace('http:', 'ws:') + path, 'ocean.v1', { origin, ...wsOptions });
    const messages = [];
    const waiters = new Set();
    const closed = once(ws, 'close');
    closed.catch(() => {});
    ws.on('error', () => {});
    ws.on('message', raw => {
      messages.push(JSON.parse(raw.toString()));
      for (const notify of waiters) notify();
    });
    await once(ws, 'open');
    t.after(() => ws.terminate());
    const peer = {
      ws, messages, closed,
      send(data) { ws.send(JSON.stringify(data)); },
      async next(type, predicate = () => true) {
        const receive = () => {
          const index = messages.findIndex(m => m.type === type && predicate(m));
          return index < 0 ? undefined : messages.splice(index, 1)[0];
        };
        const found = receive();
        if (found) return found;
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => { waiters.delete(notify); reject(new Error(`Timed out waiting for ${type}`)); }, 1500);
          function notify() {
            const value = receive();
            if (value) { clearTimeout(timer); waiters.delete(notify); resolve(value); }
          }
          waiters.add(notify);
        });
      },
      op(type, fields = {}) {
        peer.send({ type, roomEpoch: peer.session.roomEpoch, generation: peer.session.generation, seq: ++peer.seq, ...fields });
      },
      async joined() {
        peer.session = await peer.next('joined'); peer.seq = 0; return peer.session;
      }
    };
    await peer.next('hello');
    return peer;
  }
  async function host(name = 'Host') {
    const peer = await connect(); peer.send({ type: 'create', ...handshake, name }); await peer.joined(); return peer;
  }
  return { app, url, connect, host };
}

// This proxy interrupts real transport bytes after hello; it never sees room internals.
async function lossyProxy(t, upstreamUrl) {
  const upstreamPort = Number(new URL(upstreamUrl).port);
  const sockets = new Set();
  let dropped, resolveDrop;
  const proxy = net.createServer(downstream => {
    const upstream = net.connect(upstreamPort, '127.0.0.1');
    sockets.add(downstream); sockets.add(upstream);
    for (const socket of [downstream, upstream]) {
      socket.on('error', () => {});
      socket.on('close', () => { sockets.delete(socket); downstream.destroy(); upstream.destroy(); });
    }
    downstream.pipe(upstream);
    upstream.on('data', bytes => {
      if (resolveDrop) {
        const resolve = resolveDrop; resolveDrop = null;
        downstream.destroy(); upstream.destroy();
        resolve(bytes.length);
      } else downstream.write(bytes);
    });
  });
  await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise(resolve => proxy.close(resolve));
  });
  return {
    url: `http://127.0.0.1:${proxy.address().port}`,
    dropNextResponse() { dropped = new Promise(resolve => { resolveDrop = resolve; }); },
    loss() { return dropped; }
  };
}

test('HTTP health and real WebSocket creation expose a private host capability', async t => {
  const f = await fixture(t);
  const health = await fetch(f.url + '/health');
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  const host = await f.host();
  assert.equal(host.session.role, 'host');
  assert.match(host.session.resumeToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(host.session.snapshot.members.length, 1);
  assert.equal(host.session.snapshot.members[0].name, 'Host');
  assert.equal(JSON.stringify(host.session.snapshot).includes(host.session.resumeToken), false);
});

test('a requester receives no room snapshot until the host approves', async t => {
  const f = await fixture(t); const host = await f.host(); const guest = await f.connect();
  guest.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Guest' });
  const pending = await guest.next('pending');
  assert.deepEqual(Object.keys(pending).sort(), ['requestId', 'type']);
  const request = await host.next('join-request');
  assert.equal(request.name, 'Guest');
  guest.send({ type: 'pose', roomEpoch: host.session.roomEpoch, generation: 1, seq: 1, pose: {} });
  assert.equal((await guest.next('error')).code, 'not_admitted');
  host.op('decide', { requestId: request.requestId, approve: true });
  await host.next('ack');
  const joined = await guest.joined();
  assert.equal(joined.role, 'guest');
  assert.equal(joined.snapshot.members.length, 2);
  assert.equal(joined.snapshot.members[0].id, host.session.memberId);
  assert.equal(JSON.stringify(joined).includes(host.session.resumeToken), false);
  assert.equal((await host.next('member-joined')).member.id, joined.memberId);
});

test('host rejection closes the pending client and does not admit them', async t => {
  const f = await fixture(t); const host = await f.host(); const guest = await f.connect();
  guest.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Guest' });
  const request = await host.next('join-request'); await guest.next('pending');
  host.op('decide', { requestId: request.requestId, approve: false });
  assert.equal((await guest.next('rejected')).reason, 'host_rejected');
  assert.equal((await guest.closed)[0], 1000);
  assert.equal(guest.messages.some(m => m.type === 'joined'), false);
  host.op('decide', { requestId: request.requestId, approve: true });
  assert.equal((await host.next('error')).code, 'request_unavailable');
});

test('closing visits cancels waiting requests and prevents new applications until reopened', async t => {
  const f = await fixture(t); const host = await f.host(); const waiting = await f.connect();
  waiting.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Wait' });
  await waiting.next('pending'); await host.next('join-request');
  host.op('visits', { open: false }); await host.next('ack');
  assert.equal((await waiting.next('rejected')).reason, 'visits_closed');
  const other = await f.connect();
  other.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Other' });
  assert.equal((await other.next('error')).code, 'visits_closed');
  host.op('visits', { open: true }); await host.next('ack');
  other.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Other' });
  assert.equal((await other.next('pending')).type, 'pending');
});

test('only two approved members occupy a room even when approvals race', async t => {
  const f = await fixture(t); const host = await f.host(); const guests = [await f.connect(), await f.connect()];
  for (const [i, guest] of guests.entries()) guest.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Guest ' + i });
  const a = await host.next('join-request'); const b = await host.next('join-request');
  host.op('decide', { requestId: a.requestId, approve: true });
  host.op('decide', { requestId: b.requestId, approve: true });
  assert.equal((await guests[0].joined()).snapshot.members.length, 2);
  assert.equal((await guests[1].next('rejected')).reason, 'room_full');
  const third = await f.connect(); third.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Third' });
  assert.equal((await third.next('error')).code, 'room_full');
});

test('protocol and content mismatch cannot create or inspect a room', async t => {
  const f = await fixture(t); const host = await f.host();
  for (const fields of [{ protocol: 2 }, { contentVersion: 'different-world' }]) {
    const peer = await f.connect();
    peer.send({ type: 'create', ...handshake, name: 'Wrong', ...fields });
    assert.equal((await peer.next('error')).code, 'version_mismatch');
    peer.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Wrong', ...fields });
    assert.equal((await peer.next('error')).code, 'version_mismatch');
    assert.equal(peer.messages.some(m => m.snapshot), false);
  }
});

async function pair(f) {
  const host = await f.host(); const guest = await f.connect();
  guest.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Guest' });
  const request = await host.next('join-request');
  host.op('decide', { requestId: request.requestId, approve: true });
  await host.next('ack'); await guest.joined(); await host.next('member-joined');
  return { host, guest };
}
const validPose = { position: [12, -31, 8], yaw: 1, pitch: -0.4, tool: 'observe', paused: false };

test('approved members exchange bounded poses with server-owned sender identity', async t => {
  const f = await fixture(t); const { host, guest } = await pair(f);
  host.op('pose', { pose: validPose });
  const outbound = await guest.next('pose');
  assert.equal(outbound.memberId, host.session.memberId);
  assert.deepEqual(outbound.pose, validPose);
  guest.op('pose', { pose: { ...validPose, position: [-20, -700, 13], paused: true } });
  const inbound = await host.next('pose');
  assert.equal(inbound.memberId, guest.session.memberId);
  assert.equal(inbound.pose.paused, true);
  guest.op('pose', { pose: { ...validPose, position: [1e30, 0, 0] } });
  assert.equal((await guest.next('error')).code, 'invalid_pose');
  guest.op('pose', { pose: { ...validPose, tool: 'admin' } });
  assert.equal((await guest.next('error')).code, 'invalid_pose');
  guest.op('pose', { pose: { ...validPose, position: [null, 0, 0] } });
  assert.equal((await guest.next('error')).code, 'invalid_pose');
});

test('only whitelisted category and preset pairs cross the room, with no free text or spoofed sender', async t => {
  const f = await fixture(t); const { host, guest } = await pair(f);
  host.op('preset', { category: 'social', preset: 'hello' });
  const hello = await guest.next('preset');
  assert.equal(hello.memberId, host.session.memberId);
  assert.equal(hello.preset, 'hello');
  guest.op('preset', { category: 'navigation', preset: 'follow' });
  assert.equal((await host.next('preset', m => m.memberId === guest.session.memberId)).preset, 'follow');
  guest.op('preset', { category: 'social', preset: 'free arbitrary message' });
  assert.equal((await guest.next('error')).code, 'invalid_preset');
  guest.op('preset', { category: 'navigation', preset: 'hello' });
  assert.equal((await guest.next('error')).code, 'invalid_preset');
  guest.op('preset', { category: 'social', preset: 'hello', text: 'secret', memberId: host.session.memberId });
  assert.equal((await guest.next('error')).code, 'invalid_message');
});

test('room epoch, connection generation, sequence and host role cannot be forged', async t => {
  const f = await fixture(t); const { host, guest } = await pair(f);
  guest.op('visits', { open: false });
  assert.equal((await guest.next('error')).code, 'host_only');
  host.op('visits', { open: false, roomEpoch: 'wrong' });
  assert.equal((await host.next('error')).code, 'stale_session');
  host.op('visits', { open: false, generation: 0 });
  assert.equal((await host.next('error')).code, 'stale_session');
  host.op('pose', { pose: validPose }); await guest.next('pose');
  host.send({ type: 'pose', roomEpoch: host.session.roomEpoch, generation: host.session.generation, seq: host.seq, pose: validPose });
  assert.equal((await host.next('error')).code, 'stale_sequence');
  host.op('pose', { pose: validPose, seq: 1e30 });
  assert.equal((await host.next('error')).code, 'stale_sequence');
});

test('disconnect retains the guest slot and resume rotates capability and connection generation', async t => {
  const f = await fixture(t); const { host, guest } = await pair(f);
  guest.op('pose', { pose: validPose }); await host.next('pose');
  const previous = guest.session;
  guest.ws.terminate(); await guest.closed;
  assert.equal((await host.next('presence')).connected, false);
  const third = await f.connect(); third.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Third' });
  assert.equal((await third.next('error')).code, 'room_full');
  const resumed = await f.connect();
  resumed.send({ type: 'resume', ...handshake, roomId: previous.roomId, memberId: previous.memberId, resumeToken: previous.resumeToken, resumeNonce: randomBytes(32).toString('base64url') });
  const session = await resumed.joined();
  assert.equal(session.memberId, previous.memberId);
  assert.equal(session.generation, previous.generation + 1);
  assert.notEqual(session.resumeToken, previous.resumeToken);
  assert.deepEqual(session.snapshot.members.find(m => m.id === previous.memberId).pose, validPose);
  const stale = await f.connect();
  stale.send({ type: 'resume', ...handshake, roomId: previous.roomId, memberId: previous.memberId, resumeToken: previous.resumeToken, resumeNonce: randomBytes(32).toString('base64url') });
  assert.equal((await stale.next('error')).code, 'resume_invalid');
  resumed.op('pose', { pose: validPose, generation: previous.generation });
  assert.equal((await resumed.next('error')).code, 'stale_session');
  resumed.op('pose', { pose: validPose });
  assert.equal((await host.next('pose')).generation, session.generation);
});

test('a member recovers repeated resume replies lost in transit without losing its approved seat', async t => {
  const f = await fixture(t); const { host, guest } = await pair(f);
  const previous = guest.session;
  const proxy = await lossyProxy(t, f.url);
  const request = { type: 'resume', ...handshake, roomId: previous.roomId, memberId: previous.memberId, resumeToken: previous.resumeToken, resumeNonce: randomBytes(32).toString('base64url') };
  for (let generation = 2; generation <= 4; generation++) {
    const interrupted = await f.connect('/v1', {}, proxy.url);
    proxy.dropNextResponse(); interrupted.send(request);
    assert.ok(await proxy.loss() > 0);
    await interrupted.closed;
    assert.equal(interrupted.messages.some(message => message.type === 'joined'), false);
    // The independent admitted member proves the handoff happened before the cut.
    await host.next('presence', message => message.connected && message.generation === generation).catch(error => { throw new Error(`Handoff generation ${generation}: ${error.message}`); });
    await host.next('presence', message => !message.connected && message.generation === generation);
  }
  const recovered = await f.connect(); recovered.send(request);
  const joined = await recovered.joined();
  assert.equal(joined.memberId, previous.memberId);
  assert.equal(joined.generation, 5);
  assert.equal(joined.snapshot.members.length, 2);
  recovered.op('pose', { pose: validPose });
  assert.equal((await host.next('pose')).generation, 5);
});

test('confirm retires the exact recovery proof and stale generations cannot confirm a handoff', async t => {
  const f = await fixture(t); const { host, guest } = await pair(f);
  const previous = guest.session;
  const request = { type: 'resume', ...handshake, roomId: previous.roomId, memberId: previous.memberId, resumeToken: previous.resumeToken, resumeNonce: randomBytes(32).toString('base64url') };
  const first = await f.connect(); first.send(request); await first.joined();
  first.op('confirm', { generation: previous.generation });
  assert.equal((await first.next('error')).code, 'stale_session');
  const confirmed = await f.connect(); confirmed.send(request); await confirmed.joined();
  assert.equal(confirmed.session.generation, 3);
  confirmed.op('confirm'); await confirmed.next('ack');
  const replay = await f.connect(); replay.send(request);
  assert.equal((await replay.next('error')).code, 'resume_invalid');
  confirmed.op('pose', { pose: validPose });
  assert.equal((await host.next('pose')).generation, 3);
  assert.equal(confirmed.ws.readyState, WebSocket.OPEN);
});

test('the original recovery deadline does not move when an unconfirmed handoff is retried', async t => {
  const f = await fixture(t, { resumeGraceMs: 200 }); const { guest } = await pair(f);
  const previous = guest.session;
  const request = { type: 'resume', ...handshake, roomId: previous.roomId, memberId: previous.memberId, resumeToken: previous.resumeToken, resumeNonce: randomBytes(32).toString('base64url') };
  const first = await f.connect(); first.send(request); await first.joined();
  await delay(120);
  const retry = await f.connect(); retry.send(request); await retry.joined();
  assert.equal(retry.session.generation, 3);
  await delay(120);
  const expired = await f.connect(); expired.send(request);
  assert.equal((await expired.next('error')).code, 'resume_invalid');
  // The member is still connected; only the bounded recovery proof expired.
  expired.send({ ...request, resumeToken: retry.session.resumeToken, resumeNonce: randomBytes(32).toString('base64url') });
  assert.equal((await expired.joined()).generation, 4);
});

test('a recovered member sending its current pose retires the old exact request', async t => {
  const f = await fixture(t); const { host, guest } = await pair(f);
  const previous = guest.session;
  const request = { type: 'resume', ...handshake, roomId: previous.roomId, memberId: previous.memberId, resumeToken: previous.resumeToken, resumeNonce: randomBytes(32).toString('base64url') };
  const resumed = await f.connect(); resumed.send(request); await resumed.joined();
  resumed.op('pose', { pose: validPose }); await host.next('pose');
  const replay = await f.connect(); replay.send(request);
  assert.equal((await replay.next('error')).code, 'resume_invalid');
  resumed.op('preset', { category: 'navigation', preset: 'follow' });
  assert.equal((await host.next('preset')).generation, 2);
});

test('losing the confirm acknowledgement still allows recovery with the already received capability', async t => {
  const f = await fixture(t); const { host, guest } = await pair(f);
  const previous = guest.session; const proxy = await lossyProxy(t, f.url);
  const request = { type: 'resume', ...handshake, roomId: previous.roomId, memberId: previous.memberId, resumeToken: previous.resumeToken, resumeNonce: randomBytes(32).toString('base64url') };
  const first = await f.connect('/v1', {}, proxy.url); first.send(request); await first.joined();
  proxy.dropNextResponse(); first.op('confirm');
  assert.ok(await proxy.loss() > 0); await first.closed;
  assert.equal(first.messages.some(message => message.type === 'ack'), false);
  await host.next('presence', message => !message.connected && message.generation === 2);
  const recovered = await f.connect(); recovered.send(request);
  assert.equal((await recovered.next('error')).code, 'resume_invalid');
  recovered.send({ ...request, resumeToken: first.session.resumeToken, resumeNonce: randomBytes(32).toString('base64url') });
  assert.equal((await recovered.joined()).generation, 3);
  recovered.op('pose', { pose: validPose });
  assert.equal((await host.next('pose')).generation, 3);
});

test('missing malformed or different recovery nonces never reuse a retired capability', async t => {
  const f = await fixture(t); const { guest } = await pair(f);
  const previous = guest.session;
  const request = { type: 'resume', ...handshake, roomId: previous.roomId, memberId: previous.memberId, resumeToken: previous.resumeToken, resumeNonce: randomBytes(32).toString('base64url') };
  const first = await f.connect(); first.send(request); await first.joined();
  const invalid = await f.connect();
  for (const resumeNonce of [undefined, '', 1, 'x'.repeat(44), '!'.repeat(43)]) {
    invalid.send({ ...request, resumeNonce });
    assert.equal((await invalid.next('error')).code, 'invalid_message');
  }
  invalid.send({ ...request, resumeNonce: randomBytes(32).toString('base64url') });
  assert.equal((await invalid.next('error')).code, 'resume_invalid');
  invalid.send(request);
  assert.equal((await invalid.joined()).generation, 3);
});

test('a valid resume replaces an old socket, and old socket close cannot disconnect its replacement', async t => {
  const f = await fixture(t); const { host, guest } = await pair(f);
  const replacement = await f.connect();
  replacement.send({ type: 'resume', ...handshake, roomId: guest.session.roomId, memberId: guest.session.memberId, resumeToken: guest.session.resumeToken, resumeNonce: randomBytes(32).toString('base64url') });
  await replacement.joined();
  assert.equal((await guest.closed)[0], 4001);
  assert.equal((await host.next('presence')).connected, true);
  replacement.op('pose', { pose: validPose });
  assert.equal((await host.next('pose')).memberId, replacement.session.memberId);
  assert.equal(host.messages.some(m => m.type === 'presence' && !m.connected), false);
});

test('guest leaving revokes its capability and frees the slot; host leaving closes the room', async t => {
  const f = await fixture(t); const { host, guest } = await pair(f);
  const old = guest.session;
  guest.op('leave'); assert.equal((await guest.next('left')).reason, 'left');
  assert.equal((await host.next('member-left')).memberId, old.memberId);
  const stale = await f.connect();
  stale.send({ type: 'resume', ...handshake, roomId: old.roomId, memberId: old.memberId, resumeToken: old.resumeToken, resumeNonce: randomBytes(32).toString('base64url') });
  assert.equal((await stale.next('error')).code, 'resume_invalid');
  const next = await f.connect(); next.send({ type: 'request', ...handshake, roomId: old.roomId, name: 'Next' });
  const request = await host.next('join-request'); host.op('decide', { requestId: request.requestId, approve: true });
  await next.joined();
  host.op('leave'); assert.equal((await next.next('room-closed')).reason, 'host_left');
  const after = await f.connect(); after.send({ type: 'request', ...handshake, roomId: old.roomId, name: 'After' });
  assert.equal((await after.next('error')).code, 'room_unavailable');
  after.send({ type: 'resume', ...handshake, roomId: host.session.roomId, memberId: host.session.memberId, resumeToken: host.session.resumeToken, resumeNonce: randomBytes(32).toString('base64url') });
  assert.equal((await after.next('error')).code, 'resume_invalid');
});

test('expired disconnected membership cannot resume, and host expiry closes the room', async t => {
  const f = await fixture(t, { resumeGraceMs: 70, sweepMs: 10 }); const { host, guest } = await pair(f);
  const previous = guest.session;
  guest.ws.terminate(); await guest.closed; await host.next('presence');
  assert.equal((await host.next('member-left')).reason, 'resume_expired');
  const stale = await f.connect();
  stale.send({ type: 'resume', ...handshake, roomId: previous.roomId, memberId: previous.memberId, resumeToken: previous.resumeToken, resumeNonce: randomBytes(32).toString('base64url') });
  assert.equal((await stale.next('error')).code, 'resume_invalid');
  const next = await f.connect(); next.send({ type: 'request', ...handshake, roomId: previous.roomId, name: 'Next' });
  const req = await host.next('join-request'); host.op('decide', { requestId: req.requestId, approve: true }); await next.joined();
  host.ws.terminate(); await host.closed;
  assert.equal((await next.next('room-closed')).reason, 'host_disconnected');
});

test('pending applications have a bounded lifetime and disconnected hosts cannot admit new requests', async t => {
  const f = await fixture(t, { pendingTtlMs: 60, sweepMs: 10 }); const host = await f.host(); const pending = await f.connect();
  pending.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Pending' });
  const request = await host.next('join-request'); await pending.next('pending');
  assert.equal((await pending.next('rejected')).reason, 'request_expired');
  host.op('decide', { requestId: request.requestId, approve: true });
  assert.equal((await host.next('error')).code, 'request_unavailable');
  host.ws.terminate(); await host.closed;
  const other = await f.connect(); other.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Other' });
  assert.equal((await other.next('error')).code, 'host_unavailable');
});

test('room and waiting-request capacity are enforced before allocating more state', async t => {
  const f = await fixture(t, { maxRooms: 1, maxPendingPerRoom: 1 }); const host = await f.host();
  const anotherHost = await f.connect(); anotherHost.send({ type: 'create', ...handshake, name: 'Other' });
  assert.equal((await anotherHost.next('error')).code, 'server_full');
  const waiting = await f.connect(); waiting.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Wait' }); await waiting.next('pending');
  const excess = await f.connect(); excess.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Excess' });
  assert.equal((await excess.next('error')).code, 'pending_full');
  waiting.ws.terminate(); await waiting.closed;
  // Public closure notification makes slot reclamation observable without inspecting internal maps.
  await host.next('request-cancelled');
  excess.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Excess' });
  assert.equal((await excess.next('pending')).type, 'pending');
});

test('malformed JSON, unknown fields and unsafe names cannot become room data', async t => {
  const f = await fixture(t); const peer = await f.connect();
  for (const raw of ['null', '[]', '{', 'true']) {
    peer.ws.send(raw); assert.equal((await peer.next('error')).code, 'invalid_message');
  }
  for (const name of ['', 'x'.repeat(25), 'bad\u0000name', 'bad\u202ename', { text: 'name' }]) {
    peer.send({ type: 'create', ...handshake, name });
    assert.equal((await peer.next('error')).code, 'invalid_message');
  }
  peer.send({ type: 'create', ...handshake, name: 'Valid', save: { completed: true } });
  assert.equal((await peer.next('error')).code, 'invalid_message');
  peer.send({ type: 'create', ...handshake, name: 'Valid' }); await peer.joined();
  peer.op('pose', { pose: validPose, save: { completed: true } });
  assert.equal((await peer.next('error')).code, 'invalid_message');
  peer.op('decide', { requestId: 'unknown', approve: 'yes' });
  assert.equal((await peer.next('error')).code, 'invalid_message');
});

test('a pending client cannot create another room or overwrite its application', async t => {
  const f = await fixture(t); const host = await f.host(); const peer = await f.connect();
  peer.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Pending' }); await peer.next('pending');
  const req = await host.next('join-request');
  peer.send({ type: 'create', ...handshake, name: 'Sneak' });
  assert.equal((await peer.next('error')).code, 'already_pending');
  peer.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Again' });
  assert.equal((await peer.next('error')).code, 'already_pending');
  host.op('decide', { requestId: req.requestId, approve: true });
  assert.equal((await peer.joined()).role, 'guest');
});

async function upgradeStatus(f, { path = '/v1', protocols = ['ocean.v1'], headers = { Origin: origin } } = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(f.url.replace('http:', 'ws:') + path, protocols, { headers });
    ws.on('error', () => {});
    ws.on('unexpected-response', (_request, response) => { response.resume(); resolve(response.statusCode); ws.terminate(); });
    ws.on('open', () => { ws.terminate(); resolve(101); });
    setTimeout(() => { ws.terminate(); reject(new Error('upgrade timeout')); }, 1000).unref();
  });
}

test('upgrade requires exact path, approved origin and protocol; credentials never belong in URLs', async t => {
  const f = await fixture(t);
  assert.equal(await upgradeStatus(f, { path: '/v1?resumeToken=not-a-real-token' }), 403);
  assert.equal(await upgradeStatus(f, { headers: { Origin: 'https://attacker.invalid' } }), 403);
  assert.equal(await upgradeStatus(f, { headers: {} }), 403);
  assert.equal(await upgradeStatus(f, { protocols: [] }), 403);
  assert.equal(await upgradeStatus(f, { protocols: ['ocean.v2'] }), 403);
  assert.equal((await fetch(f.url + '/health?token=not-a-real-token')).status, 404);
});

test('oversized or binary packets close only the offending socket, leaving the room usable', async t => {
  const f = await fixture(t); const host = await f.host();
  const oversized = await f.connect(); oversized.ws.send('x'.repeat(4097));
  assert.equal((await oversized.closed)[0], 1009);
  const binary = await f.connect(); binary.ws.send(Buffer.from(JSON.stringify({ type: 'create', ...handshake, name: 'Binary' })));
  assert.equal((await binary.closed)[0], 1003);
  host.op('visits', { open: false });
  assert.equal((await host.next('ack')).seq, host.seq);
});

test('packet floods are disconnected while the other player remains usable', async t => {
  const f = await fixture(t, { messageBurst: 8, messageRate: 1 }); const { host, guest } = await pair(f);
  for (let i = 0; i < 16; i++) guest.op('pose', { pose: validPose });
  assert.equal((await guest.next('error')).code, 'rate_limited');
  assert.equal((await guest.closed)[0], 1008);
  host.op('visits', { open: false }); assert.equal((await host.next('ack')).seq, host.seq);
});

test('unauthenticated sockets time out, with bounded per-address and total connections', async t => {
  const f = await fixture(t, { handshakeTimeoutMs: 80, maxConnections: 2, maxConnectionsPerIp: 2 });
  const first = await f.connect(); const second = await f.connect();
  assert.equal(await upgradeStatus(f), 503);
  assert.equal((await first.closed)[0], 1008);
  assert.equal((await second.closed)[0], 1008);
  const host = await f.host(); assert.equal(host.session.role, 'host');
});

test('server heartbeat detects a silent connection independently of gameplay messages', async t => {
  const f = await fixture(t, { heartbeatMs: 30 }); const host = await f.host();
  const silent = await f.connect('/v1', { autoPong: false });
  silent.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Silent' });
  const request = await host.next('join-request'); host.op('decide', { requestId: request.requestId, approve: true }); await silent.joined();
  assert.equal((await silent.closed)[0], 1006);
  assert.equal((await host.next('presence')).connected, false);
  host.op('visits', { open: false }); await host.next('ack');
});

test('the actual hadal trench position is accepted while impossible depths remain rejected', async t => {
  const f = await fixture(t); const { host, guest } = await pair(f);
  host.op('pose', { pose: { ...validPose, position: [781.4, -7001.3, -134] } });
  assert.deepEqual((await guest.next('pose')).pose.position, [781.4, -7001.3, -134]);
  host.op('pose', { pose: { ...validPose, position: [781.4, -1000000, -134] } });
  assert.equal((await host.next('error')).code, 'invalid_pose');
});

test('a reconnecting host recovers outstanding admission requests but a guest never receives them', async t => {
  const f = await fixture(t); const host = await f.host(); const waiting = await f.connect();
  waiting.send({ type: 'request', ...handshake, roomId: host.session.roomId, name: 'Waiting' });
  const request = await host.next('join-request');
  host.ws.terminate(); await host.closed;
  const resumed = await f.connect();
  const resumeRequest = { type: 'resume', ...handshake, roomId: host.session.roomId, memberId: host.session.memberId, resumeToken: host.session.resumeToken, resumeNonce: randomBytes(32).toString('base64url') };
  resumed.send(resumeRequest);
  const session = await resumed.joined();
  assert.equal(session.snapshot.pending[0].requestId, request.requestId);
  assert.equal(session.snapshot.pending[0].name, 'Waiting');
  resumed.op('decide', { requestId: request.requestId, approve: true });
  assert.equal(Object.hasOwn((await waiting.joined()).snapshot, 'pending'), false);
  const replay = await f.connect(); replay.send(resumeRequest);
  assert.equal((await replay.next('error')).code, 'resume_invalid');
});

test('bounded preset bursts cannot turn approved membership into message spam', async t => {
  const f = await fixture(t); const { host, guest } = await pair(f);
  for (let i = 0; i < 5; i++) guest.op('preset', { category: 'social', preset: 'hello' });
  assert.equal((await guest.next('error')).code, 'preset_rate_limited');
  guest.op('pose', { pose: validPose });
  assert.equal((await host.next('pose')).memberId, guest.session.memberId);
});

test('a stalled receiver is disconnected instead of accumulating an unbounded outbound queue', async t => {
  const f = await fixture(t, { messageBurst: 30000, messageRate: 30000, maxBufferedBytes: 1024 });
  const { host, guest } = await pair(f);
  guest.ws.pause();
  for (let i = 0; i < 20000; i++) host.op('pose', { pose: validPose });
  assert.equal((await host.next('presence')).connected, false);
  guest.ws.resume();
  host.op('visits', { open: false }); await host.next('ack');
});

test('HTTP exposes only a no-store health check and gives no success body for unsupported methods', async t => {
  const f = await fixture(t);
  const response = await fetch(f.url + '/health', { method: 'POST', body: 'ignored' });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'not_found' });
  const health = await fetch(f.url + '/health');
  assert.equal(health.headers.get('cache-control'), 'no-store');
});

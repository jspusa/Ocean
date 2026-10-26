import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { webcrypto, createHash } from 'node:crypto';
import net from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket, { WebSocketServer } from 'ws';
import { createOceanServer } from '../server.mjs';

const require = createRequire(import.meta.url);
const OceanRoomClient = require('../../src/room_client.js');
const contentVersion = 'client-test-world';
const origin = 'http://127.0.0.1:8000';

async function until(predicate, label, timeout = 2000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { const value = predicate(); if (value) return value; await delay(10); }
  assert.fail('Timed out: ' + label);
}

async function fixture(t, options = {}) {
  const app = createOceanServer({ contentVersion, allowedOrigins: [origin], ...options });
  await app.listen(0, '127.0.0.1');
  t.after(() => app.close());
  const endpoint = 'ws://127.0.0.1:' + app.address().port;
  const clients = [];
  function client(extra = {}) {
    const sockets = [], sent = [], states = [], presets = [];
    class BrowserSocket extends WebSocket {
      constructor(url, protocol) { super(url, protocol, { origin }); this.testHandlers = {}; sockets.push(this); }
      addEventListener(type, listener, ...args) { this.testHandlers[type] = listener; return super.addEventListener(type, listener, ...args); }
      send(data) { const message = JSON.parse(data); sent.push(message); extra.beforeSend?.(message); return super.send(data); }
    }
    const api = OceanRoomClient.create({ endpoint, contentVersion, WebSocket: BrowserSocket, crypto: webcrypto,
      onChange: state => states.push(state), onPreset: message => presets.push(message), ...extra });
    clients.push(api);
    return { api, sockets, sent, states, presets, state: () => api.snapshot() };
  }
  t.after(() => { for (const client of clients) client.close(); });
  return { app, endpoint, client };
}

// Interrupt actual TCP bytes after a real client request. No room implementation access.
async function proxy(t, endpoint) {
  const sockets = new Set(); let drop = false, hold = false, held = [], holdIncoming = false, incoming = [];
  const server = net.createServer(downstream => {
    const upstream = net.connect(+new URL(endpoint).port, '127.0.0.1');
    for (const socket of [downstream, upstream]) {
      sockets.add(socket); socket.on('error', () => {});
      socket.on('close', () => { sockets.delete(socket); downstream.destroy(); upstream.destroy(); });
    }
    downstream.on('data', bytes => { if (hold) held.push({ upstream, bytes }); else upstream.write(bytes); });
    upstream.on('data', bytes => { if (drop) { drop = false; downstream.destroy(); upstream.destroy(); } else if (holdIncoming) incoming.push({ downstream, bytes }); else downstream.write(bytes); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); });
  return { endpoint: 'ws://127.0.0.1:' + server.address().port, dropNextResponse() { drop = true; }, disconnect() { for (const socket of sockets) socket.destroy(); },
    holdRequests() { hold = true; }, releaseRequests() { hold = false; for (const { upstream, bytes } of held) if (!upstream.destroyed) upstream.write(bytes); held = []; },
    holdResponses() { holdIncoming = true; }, get heldResponses() { return incoming.length; },
    releaseResponses() { holdIncoming = false; for (const { downstream, bytes } of incoming) if (!downstream.destroyed) downstream.write(bytes); incoming = []; } };
}
const signature = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('the browser client stays idle until intent, then creates and confirms a real room without exposing capabilities', async t => {
  const f = await fixture(t), host = f.client();
  assert.equal(host.state().status, 'idle');
  assert.equal(host.sockets.length, 0);
  assert.equal(host.api.create('Host'), true);
  await until(() => host.state().status === 'joined', 'host joined');
  assert.equal(host.state().role, 'host');
  assert.equal(host.state().members.length, 1);
  assert.equal(host.sent[0].type, 'create');
  assert.match(host.sent[0].admissionNonce, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(host.sent[1].type, 'confirm');
  assert.equal(host.sent[1].seq, 1);
  const publicState = JSON.stringify(host.states.concat(host.state()));
  for (const key of ['resumeToken', 'admissionNonce', 'resumeNonce', 'roomEpoch']) assert.ok(!publicState.includes(key));
  assert.ok(!publicState.includes(host.sent[0].admissionNonce));
  assert.equal(host.api.create('Duplicate'), false);
  assert.equal(host.sockets.length, 1);
  const snapshot = host.state(); snapshot.members[0].name = 'Mutated';
  assert.equal(host.state().members[0].name, 'Host');
});

test('two real clients request, approve, exchange poses and presets, close visits and leave', async t => {
  const f = await fixture(t), host = f.client(), guest = f.client();
  host.api.create('Host'); await until(() => host.state().status === 'joined', 'host');
  assert.equal(guest.api.request('Guest', host.state().roomId), true);
  await until(() => guest.state().status === 'pending' && host.state().pending.length === 1, 'private pending request');
  assert.deepEqual(guest.state().members, []);
  assert.equal(guest.state().memberId, null);
  const request = host.state().pending[0];
  assert.equal(host.api.decide(request.requestId, true), true);
  await until(() => guest.state().status === 'joined' && host.state().members.length === 2 && !host.state().pending.length, 'approval');
  const pose = { position: [1, -10, 4], yaw: .4, pitch: -.2, tool: 'pen', paused: false };
  assert.equal(guest.api.sendPose(pose), true);
  pose.position[0] = 999;
  await until(() => host.state().members.find(m => m.role === 'guest')?.pose?.position[0] === 1, 'remote pose');
  assert.equal(guest.api.preset('discovery', 'found'), true);
  await until(() => host.presets.length === 1 && guest.presets.length === 1, 'preset echo');
  assert.deepEqual(host.presets[0], { memberId: guest.state().memberId, category: 'discovery', preset: 'found' });
  assert.equal(guest.api.visits(false), false);
  assert.equal(host.api.visits(false), true);
  await until(() => host.state().visitsOpen === false, 'visits acknowledgement');
  assert.equal(guest.api.leave(), true);
  await until(() => guest.state().status === 'closed' && host.state().members.length === 1, 'guest leave');
  assert.equal(host.api.leave(), true);
  await until(() => host.state().status === 'closed', 'host leave');
  assert.equal(guest.sockets.length, 1); assert.equal(host.sockets.length, 1);
});

test('rejection, pending cancellation and closed visits end the intent without retrying', async t => {
  const f = await fixture(t), host = f.client(), guest = f.client();
  host.api.create('Host'); await until(() => host.state().status === 'joined', 'host');
  guest.api.request('Guest', host.state().roomId);
  await until(() => host.state().pending.length, 'pending');
  assert.equal(host.api.decide(host.state().pending[0].requestId, false), true);
  await until(() => guest.state().status === 'closed' && !host.state().pending.length, 'rejected');
  assert.equal(guest.state().error, 'host_rejected');
  guest.api.request('Guest again', host.state().roomId);
  await until(() => guest.state().status === 'pending', 'new explicit request');
  assert.equal(guest.api.leave(), true);
  await until(() => guest.state().status === 'closed' && !host.state().pending.length, 'cancelled');
  host.api.visits(false); await until(() => !host.state().visitsOpen, 'visits closed');
  guest.api.request('Guest blocked', host.state().roomId);
  await until(() => guest.state().status === 'closed', 'visits rejection');
  assert.equal(guest.state().error, 'visits_closed');
  await delay(300); assert.equal(guest.sockets.length, 3);
});

test('first joined lost on TCP recovers the exact admission once, never creates a duplicate room', async t => {
  const f = await fixture(t), p = await proxy(t, f.endpoint);
  const host = f.client({ endpoint: p.endpoint, beforeSend(message) { if (message.type === 'create') p.dropNextResponse(); } });
  host.api.create('Host');
  await until(() => host.state().status === 'joined', 'recovered initial joined', 3500);
  const creates = host.sent.filter(m => m.type === 'create'), recover = host.sent.filter(m => m.type === 'recover');
  assert.equal(creates.length, 1); assert.equal(recover.length, 1);
  assert.equal(signature(recover[0].admission), signature(creates[0]));
  assert.equal(host.state().members[0].generation, 2);
  assert.equal(host.sent.at(-1).type, 'confirm');
});

test('repeated lost resume replies use one exact proof, then a later disconnect uses a fresh proof', async t => {
  const f = await fixture(t), p = await proxy(t, f.endpoint); let losses = 2;
  const host = f.client({ endpoint: p.endpoint, beforeSend(message) { if (message.type === 'resume' && losses-- > 0) p.dropNextResponse(); } });
  host.api.create('Host'); await until(() => host.state().status === 'joined', 'initial host');
  const identity = { roomId: host.state().roomId, memberId: host.state().memberId };
  p.disconnect();
  await until(() => host.sent.filter(m => m.type === 'resume').length === 3 && host.state().status === 'joined', 'three rotated resumes', 4000);
  const attempts = host.sent.filter(m => m.type === 'resume');
  assert.equal(new Set(attempts.map(signature)).size, 1);
  assert.deepEqual({ roomId: host.state().roomId, memberId: host.state().memberId }, identity);
  assert.equal(host.state().members[0].generation, 4);
  // Deliver queued callbacks from the actual retired socket after replacement.
  const stable = host.state();
  host.sockets[0].testHandlers.message({ data: 'null' });
  host.sockets[0].testHandlers.close({ code: 4001 });
  assert.deepEqual(host.state(), stable);
  p.disconnect();
  await until(() => host.sent.filter(m => m.type === 'resume').length === 4 && host.state().status === 'joined', 'later resume');
  assert.notEqual(signature(host.sent.filter(m => m.type === 'resume').at(-1)), signature(attempts[0]));
  assert.equal(host.sent.filter(m => m.type === 'create').length, 1);
});

test('leave while a pending reply is lost recovers and cancels the original request', async t => {
  const f = await fixture(t), p = await proxy(t, f.endpoint), host = f.client();
  host.api.create('Host'); await until(() => host.state().status === 'joined', 'host');
  const guest = f.client({ endpoint: p.endpoint, beforeSend(message) { if (message.type === 'request') p.dropNextResponse(); } });
  guest.api.request('Guest', host.state().roomId);
  await until(() => host.state().pending.length && guest.state().status === 'reconnecting', 'lost pending');
  assert.equal(guest.api.leave(), true);
  await until(() => guest.state().status === 'closed' && !host.state().pending.length, 'cancel recovered pending');
  assert.equal(guest.sent.filter(m => m.type === 'request').length, 1);
  assert.equal(guest.sent.filter(m => m.type === 'recover').length, 1);
  assert.equal(guest.sent.filter(m => m.type === 'cancel').length, 1);
});

test('approval racing disconnected cancel leaves the admitted seat instead of orphaning it', async t => {
  const f = await fixture(t), p = await proxy(t, f.endpoint), host = f.client();
  host.api.create('Host'); await until(() => host.state().status === 'joined', 'host');
  const guest = f.client({ endpoint: p.endpoint, beforeSend(message) { if (message.type === 'request') p.dropNextResponse(); } });
  guest.api.request('Guest', host.state().roomId);
  await until(() => host.state().pending.length && guest.state().status === 'reconnecting', 'lost pending');
  host.api.decide(host.state().pending[0].requestId, true); guest.api.leave();
  await until(() => guest.state().status === 'closed' && host.state().members.length === 1 && !host.state().pending.length, 'cancel after approval');
  assert.equal(guest.sent.filter(m => m.type === 'leave').length, 1);
  assert.equal(guest.sent.filter(m => m.type === 'request').length, 1);
});

test('lost confirm acknowledgement resumes with the received capability instead of admission recovery', async t => {
  const f = await fixture(t), p = await proxy(t, f.endpoint); let drop = true;
  const host = f.client({ endpoint: p.endpoint, beforeSend(m) { if (m.type === 'confirm' && drop) { drop = false; p.dropNextResponse(); } } });
  host.api.create('Host');
  await until(() => host.sent.some(m => m.type === 'resume') && host.state().status === 'joined', 'confirm ack recovery');
  assert.equal(host.sent.filter(m => m.type === 'recover').length, 0);
  const exported = JSON.stringify(host.states.concat(host.state()));
  for (const m of host.sent) for (const key of ['admissionNonce', 'resumeNonce', 'resumeToken']) if (m[key]) assert.ok(!exported.includes(m[key]));
});

test('expired authority is terminal and close while reconnecting cancels all later connection attempts', async t => {
  const f = await fixture(t, { resumeGraceMs: 50, sweepMs: 10 }), p = await proxy(t, f.endpoint), host = f.client({ endpoint: p.endpoint });
  host.api.create('Host'); await until(() => host.state().status === 'joined', 'host');
  p.disconnect(); await until(() => host.state().status === 'closed', 'expired resume');
  assert.equal(host.state().error, 'resume_invalid');
  const count = host.sockets.length; await delay(300); assert.equal(host.sockets.length, count);
  host.api.create('New explicit intent'); await until(() => host.state().status === 'joined', 'new room');
  p.disconnect(); await until(() => host.state().status === 'reconnecting', 'retry pending');
  host.api.close(); const stopped = host.sockets.length;
  await delay(300); assert.equal(host.state().status, 'closed'); assert.equal(host.sockets.length, stopped);
});

test('the recovery deadline stays bounded when the network remains unavailable', async t => {
  const f = await fixture(t), host = f.client();
  host.api.create('Host'); await until(() => host.state().status === 'joined', 'host');
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.now() });
  const closed = once(host.sockets[0], 'close'); host.sockets[0].terminate(); await closed;
  assert.equal(host.state().status, 'reconnecting');
  t.mock.timers.tick(30001);
  assert.equal(host.state().status, 'closed'); assert.equal(host.state().error, 'recovery_expired');
  const count = host.sockets.length;
  t.mock.timers.tick(120000); assert.equal(host.sockets.length, count);
  t.mock.timers.reset();
});

test('configuration and outgoing data reject unsafe addresses and invalid fields without opening sockets', async t => {
  const f = await fixture(t);
  for (const endpoint of ['ws://example.com', 'https://example.com', 'wss://user:secret@example.com', 'wss://@example.com', 'wss://example.com/?secret', 'wss://example.com/#secret', 'wss://example.com/other', 'wss://exa\nmple.com']) {
    const c = f.client({ endpoint }); assert.equal(c.api.create('Host'), false); assert.equal(c.sockets.length, 0);
  }
  const host = f.client();
  for (const name of ['', ' ', 'x'.repeat(25), 'a\u200bb']) assert.equal(host.api.create(name), false);
  assert.equal(host.sockets.length, 0);
  host.api.create('Host'); await until(() => host.state().status === 'joined', 'host');
  const count = host.sent.length;
  assert.equal(host.api.sendPose({ position: [0, -1, 0], yaw: 0, pitch: 0, tool: 'observe', paused: false, extra: 1 }), false);
  assert.equal(host.api.sendPose({ position: [0, NaN, 0], yaw: 0, pitch: 0, tool: 'observe', paused: false }), false);
  assert.equal(host.api.preset('social', 'custom text'), false);
  assert.equal(host.api.decide('missing', true), false);
  assert.equal(host.sent.length, count);
});

// A real WS endpoint supplies deliberately hostile server envelopes. This tests only
// the parser boundary; the room/admission/play behavior above uses the production server.
async function hostile(t, respond) {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { for (const peer of server.clients) peer.terminate(); server.close(resolve); }));
  server.on('connection', socket => respond(socket));
  return 'ws://127.0.0.1:' + server.address().port;
}

test('malformed server envelopes terminate safely without reflecting supplied secrets', async t => {
  const f = await fixture(t);
  for (const packet of ['{', JSON.stringify({ type: 'hello', protocol: 1, contentVersion, extra: 'secret' }), JSON.stringify({ type: 'error', code: 'secret-token-value' }), 'x'.repeat(8193)]) {
    const endpoint = await hostile(t, socket => socket.send(packet)), c = f.client({ endpoint });
    c.api.create('Host'); await until(() => c.state().status === 'closed', 'malformed envelope');
    assert.equal(c.state().error, 'invalid_server_message');
    assert.ok(!JSON.stringify(c.states).includes('secret'));
    assert.equal(c.sent.length, 0);
  }
});

test('version mismatch stops before sending an admission and a callback can close before any connection', async t => {
  const f = await fixture(t), wrong = f.client({ contentVersion: 'wrong-version' });
  wrong.api.create('Host'); await until(() => wrong.state().status === 'closed', 'version mismatch');
  assert.equal(wrong.state().error, 'version_mismatch'); assert.equal(wrong.sent.length, 0);
  let api; const c = f.client({ onChange(state) { if (state.status === 'connecting') api.close(); } }); api = c.api;
  c.api.create('Host'); assert.equal(c.state().status, 'closed'); assert.equal(c.sockets.length, 0);
});

test('five genuine cancel/approve races do not exhaust controls or prevent closing visits', async t => {
  const f = await fixture(t), p = await proxy(t, f.endpoint);
  const host = f.client({ endpoint: p.endpoint, beforeSend(message) { if (message.type === 'decide') p.holdRequests(); } });
  host.api.create('Host'); await until(() => host.state().status === 'joined', 'host');
  for (let i = 0; i < 5; i++) {
    const guest = f.client(); guest.api.request('Guest ' + i, host.state().roomId);
    await until(() => host.state().pending.length === 1 && guest.state().status === 'pending', 'pending');
    assert.equal(host.api.decide(host.state().pending[0].requestId, true), true);
    guest.api.leave(); await until(() => guest.state().status === 'closed' && !host.state().pending.length, 'cancel overtakes approval');
    p.releaseRequests();
    await until(() => host.states.filter(s => s.error === 'request_unavailable').length >= i + 1 && host.state().status === 'joined', 'raced error resolved');
  }
  assert.equal(host.api.visits(false), true);
  await until(() => !host.state().visitsOpen, 'usable controls after raced errors');
});

function serverJoined() {
  return { type: 'joined', protocol: 1, contentVersion, roomId: 'test-room', roomEpoch: 'test-epoch', memberId: 'host', role: 'host', generation: 1, resumeToken: 'a'.repeat(43),
    snapshot: { visitsOpen: true, members: [{ id: 'host', name: 'Host', role: 'host', generation: 1, connected: true, pose: null }], pending: [] } };
}

test('JSON null after admission is rejected as a malformed envelope without throwing', async t => {
  const f = await fixture(t);
  const endpoint = await hostile(t, socket => {
    socket.send(JSON.stringify({ type: 'hello', protocol: 1, contentVersion }));
    socket.on('message', raw => {
      const m = JSON.parse(raw);
      if (m.type === 'create') socket.send(JSON.stringify(serverJoined()));
      if (m.type === 'confirm') socket.send('null');
    });
  });
  const c = f.client({ endpoint }); c.api.create('Host');
  await until(() => c.state().status === 'closed', 'invalid admitted packet');
  assert.equal(c.state().error, 'invalid_server_message');
});

test('pose and preset ordering rejects old sequence/generation and freezes absent peers', async t => {
  const f = await fixture(t); let wire;
  const endpoint = await hostile(t, socket => {
    wire = socket; socket.send(JSON.stringify({ type: 'hello', protocol: 1, contentVersion }));
    socket.on('message', raw => {
      const m = JSON.parse(raw);
      if (m.type === 'create') {
        const joined = serverJoined(); joined.snapshot.members.push({ id: 'guest', name: 'Guest', role: 'guest', generation: 1, connected: true, pose: null });
        socket.send(JSON.stringify(joined));
      }
    });
  });
  const c = f.client({ endpoint }); c.api.create('Host'); await until(() => c.state().status === 'joined', 'parser fixture joined');
  const pose = (generation, seq, x) => ({ type: 'pose', memberId: 'guest', generation, seq, pose: { position: [x, -10, 0], yaw: 0, pitch: 0, tool: 'observe', paused: false } });
  const send = message => wire.send(JSON.stringify(message)), remote = () => c.state().members.find(m => m.id === 'guest');
  send(pose(1, 3, 1)); await until(() => remote().pose?.position[0] === 1, 'first pose');
  send(pose(1, 3, 9)); send(pose(1, 2, 9));
  send({ type: 'presence', memberId: 'guest', generation: 2, connected: true });
  send(pose(1, 99, 9)); await until(() => remote().generation === 2, 'new generation');
  assert.equal(remote().pose, null);
  send(pose(2, 1, 2)); send({ type: 'presence', memberId: 'guest', generation: 1, connected: false });
  await until(() => remote().pose?.position[0] === 2, 'new pose'); assert.equal(remote().connected, true);
  send({ type: 'preset', memberId: 'guest', generation: 2, seq: 2, category: 'social', preset: 'hello' });
  send({ type: 'preset', memberId: 'guest', generation: 2, seq: 2, category: 'social', preset: 'hello' });
  await until(() => c.presets.length, 'preset'); await delay(10); assert.equal(c.presets.length, 1);
  send({ type: 'presence', memberId: 'guest', generation: 2, connected: false });
  send(pose(2, 3, 9)); await until(() => !remote().connected, 'offline'); await delay(10);
  assert.equal(remote().pose.position[0], 2);
  send({ type: 'member-left', memberId: 'guest', reason: 'left' }); send(pose(2, 4, 9));
  await until(() => c.state().members.length === 1, 'removed');
});

test('a missing control acknowledgement resolves from a real resume snapshot without replaying the mutation', async t => {
  const f = await fixture(t), p = await proxy(t, f.endpoint), host = f.client({ endpoint: p.endpoint });
  host.api.create('Host'); await until(() => host.state().status === 'joined', 'host');
  p.holdResponses(); t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.now() });
  host.api.visits(false); await until(() => p.heldResponses > 0, 'server has applied visits');
  assert.equal(host.state().visitsOpen, true);
  t.mock.timers.tick(5001); assert.equal(host.state().status, 'reconnecting');
  p.releaseResponses(); t.mock.timers.tick(200); t.mock.timers.reset();
  await until(() => host.state().status === 'joined' && !host.state().visitsOpen, 'snapshot resync');
  assert.equal(host.sent.filter(m => m.type === 'visits').length, 1);
  assert.equal(host.sent.filter(m => m.type === 'resume').length, 1);
});

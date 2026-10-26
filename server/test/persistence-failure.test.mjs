import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';
import { createOceanServer } from '../server.mjs';
import { openRoomStore } from '../room-store.mjs';

const origin = 'https://jspusa.github.io', contentVersion = 'durable-fault-1';
const nonce = () => randomBytes(32).toString('base64url');
const create = () => ({ type: 'create', protocol: 1, contentVersion, name: 'Host', admissionNonce: nonce() });

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'ocean-storage-fault-')), file = join(dir, 'rooms.sqlite');
  const apps = new Set(), sockets = new Set();
  t.after(async () => { for (const ws of sockets) ws.terminate(); for (const app of apps) await app.close(); await rm(dir, { recursive: true, force: true }); });
  async function start() {
    const durable = openRoomStore({ path: file, contentVersion });
    let fault = null, writes = 0;
    // Inject only the documented IO failure. Never inspect or modify room state.
    const store = {
      load: durable.load, close: durable.close,
      commit(document) { writes++; if (fault === 'before') throw Error('simulated IO failure'); durable.commit(document); if (fault === 'after') throw Error('simulated uncertain result'); }
    };
    const app = createOceanServer({ contentVersion, allowedOrigins: [origin], stateStore: store, messageBurst: 100, messageRate: 100 });
    apps.add(app); await app.listen(0);
    const base = `http://127.0.0.1:${app.address().port}`;
    return { base, fail: value => { fault = value; }, writes: () => writes, close: async () => { await app.close(); apps.delete(app); } };
  }
  async function connect(service) {
    const ws = new WebSocket(service.base.replace('http:', 'ws:') + '/v1', 'ocean.v1', { origin });
    sockets.add(ws); ws.on('error', () => {});
    const received = [], waiters = new Set(), closed = once(ws, 'close');
    ws.on('message', raw => { received.push(JSON.parse(raw)); for (const notify of waiters) notify(); });
    await once(ws, 'open');
    async function next(type) {
      const take = () => { const index = received.findIndex(message => message.type === type); return index < 0 ? null : received.splice(index, 1)[0]; };
      const ready = take(); if (ready) return ready;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { waiters.delete(notify); reject(Error('missing ' + type)); }, 1500);
        function notify() { const value = take(); if (value) { clearTimeout(timer); waiters.delete(notify); resolve(value); } }
        waiters.add(notify);
      });
    }
    await next('hello');
    return { send: message => ws.send(JSON.stringify(message)), next, closed, received };
  }
  return { start, connect };
}

for (const fault of ['before', 'after']) test('a ' + fault + '-commit IO failure withholds success and stops authority until restart', async t => {
  const f = await fixture(t); let service = await f.start(); const host = await f.connect(service), bystander = await f.connect(service);
  const original = create(); service.fail(fault); host.send(original);
  assert.equal((await host.closed)[0], 1011); assert.equal((await bystander.closed)[0], 1011);
  assert.equal(host.received.some(m => ['joined', 'ack', 'left'].includes(m.type)), false);
  const health = await fetch(service.base + '/health', { headers: { Connection: 'close' } });
  assert.equal(health.status, 503); assert.deepEqual(await health.json(), { status: 'unavailable' });
  await service.close(); service = await f.start(); const retry = await f.connect(service);
  retry.send({ type: 'recover', admission: original });
  if (fault === 'before') assert.equal((await retry.next('error')).code, 'admission_invalid');
  else assert.equal((await retry.next('joined')).snapshot.members.length, 1);
});

test('first pose commits proof revocation but subsequent high-frequency poses do not write', async t => {
  const f = await fixture(t), service = await f.start(), host = await f.connect(service);
  const original = create(); host.send(original); const session = await host.next('joined');
  const before = service.writes();
  const pose = { position: [0, -7000, 0], yaw: 0, pitch: 0, tool: 'observe', paused: false };
  for (let seq = 1; seq <= 20; seq++) host.send({ type: 'pose', roomEpoch: session.roomEpoch, generation: session.generation, seq, pose: { ...pose, position: [seq, -7000, 0] } });
  host.send({ type: 'confirm', roomEpoch: session.roomEpoch, generation: session.generation, seq: 21 }); await host.next('ack');
  assert.equal(service.writes() - before, 1);
  await service.close(); const restarted = await f.start(), stale = await f.connect(restarted);
  stale.send({ type: 'recover', admission: original }); assert.equal((await stale.next('error')).code, 'admission_invalid');
  stale.send({ type: 'resume', protocol: 1, contentVersion, roomId: session.roomId, memberId: session.memberId, resumeToken: session.resumeToken, resumeNonce: nonce() });
  const resumed = await stale.next('joined'); assert.equal(resumed.snapshot.members[0].pose, null);
});

test('a current-generation business rejection durably revokes initial proof', async t => {
  const f = await fixture(t), service = await f.start(), host = await f.connect(service);
  const original = create(); host.send(original); const session = await host.next('joined');
  host.send({ type: 'pose', roomEpoch: session.roomEpoch, generation: session.generation, seq: 1, pose: null });
  assert.equal((await host.next('error')).code, 'invalid_pose'); await service.close();
  const restarted = await f.start(), retry = await f.connect(restarted);
  retry.send({ type: 'recover', admission: original }); assert.equal((await retry.next('error')).code, 'admission_invalid');
});

test('hostile JSON keys cannot shut down the authority or another admitted player', async t => {
  const f = await fixture(t), service = await f.start(), host = await f.connect(service), outsider = await f.connect(service);
  host.send(create()); const session = await host.next('joined');
  outsider.send({ type: { toString: null } }); await delay(30);
  assert.equal((await fetch(service.base + '/health', { headers: { Connection: 'close' } })).status, 200);
  assert.equal((await outsider.next('error')).code, 'invalid_message');
  host.send({ type: 'preset', roomEpoch: session.roomEpoch, generation: session.generation, seq: 1, category: { toString: null }, preset: 'hello' });
  assert.equal((await host.next('error')).code, 'invalid_preset');
  host.send({ type: 'confirm', roomEpoch: session.roomEpoch, generation: session.generation, seq: 2 });
  assert.equal((await host.next('ack')).seq, 2);
  assert.equal((await fetch(service.base + '/health', { headers: { Connection: 'close' } })).status, 200);
});

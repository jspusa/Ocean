import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';
import { createOceanServer } from '../server.mjs';
import { openRoomStore } from '../room-store.mjs';

const origin = 'https://jspusa.github.io';
const contentVersion = 'durability-world-1';
const handshake = { protocol: 1, contentVersion };
const nonce = () => randomBytes(32).toString('base64url');
const resume = session => ({ type: 'resume', ...handshake, roomId: session.roomId,
  memberId: session.memberId, resumeToken: session.resumeToken, resumeNonce: nonce() });
const validPose = { position: [12, -8, 3], yaw: 0.2, pitch: -0.1, tool: 'observe', paused: false };

// Only the shipped CLI and real HTTP/WebSocket interfaces grant room authority.
// Capabilities stay in the parent process's memory and are never diagnostic text.
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'ocean-room-durability-'));
  const stateFile = join(directory, 'rooms.sqlite');
  const children = new Set(), sockets = new Set();
  t.after(async () => {
    for (const ws of sockets) ws.terminate();
    for (const child of children) if (child.exitCode === null && !child.signalCode) {
      const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
    }
    await rm(directory, { recursive: true, force: true });
  });
  async function start(extraEnv = {}, expectFailure = false) {
    const child = spawn(process.execPath, ['cli.mjs'], {
      cwd: new URL('..', import.meta.url),
      env: { PATH: process.env.PATH, OCEAN_PORT: '0', OCEAN_HOST: '127.0.0.1',
        OCEAN_ALLOWED_ORIGINS: origin, OCEAN_CONTENT_VERSION: contentVersion,
        OCEAN_STATE_FILE: stateFile, ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    children.add(child);
    let stdout = '', stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    if (expectFailure) {
      const [code, signal] = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('Invalid durable startup neither rejected nor listened within 2 seconds')), 2000);
        child.stdout.on('data', chunk => {
          stdout += chunk;
          if (stdout.includes('\n')) { clearTimeout(timer); reject(Error('Invalid durable startup incorrectly began listening')); }
        });
        child.once('exit', (code, signal) => { clearTimeout(timer); resolve([code, signal]); });
        child.once('error', () => { clearTimeout(timer); reject(Error('CLI process could not start')); });
      });
      assert.notEqual(code, 0, 'Invalid durable startup must fail');
      assert.equal(signal, null); assert.equal(stdout, '', 'Failure must happen before listening');
      return { code, stdout, stderr };
    }
    const listening = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('CLI did not listen within 2 seconds')), 2000);
      child.stdout.on('data', chunk => {
        stdout += chunk;
        if (!stdout.includes('\n')) return;
        clearTimeout(timer);
        try { resolve(JSON.parse(stdout.split('\n')[0])); } catch { reject(Error('CLI listening metadata is invalid')); }
      });
      child.once('exit', () => { clearTimeout(timer); reject(Error('CLI exited before listening')); });
      child.once('error', () => { clearTimeout(timer); reject(Error('CLI process could not start')); });
    });
    assert.equal((await fetch(listening.http + '/health', { headers: { Connection: 'close' } })).status, 200);
    return {
      child, listening, output: () => ({ stdout, stderr }),
      async stop(signal = 'SIGKILL') {
        const exited = once(child, 'exit'); child.kill(signal);
        const [code, actualSignal] = await exited;
        if (signal === 'SIGKILL') assert.equal(actualSignal, 'SIGKILL');
        else assert.equal(code, 0);
      }
    };
  }
  async function connect(service) {
    const ws = new WebSocket(service.listening.websocket, 'ocean.v1', { origin });
    sockets.add(ws); ws.on('error', () => {}); ws.on('close', () => sockets.delete(ws));
    const messages = [], waiters = new Set();
    const closed = once(ws, 'close'); closed.catch(() => {});
    ws.on('message', raw => {
      messages.push(JSON.parse(raw.toString()));
      for (const notify of waiters) notify();
    });
    await once(ws, 'open');
    const peer = {
      ws, messages, closed, session: null, seq: 0,
      send(message) { ws.send(JSON.stringify(message)); },
      async next(types) {
        if (!Array.isArray(types)) types = [types];
        const take = () => { const index = messages.findIndex(m => types.includes(m.type)); return index < 0 ? undefined : messages.splice(index, 1)[0]; };
        const found = take(); if (found) return found;
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => { waiters.delete(notify); reject(Error('Timed out waiting for ' + types.join('/'))); }, 1500);
          function notify() { const value = take(); if (value) { clearTimeout(timer); waiters.delete(notify); resolve(value); } }
          waiters.add(notify);
        });
      },
      op(type, fields = {}) { peer.send({ type, roomEpoch: peer.session.roomEpoch, generation: peer.session.generation, seq: ++peer.seq, ...fields }); },
      async acceptJoined() {
        const message = await peer.next(['joined', 'error']);
        assert.equal(message.type, 'joined', 'Durable restart must restore the admitted seat; response was ' + (message.code || message.type));
        peer.session = message; peer.seq = 0;
        return message;
      },
      async confirm() { peer.op('confirm'); await peer.next('ack'); }
    };
    await peer.next('hello');
    return peer;
  }
  return { start, connect, directory, stateFile };
}

async function createHost(f, service, confirm = true) {
  const host = await f.connect(service);
  const admission = { type: 'create', ...handshake, admissionNonce: nonce(), name: 'Host' };
  host.send(admission); await host.acceptJoined(); if (confirm) await host.confirm();
  return { host, admission };
}

async function createPair(f, service, confirmGuest = true) {
  const { host, admission: hostAdmission } = await createHost(f, service);
  const guest = await f.connect(service);
  const admission = { type: 'request', ...handshake, admissionNonce: nonce(), roomId: host.session.roomId, name: 'Guest' };
  guest.send(admission); await guest.next('pending'); const request = await host.next('join-request');
  host.op('decide', { requestId: request.requestId, approve: true }); await host.next('ack');
  await guest.acceptJoined(); if (confirmGuest) await guest.confirm();
  return { host, guest, admission, hostAdmission };
}

// Drop one actual, complete unmasked server text frame after hello. The captured
// wire message is a RAM-only oracle for original IDs, never client delivery or
// authority mutation. No raw capabilities appear in test diagnostics.
async function lossyProxy(t, service) {
  const port = Number(new URL(service.listening.websocket).port), sockets = new Set();
  let armed = null;
  const proxy = net.createServer(downstream => {
    const upstream = net.connect(port, '127.0.0.1');
    sockets.add(downstream); sockets.add(upstream);
    for (const socket of [downstream, upstream]) {
      socket.on('error', () => {});
      socket.on('close', () => { sockets.delete(socket); downstream.destroy(); upstream.destroy(); });
    }
    downstream.pipe(upstream);
    upstream.on('data', bytes => {
      if (!armed) { downstream.write(bytes); return; }
      armed.bytes = Buffer.concat([armed.bytes, bytes]); const data = armed.bytes;
      if (data.length < 2) return;
      let length = data[1] & 127, offset = 2;
      if (length === 126) { if (data.length < 4) return; length = data.readUInt16BE(2); offset = 4; }
      assert.equal(data[0], 0x81, 'Fault intercepts one real complete text frame');
      assert.equal(data[1] & 128, 0); assert.ok(length <= 4096);
      if (data.length < offset + length) return;
      const done = armed; armed = null;
      const message = JSON.parse(data.subarray(offset, offset + length).toString());
      downstream.destroy(); upstream.destroy(); done.resolve(message);
    });
  });
  await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => proxy.close(resolve)); });
  return {
    listening: { websocket: `ws://127.0.0.1:${proxy.address().port}/v1` },
    dropNext() { assert.equal(armed, null); return new Promise(resolve => { armed = { resolve, bytes: Buffer.alloc(0) }; }); }
  };
}

async function startFactory(t, f, options = {}) {
  const app = createOceanServer({ contentVersion, allowedOrigins: [origin], stateFile: f.stateFile, ...options });
  await app.listen(0, '127.0.0.1'); let stopped = false;
  const stop = async () => { if (!stopped) { stopped = true; await app.close(); } };
  t.after(stop);
  return { listening: { http: `http://127.0.0.1:${app.address().port}`,
    websocket: `ws://127.0.0.1:${app.address().port}/v1` }, stop };
}

function readDocument(f) {
  const store = openRoomStore({ path: f.stateFile, contentVersion });
  try { return store.load(); } finally { store.close(); }
}

test('acknowledged room, approval and closed visits survive repeated real SIGKILL/restart', async t => {
  const f = await fixture(t); let service = await f.start();
  let host = await f.connect(service), guest = await f.connect(service);
  host.send({ type: 'create', ...handshake, admissionNonce: nonce(), name: 'Host' });
  await host.acceptJoined(); await host.confirm();
  guest.send({ type: 'request', ...handshake, admissionNonce: nonce(), roomId: host.session.roomId, name: 'Guest' });
  await guest.next('pending'); const pending = await host.next('join-request');
  host.op('decide', { requestId: pending.requestId, approve: true });
  await host.next('ack'); await guest.acceptJoined(); await guest.confirm();
  host.op('visits', { open: false }); await host.next('ack');
  const roomId = host.session.roomId, roomEpoch = host.session.roomEpoch;
  const memberIds = [host.session.memberId, guest.session.memberId];
  for (let cycle = 0; cycle < 3; cycle++) {
    const previous = [host.session, guest.session];
    await service.stop('SIGKILL'); service = await f.start();
    host = await f.connect(service); guest = await f.connect(service);
    for (const [index, peer] of [host, guest].entries()) {
      peer.send({ type: 'resume', ...handshake, roomId, memberId: memberIds[index],
        resumeToken: previous[index].resumeToken, resumeNonce: nonce() });
      const current = await peer.acceptJoined();
      assert.equal(current.roomId, roomId); assert.equal(current.roomEpoch, roomEpoch);
      assert.equal(current.memberId, memberIds[index]);
      assert.equal(current.generation, previous[index].generation + 1);
      assert.equal(current.snapshot.visitsOpen, false);
      assert.equal(current.snapshot.members.length, 2);
      assert.ok(current.resumeToken !== previous[index].resumeToken, 'Resume rotates the private capability');
      assert.deepEqual(current.snapshot.members.map(m => m.id).sort(), memberIds.slice().sort());
      await peer.confirm();
    }
  }
  host.op('leave'); await host.next('left');
});

test('a first host joined lost on TCP survives SIGKILL; confirmed proof cannot revive', async t => {
  const f = await fixture(t); let service = await f.start();
  const proxy = await lossyProxy(t, service), interrupted = await f.connect(proxy);
  const admission = { type: 'create', ...handshake, admissionNonce: nonce(), name: 'Host' };
  const loss = proxy.dropNext(); interrupted.send(admission);
  const original = await loss; assert.equal(original.type, 'joined'); await interrupted.closed;
  assert.equal(interrupted.messages.some(m => m.type === 'joined'), false, 'Lost joined never reached client');
  await service.stop(); service = await f.start();
  const recovered = await f.connect(service); recovered.send({ type: 'recover', admission });
  const joined = await recovered.acceptJoined();
  assert.equal(joined.roomId, original.roomId); assert.equal(joined.roomEpoch, original.roomEpoch);
  assert.equal(joined.memberId, original.memberId); assert.equal(joined.generation, original.generation + 1);
  assert.equal(joined.snapshot.members.length, 1); await recovered.confirm();
  await service.stop(); service = await f.start();
  const stale = await f.connect(service); stale.send({ type: 'recover', admission });
  assert.equal((await stale.next('error')).code, 'admission_invalid');
  stale.send(admission); assert.equal((await stale.next('error')).code, 'admission_used');
  stale.send(resume(joined)); assert.equal((await stale.acceptJoined()).memberId, original.memberId);
});

test('an approved guest joined lost on TCP survives SIGKILL without a second approval', async t => {
  const f = await fixture(t); let service = await f.start(); const { host } = await createHost(f, service);
  const proxy = await lossyProxy(t, service), interrupted = await f.connect(proxy);
  const admission = { type: 'request', ...handshake, admissionNonce: nonce(), roomId: host.session.roomId, name: 'Guest' };
  interrupted.send(admission); await interrupted.next('pending'); const pending = await host.next('join-request');
  const loss = proxy.dropNext(); host.op('decide', { requestId: pending.requestId, approve: true });
  await host.next('ack'); const original = await loss; await interrupted.closed;
  assert.equal(original.type, 'joined'); assert.equal(interrupted.messages.some(m => m.type === 'joined'), false);
  await service.stop(); service = await f.start();
  const recovered = await f.connect(service); recovered.send({ type: 'recover', admission });
  const joined = await recovered.acceptJoined();
  assert.equal(joined.memberId, original.memberId); assert.equal(joined.roomEpoch, original.roomEpoch);
  assert.equal(joined.generation, original.generation + 1); assert.equal(joined.snapshot.members.length, 2);
  assert.equal(joined.snapshot.members.find(m => m.id === host.session.memberId).connected, false);
  assert.equal(joined.snapshot.members.every(m => m.pose === null), true);
  assert.equal(Object.hasOwn(joined.snapshot, 'pending'), false); await recovered.confirm();
});

test('a lost rotated joined retains the exact retry proof across SIGKILL until confirmation', async t => {
  const f = await fixture(t); let service = await f.start(); const { host, guest } = await createPair(f, service);
  host.op('pose', { pose: validPose }); await guest.next('pose');
  const request = resume(guest.session), proxy = await lossyProxy(t, service), interrupted = await f.connect(proxy);
  const loss = proxy.dropNext(); interrupted.send(request); const dropped = await loss; await interrupted.closed;
  assert.equal(dropped.type, 'joined'); assert.equal(interrupted.messages.some(m => m.type === 'joined'), false);
  await service.stop(); service = await f.start();
  const retry = await f.connect(service); retry.send(request); const joined = await retry.acceptJoined();
  assert.equal(joined.memberId, guest.session.memberId); assert.equal(joined.roomEpoch, guest.session.roomEpoch);
  assert.equal(joined.generation, dropped.generation + 1); assert.equal(joined.snapshot.members.length, 2);
  assert.equal(joined.snapshot.members.find(m => m.id === host.session.memberId).connected, false);
  assert.equal(joined.snapshot.members.every(m => m.pose === null), true); await retry.confirm();
  await service.stop(); service = await f.start();
  const stale = await f.connect(service); stale.send(request);
  assert.equal((await stale.next('error')).code, 'resume_invalid');
  stale.send(resume(joined)); assert.equal((await stale.acceptJoined()).memberId, joined.memberId);
});

test('a lost pending response preserves its original request and expiry across SIGKILL', async t => {
  const f = await fixture(t); let service = await f.start(); const { host } = await createHost(f, service);
  const proxy = await lossyProxy(t, service), interrupted = await f.connect(proxy);
  const admission = { type: 'request', ...handshake, admissionNonce: nonce(), roomId: host.session.roomId, name: 'Guest' };
  const loss = proxy.dropNext(); interrupted.send(admission); const pending = await loss;
  assert.equal(pending.type, 'pending'); assert.equal((await host.next('join-request')).requestId, pending.requestId);
  await service.stop(); service = await f.start();
  const newHost = await f.connect(service); newHost.send(resume(host.session)); const hostState = await newHost.acceptJoined();
  assert.equal(hostState.snapshot.pending.length, 1); assert.equal(hostState.snapshot.pending[0].requestId, pending.requestId);
  const expiresAt = hostState.snapshot.pending[0].expiresAt; await newHost.confirm();
  const guest = await f.connect(service); guest.send({ type: 'recover', admission });
  assert.equal((await guest.next('pending')).requestId, pending.requestId);
  await service.stop(); service = await f.start();
  const finalHost = await f.connect(service); finalHost.send(resume(newHost.session)); await finalHost.acceptJoined();
  assert.equal(finalHost.session.snapshot.pending[0].expiresAt, expiresAt);
  const finalGuest = await f.connect(service); finalGuest.send({ type: 'recover', admission }); await finalGuest.next('pending');
  finalHost.op('decide', { requestId: pending.requestId, approve: true }); await finalHost.next('ack');
  assert.equal((await finalGuest.acceptJoined()).snapshot.members.length, 2);
});

test('denied, cancelled and explicitly left rights never revive after SIGKILL', async t => {
  for (const action of ['deny', 'cancel', 'guest-leave', 'host-leave']) await t.test(action, async t => {
    const f = await fixture(t); let service = await f.start(); const { host } = await createHost(f, service);
    const guest = await f.connect(service);
    const admission = { type: 'request', ...handshake, admissionNonce: nonce(), roomId: host.session.roomId, name: 'Guest' };
    guest.send(admission); await guest.next('pending'); const pending = await host.next('join-request');
    let previous = null;
    if (action === 'cancel') { guest.send({ type: 'cancel' }); await guest.next('cancelled'); }
    else {
      host.op('decide', { requestId: pending.requestId, approve: action !== 'deny' }); await host.next('ack');
      if (action === 'deny') await guest.next('rejected');
      else {
        previous = await guest.acceptJoined();
        const leaver = action === 'guest-leave' ? guest : host; leaver.op('leave'); await leaver.next('left');
      }
    }
    await service.stop(); service = await f.start(); const stale = await f.connect(service);
    stale.send({ type: 'recover', admission }); assert.equal((await stale.next('error')).code, 'admission_invalid');
    stale.send(admission); assert.equal((await stale.next('error')).code, 'admission_used');
    if (previous) { stale.send(resume(previous)); assert.equal((await stale.next('error')).code, 'resume_invalid'); }
    if (action === 'host-leave') { stale.send(resume(host.session)); assert.equal((await stale.next('error')).code, 'resume_invalid'); }
  });
});

test('a second real CLI cannot write the same file; SIGKILL releases its exclusive lock', async t => {
  const f = await fixture(t); let service = await f.start(); const { host } = await createHost(f, service);
  const failure = await f.start({}, true);
  assert.equal(failure.stderr.includes(f.stateFile), false, 'Startup failure does not disclose the storage path');
  assert.equal((await fetch(service.listening.http + '/health', { headers: { Connection: 'close' } })).status, 200);
  host.op('visits', { open: false }); await host.next('ack');
  await service.stop(); service = await f.start();
  const recovered = await f.connect(service); recovered.send(resume(host.session));
  assert.equal((await recovered.acceptJoined()).snapshot.visitsOpen, false);
});

test('content version mismatch never overwrites the acknowledged room file', async t => {
  const f = await fixture(t); let service = await f.start(); const { host } = await createHost(f, service);
  await service.stop(); const before = await readFile(f.stateFile);
  await f.start({ OCEAN_CONTENT_VERSION: 'different-content' }, true);
  assert.equal(before.equals(await readFile(f.stateFile)), true, 'Version refusal leaves database bytes unchanged');
  service = await f.start(); const recovered = await f.connect(service); recovered.send(resume(host.session));
  assert.equal((await recovered.acceptJoined()).memberId, host.session.memberId);
});

test('empty, corrupt and oversized files fail before listening without being reset', async t => {
  for (const [label, bytes] of [['empty', Buffer.alloc(0)], ['corrupt', Buffer.from('not an Ocean SQLite file')], ['oversized', Buffer.alloc(4 * 1024 * 1024 + 1)]]) {
    await t.test(label, async t => {
      const f = await fixture(t); await writeFile(f.stateFile, bytes);
      await f.start({}, true);
      assert.equal(bytes.equals(await readFile(f.stateFile)), true, 'Rejected file bytes must be preserved');
    });
  }
});

test('only digests, never network capabilities or pose history, are written to database and sidecars', async t => {
  const f = await fixture(t); let service = await f.start();
  const { host, guest, admission, hostAdmission } = await createPair(f, service, false);
  const request = resume(guest.session), replacement = await f.connect(service);
  replacement.send(request); await replacement.acceptJoined();
  host.op('pose', { pose: validPose }); await replacement.next('pose');
  host.op('preset', { category: 'social', preset: 'hello' }); await host.next('preset'); await replacement.next('preset');
  const secrets = [admission.admissionNonce, hostAdmission.admissionNonce, host.session.resumeToken,
    guest.session.resumeToken, replacement.session.resumeToken, request.resumeNonce];
  await service.stop();
  const files = (await readdir(f.directory)).filter(name => name.startsWith('rooms.sqlite'));
  assert.ok(files.includes('rooms.sqlite'));
  for (const name of files) {
    const path = join(f.directory, name), bytes = await readFile(path);
    for (const secret of secrets) assert.equal(bytes.includes(Buffer.from(secret)), false, 'Persisted bytes exclude every issued private capability');
    for (const key of ['"resumeToken"', '"admissionNonce"', '"resumeNonce"', '"position"', '"pose"', '"preset":"hello"']) {
      assert.equal(bytes.includes(Buffer.from(key)), false, 'Persisted bytes exclude private and transient fields');
    }
    assert.equal((await stat(path)).mode & 0o077, 0, 'Database and sidecars are owner-only');
  }
  const document = readDocument(f);
  assert.match(document.rooms[0].members[0].resumeHash, /^[a-f0-9]{64}$/);
  assert.equal(document.rooms[0].members.some(m => m.resumeRetry !== null), true);
  assert.equal(document.rooms[0].members.some(m => m.presetBudget !== null), true);
});

test('service restarts do not extend disconnected seats or pending admission deadlines', async t => {
  for (const scope of ['pending', 'disconnected seat']) await t.test(scope, async t => {
    const f = await fixture(t), options = { resumeGraceMs: 1400, pendingTtlMs: 1000, sweepMs: 20 };
    let service = await startFactory(t, f, options); const { host } = await createHost(f, service);
    const admission = { type: 'request', ...handshake, admissionNonce: nonce(), roomId: host.session.roomId, name: 'Guest' };
    let deadlineUpperBound;
    if (scope === 'pending') {
      const guest = await f.connect(service); guest.send(admission); await guest.next('pending');
      deadlineUpperBound = Date.now() + options.pendingTtlMs;
    }
    await service.stop();
    if (scope === 'disconnected seat') deadlineUpperBound = Date.now() + options.resumeGraceMs;
    for (let restart = 0; restart < 2; restart++) {
      await delay(150); service = await startFactory(t, f, options); await service.stop();
    }
    await delay(Math.max(0, deadlineUpperBound - Date.now() + 20));
    service = await startFactory(t, f, options); const expired = await f.connect(service);
    if (scope === 'pending') {
      expired.send({ type: 'recover', admission }); assert.equal((await expired.next('error')).code, 'admission_invalid');
      // The host seat must still work: a vanished room cannot accidentally make
      // the pending-deadline assertion pass.
      expired.send(resume(host.session)); assert.equal((await expired.acceptJoined()).memberId, host.session.memberId);
    } else {
      expired.send(resume(host.session)); assert.equal((await expired.next('error')).code, 'resume_invalid');
    }
  });
});

test('restarting before a fixed resume retry deadline does not renew that proof', async t => {
  const f = await fixture(t), options = { resumeGraceMs: 1300, sweepMs: 20 };
  let service = await startFactory(t, f, options); const { host } = await createHost(f, service);
  const request = resume(host.session), retry = await f.connect(service); retry.send(request); await retry.acceptJoined();
  const deadlineUpperBound = Date.now() + options.resumeGraceMs; await service.stop();
  await delay(250); service = await startFactory(t, f, options);
  const again = await f.connect(service); again.send(request); await again.acceptJoined(); await service.stop();
  await delay(Math.max(0, deadlineUpperBound - Date.now() + 20));
  service = await startFactory(t, f, options); const expired = await f.connect(service);
  expired.send(request); assert.equal((await expired.next('error')).code, 'resume_invalid');
  expired.send(resume(again.session)); assert.equal((await expired.acceptJoined()).memberId, host.session.memberId);
});

test('initial admission recovery does not renew its proof when the recovered seat is still live', async t => {
  const f = await fixture(t), options = { resumeGraceMs: 1300, sweepMs: 20 };
  let service = await startFactory(t, f, options); const { host, admission } = await createHost(f, service, false);
  const deadlineUpperBound = Date.now() + options.resumeGraceMs; await service.stop();
  await delay(300); service = await startFactory(t, f, options);
  const recovered = await f.connect(service); recovered.send({ type: 'recover', admission }); await recovered.acceptJoined();
  await service.stop(); await delay(Math.max(0, deadlineUpperBound - Date.now() + 20));
  service = await startFactory(t, f, options); const expired = await f.connect(service);
  expired.send({ type: 'recover', admission }); assert.equal((await expired.next('error')).code, 'admission_invalid');
  expired.send(resume(recovered.session)); assert.equal((await expired.acceptJoined()).memberId, host.session.memberId);
});

test('store guards reject invalid JSON, capabilities, versions and UTF-8 payload overflow without changing the last commit', async t => {
  const f = await fixture(t), service = await f.start(); const { host } = await createHost(f, service); await service.stop();
  const store = openRoomStore({ path: f.stateFile, contentVersion }); t.after(() => store.close());
  const original = store.load(), before = JSON.stringify(original);
  const corruptions = [
    document => { document.schema = 2; },
    document => { document.contentVersion = 'wrong-content'; },
    document => { document.extra = { resumeToken: host.session.resumeToken }; },
    document => { document.extra = { admissionNonce: nonce() }; },
    document => { document.extra = { resumeNonce: nonce() }; },
    document => { document.extra = Number.NaN; },
    document => { document.extra = undefined; },
    document => { document.extra = document; },
    document => { document.extra = '漢'.repeat(400000); }
  ];
  for (const corrupt of corruptions) {
    const document = structuredClone(original); corrupt(document);
    assert.throws(() => store.commit(document), /room_store_/);
    assert.equal(JSON.stringify(store.load()), before, 'Rejected input never replaces acknowledged state');
  }
});

test('an unsupported SQLite format version fails closed and preserves the file', async t => {
  const f = await fixture(t), service = await f.start(); await createHost(f, service); await service.stop();
  const { DatabaseSync } = await import('node:sqlite');
  const database = new DatabaseSync(f.stateFile);
  // Negative format-corruption fixture, never a shortcut to grant authority.
  database.exec('PRAGMA user_version=2'); database.close();
  const before = await readFile(f.stateFile); await f.start({}, true);
  assert.equal(before.equals(await readFile(f.stateFile)), true);
});

test('an OS clock rollback refuses to start without rewriting durable authority', async t => {
  const f = await fixture(t), beforeStartup = Date.now(), service = await startFactory(t, f);
  await createHost(f, service); await service.stop(); const before = await readFile(f.stateFile);
  const clock = t.mock.method(Date, 'now', () => beforeStartup - 1);
  try { assert.throws(() => createOceanServer({ contentVersion, allowedOrigins: [origin], stateFile: f.stateFile }), /invalid_room_state/); }
  finally { clock.mock.restore(); }
  assert.equal(before.equals(await readFile(f.stateFile)), true, 'Clock refusal preserves database bytes');
});

test('an invalid persisted authority relationship fails closed without an empty replacement', async t => {
  const f = await fixture(t), service = await f.start(); await createHost(f, service); await service.stop();
  const store = openRoomStore({ path: f.stateFile, contentVersion });
  const corrupt = store.load();
  // Corruption-only negative fixture: no modified document is used to grant a seat.
  corrupt.rooms[0].members[0].generation = 0;
  store.commit(corrupt); store.close(); const before = await readFile(f.stateFile);
  await f.start({}, true);
  assert.equal(before.equals(await readFile(f.stateFile)), true, 'Invalid authority must remain unavailable and unchanged');
});

test('corrupt future deadlines cannot extend authority past its configured lifetime', async t => {
  for (const field of ['resumeUntil', 'admission.until', 'resumeRetry.until']) await t.test(field, async t => {
    const f = await fixture(t), service = await f.start(); const { host } = await createHost(f, service, false);
    if (field === 'resumeRetry.until') {
      const next = await f.connect(service); next.send(resume(host.session)); await next.acceptJoined();
    }
    await service.stop();
    const store = openRoomStore({ path: f.stateFile, contentVersion }), corrupt = store.load();
    // Negative disk corruption fixture only. Success means no service listens;
    // these altered deadlines are never used to obtain or recover authority.
    const beyondBound = corrupt.savedAt + 30001;
    if (field === 'resumeUntil') corrupt.rooms[0].members[0].resumeUntil = beyondBound;
    else if (field === 'admission.until') corrupt.admissions.find(a => a.hash !== null).until = beyondBound;
    else corrupt.rooms[0].members[0].resumeRetry.until = beyondBound;
    store.commit(corrupt); store.close(); const before = await readFile(f.stateFile);
    await f.start({}, true);
    assert.equal(before.equals(await readFile(f.stateFile)), true, 'Bad deadline remains rejected without resetting the file');
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import WebSocket from 'ws';

test('CLI starts a real local service using the repository content version and shuts down cleanly', async t => {
  const child = spawn(process.execPath, ['cli.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { PATH: process.env.PATH, OCEAN_PORT: '0', OCEAN_HOST: '127.0.0.1', OCEAN_ALLOWED_ORIGINS: 'https://jspusa.github.io' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => { if (child.exitCode === null) child.kill('SIGTERM'); });
  const exit = once(child, 'exit');
  let output = ''; let errors = '';
  child.stderr.on('data', chunk => { errors += chunk; });
  const listening = await new Promise((resolve, reject) => {
    child.stdout.on('data', chunk => {
      output += chunk;
      if (output.includes('\n')) resolve(JSON.parse(output.split('\n')[0]));
    });
    child.once('exit', () => reject(new Error('CLI exited before listening')));
  });
  const version = (await readFile(new URL('../../VERSION', import.meta.url), 'utf8')).trim();
  assert.equal(listening.contentVersion, 'ocean-' + version);
  assert.equal((await fetch(listening.http + '/health')).status, 200);
  const ws = new WebSocket(listening.websocket, 'ocean.v1', { origin: 'https://jspusa.github.io' });
  const helloPromise = once(ws, 'message');
  await once(ws, 'open');
  assert.equal(JSON.parse((await helloPromise)[0].toString()).contentVersion, 'ocean-' + version);
  ws.close(); await once(ws, 'close');
  child.kill('SIGTERM'); assert.equal((await exit)[0], 0);
  assert.equal(errors, '');
  assert.equal(output.includes('resumeToken'), false);
});

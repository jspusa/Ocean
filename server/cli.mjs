import { readFile } from 'node:fs/promises';
import { createOceanServer } from './server.mjs';

let app;
try {
  const version = (await readFile(new URL('../VERSION', import.meta.url), 'utf8')).trim();
  const contentVersion = process.env.OCEAN_CONTENT_VERSION || `ocean-${version}`;
  const port = Number(process.env.OCEAN_PORT ?? 8787);
  const host = process.env.OCEAN_HOST || '127.0.0.1';
  const stateFile = process.env.OCEAN_STATE_FILE;
  const allowedOrigins = (process.env.OCEAN_ALLOWED_ORIGINS || 'http://127.0.0.1:8000,http://localhost:8000,https://jspusa.github.io').split(',').map(value => value.trim());
  if (!Number.isInteger(port) || port < 0 || port > 65535 || !/^[A-Za-z0-9._-]{1,128}$/.test(contentVersion)) throw new Error('invalid_configuration');
  if (stateFile !== undefined && !stateFile.trim()) throw new Error('invalid_configuration');
  app = createOceanServer({ contentVersion, allowedOrigins, stateFile });
  await app.listen(port, host);
  const bound = app.address();
  const address = bound.address.includes(':') ? `[${bound.address}]` : bound.address;
  // Only public endpoint metadata is logged; never request paths, payloads or capabilities.
  process.stdout.write(JSON.stringify({ event: 'listening', http: `http://${address}:${bound.port}`, websocket: `ws://${address}:${bound.port}/v1`, contentVersion }) + '\n');
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await app.close();
    process.exitCode = 0;
  };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
} catch {
  process.stderr.write('Unable to start Ocean room server; check port and configuration.\n');
  if (app) await app.close();
  process.exitCode = 1;
}

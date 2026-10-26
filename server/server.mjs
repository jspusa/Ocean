import http from 'node:http';
import { once } from 'node:events';
import { WebSocketServer, WebSocket } from 'ws';
import { createRooms } from './rooms.mjs';

export function createOceanServer({ contentVersion, allowedOrigins = ['https://jspusa.github.io'], sweepMs = 1000, messageBurst = 60, messageRate = 40, handshakeTimeoutMs = 5000, heartbeatMs = 15000, maxConnections = 128, maxConnectionsPerIp = 8, maxBufferedBytes = 65536, ...options } = {}) {
  if (typeof contentVersion !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/.test(contentVersion)) throw new TypeError('contentVersion is required');
  if (!Array.isArray(allowedOrigins) || !allowedOrigins.length || allowedOrigins.some(origin => {
    try { const url = new URL(origin); return url.origin !== origin || !['http:', 'https:'].includes(url.protocol); }
    catch { return true; }
  })) throw new TypeError('allowedOrigins must contain exact HTTP(S) origins');
  const rooms = createRooms({ contentVersion, ...options });
  const sweep = setInterval(() => rooms.sweep(), sweepMs); sweep.unref();
  const server = http.createServer({ maxHeaderSize: 8192, requestTimeout: 10000, headersTimeout: 10000, keepAliveTimeout: 5000 }, (request, response) => {
    const healthy = request.method === 'GET' && request.url === '/health';
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json');
    response.writeHead(healthy ? 200 : 404);
    response.end(JSON.stringify(healthy ? { status: 'ok' } : { error: 'not_found' }));
    request.resume();
  });
  server.maxConnections = maxConnections * 2;
  server.maxRequestsPerSocket = 100;
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: 4096, maxFragments: 32, maxBufferedChunks: 32 });
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.alive) { ws.terminate(); continue; }
      ws.alive = false; ws.ping();
    }
  }, heartbeatMs); heartbeat.unref();
  server.on('upgrade', (request, socket, head) => {
    if (request.url !== '/v1' || request.headers['sec-websocket-protocol'] !== 'ocean.v1' || !allowedOrigins.includes(request.headers.origin)) {
      socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
    }
    const address = socket.remoteAddress;
    if (wss.clients.size >= maxConnections || [...wss.clients].filter(ws => ws.remoteAddress === address).length >= maxConnectionsPerIp) {
      socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n'); return;
    }
    wss.handleUpgrade(request, socket, head, ws => {
      ws.remoteAddress = address; ws.alive = true;
      ws.on('pong', () => { ws.alive = true; });
      let tokens = messageBurst, tokenAt = performance.now();
      let closeTimer;
      const peer = {
        send(message) {
          if (ws.readyState !== WebSocket.OPEN) return;
          const text = JSON.stringify(message);
          if (ws.bufferedAmount > maxBufferedBytes) { peer.close(1013, 'slow_consumer'); return; }
          ws.send(text);
        },
        close(code = 1008, reason = 'closed') {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.close(code, reason);
          closeTimer = setTimeout(() => ws.terminate(), 250); closeTimer.unref();
        }
      };
      const handshakeTimer = setTimeout(() => { if (!peer.member && !peer.pending) peer.close(1008, 'handshake_timeout'); }, handshakeTimeoutMs); handshakeTimer.unref();
      ws.on('error', () => {});
      ws.on('message', (raw, isBinary) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const now = performance.now();
        tokens = Math.min(messageBurst, tokens + (now - tokenAt) * messageRate / 1000); tokenAt = now;
        if (tokens < 1) { peer.send({ type: 'error', code: 'rate_limited' }); peer.close(1008, 'rate_limited'); return; }
        tokens--;
        if (isBinary) { peer.close(1003, 'text_only'); return; }
        try { rooms.message(peer, JSON.parse(raw.toString())); if (peer.member || peer.pending) clearTimeout(handshakeTimer); }
        catch { peer.send({ type: 'error', code: 'invalid_message' }); }
      });
      ws.on('close', () => { clearTimeout(handshakeTimer); clearTimeout(closeTimer); rooms.disconnect(peer); });
      rooms.connect(peer);
    });
  });
  return {
    async listen(port = 8787, host = '127.0.0.1') { server.listen(port, host); await once(server, 'listening'); },
    address() { return server.address(); },
    async close() {
      for (const ws of wss.clients) ws.terminate();
      clearInterval(sweep); clearInterval(heartbeat); rooms.shutdown();
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
      await new Promise(resolve => wss.close(resolve));
    }
  };
}

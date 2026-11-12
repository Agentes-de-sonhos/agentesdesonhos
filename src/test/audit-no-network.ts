import { afterAll, afterEach, beforeEach, expect } from 'vitest';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';

const attempts: string[] = [];
function blocked(): never {
  attempts.push('network blocked');
  throw new Error('Smoke isolation: external network forbidden');
}
class BlockedTransport {
  constructor() { blocked(); }
}

// Install before test-module imports, then reapply before every scenario.
// Direct definitions are intentionally independent of Vitest's mock/global
// registries: restoreAllMocks/unstubAllGlobals cannot remove this guard.
function installNetworkGuard() {
  for (const [key, value] of Object.entries({ fetch: blocked, XMLHttpRequest: BlockedTransport, WebSocket: BlockedTransport })) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  http.request = blocked as typeof http.request;
  http.get = blocked as typeof http.get;
  https.request = blocked as typeof https.request;
  https.get = blocked as typeof https.get;
  net.connect = blocked as typeof net.connect;
  net.createConnection = blocked as typeof net.createConnection;
  tls.connect = blocked as typeof tls.connect;
}
installNetworkGuard();
beforeEach(installNetworkGuard);
afterEach(() => {
  expect(globalThis.fetch).toBe(blocked);
  expect(globalThis.XMLHttpRequest).toBe(BlockedTransport);
  expect(globalThis.WebSocket).toBe(BlockedTransport);
  for (const transport of [http.request, http.get, https.request, https.get, net.connect, net.createConnection, tls.connect]) {
    expect(transport).toBe(blocked);
  }
});
afterAll(() => expect(attempts, 'No attempted network connection').toEqual([]));

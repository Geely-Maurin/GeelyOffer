import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// Regression test for "every Geely E2 trim shows twice": the live database already had E2
// trims entered by hand in Beheer → Voertuigen before the seeded geely-e2-* rows arrived.
// Reproduces that state and checks a restart leaves exactly one active row per trim.
// Needs a restart mid-test, so it runs its own server rather than sharing
// integration.test.js's.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ENTRY = path.join(__dirname, '../server.js');
const PORT = 5098;
const BASE_URL = `http://localhost:${PORT}`;
const ADMIN_EMAIL = 'dup-admin@geely.local';
const ADMIN_PASSWORD = 'DuplicateTest123!';
const tempDbPath = path.join(os.tmpdir(), `geely-e2dup-test-${Date.now()}.db`);

let serverProcess;

async function startServer() {
  serverProcess = spawn(process.execPath, [SERVER_ENTRY], {
    env: {
      ...process.env,
      PORT: String(PORT),
      DATABASE_PATH: tempDbPath,
      JWT_SECRET: 'e2-duplicate-test-secret',
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      NODE_ENV: 'development',
    },
    stdio: 'ignore',
  });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(`${BASE_URL}/health`)).ok) {
        // Boot-time seeders run asynchronously after the server starts listening.
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return;
      }
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Server did not become healthy in time');
}

async function stopServer() {
  if (!serverProcess) return;
  const exited = new Promise((resolve) => serverProcess.once('exit', resolve));
  serverProcess.kill();
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))]);
  serverProcess = null;
}

async function login() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  return res.headers.get('set-cookie').split(';')[0];
}

async function vehicles(cookie, all = false) {
  const res = await fetch(`${BASE_URL}/api/vehicles${all ? '?all=true' : ''}`, { headers: { Cookie: cookie } });
  return res.json();
}

before(startServer);

after(async () => {
  await stopServer();
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    try { fs.unlinkSync(tempDbPath + suffix); } catch { /* fine if it never existed */ }
  }
});

test('a hand-added E2 trim that duplicates a seeded one is deactivated on the next boot', async () => {
  let cookie = await login();

  const addVehicle = (body) => fetch(`${BASE_URL}/api/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ name: 'Geely E2', fuel: 'Elektrisch', transmission: 'Automatisch', ...body }),
  });
  // Same trim as the seeded geely-e2-pro (different spelling on purpose), plus a trim the
  // seed doesn't have, which must be left alone.
  assert.equal((await addVehicle({ model: 'Pro ', basePrice: 21490 })).status, 201);
  assert.equal((await addVehicle({ model: 'SPORT', basePrice: 29990 })).status, 201);

  const before = (await vehicles(cookie)).filter((v) => v.name === 'Geely E2');
  assert.equal(before.filter((v) => v.model.trim().toUpperCase() === 'PRO').length, 2, 'reproduces the double PRO');

  await stopServer();
  await startServer();
  cookie = await login();

  const active = (await vehicles(cookie)).filter((v) => v.name === 'Geely E2');
  assert.deepEqual(active.map((v) => v.id).sort(), ['geely-e2-max', 'geely-e2-pro', 'geely-e2-ultra', active.find((v) => v.model === 'SPORT')?.id].sort());

  const all = (await vehicles(cookie, true)).filter((v) => v.name === 'Geely E2');
  const handAddedPro = all.find((v) => v.model === 'Pro ');
  assert.ok(handAddedPro, 'the hand-added PRO is kept (inactive), not deleted');
  assert.equal(handAddedPro.active, 0);
});

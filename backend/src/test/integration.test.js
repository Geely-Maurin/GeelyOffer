import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ENTRY = path.join(__dirname, '../server.js');
const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}`;
const ADMIN_EMAIL = 'integration-admin@geely.local';
const ADMIN_PASSWORD = 'IntegrationTest123!';

let serverProcess;
let tempDbPath;

async function waitForServer(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Server did not become healthy in time');
}

before(async () => {
  tempDbPath = path.join(os.tmpdir(), `geely-test-${Date.now()}.db`);
  serverProcess = spawn(process.execPath, [SERVER_ENTRY], {
    env: {
      ...process.env,
      PORT: String(PORT),
      DATABASE_PATH: tempDbPath,
      JWT_SECRET: 'integration-test-secret',
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      ADMIN_NAME: 'Integration Admin',
      NODE_ENV: 'development', // avoids the production JWT_SECRET fail-fast/static-file serving paths
    },
    stdio: 'ignore',
  });
  await waitForServer();
});

after(async () => {
  if (serverProcess) {
    const exited = new Promise((resolve) => serverProcess.once('exit', resolve));
    serverProcess.kill();
    // Wait for the process to actually exit before touching its DB file — on Windows,
    // killing a process doesn't synchronously release its open file handles, so deleting
    // too early silently fails to remove the file.
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))]);
  }
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    try { fs.unlinkSync(tempDbPath + suffix); } catch { /* fine if it never existed */ }
  }
});

function extractCookie(response) {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) return null;
  return setCookie.split(';')[0];
}

describe('server integration', () => {
  test('health check responds without auth', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    assert.equal(res.status, 200);
  });

  test('protected routes reject unauthenticated requests', async () => {
    const res = await fetch(`${BASE_URL}/api/quotes`);
    assert.equal(res.status, 401);
  });

  test('login with wrong password is rejected', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: 'not-the-password' }),
    });
    assert.equal(res.status, 401);
  });

  test('bootstrap admin can log in and reach protected routes', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    assert.equal(loginRes.status, 200);
    const cookie = extractCookie(loginRes);
    assert.ok(cookie, 'login should set a session cookie');

    const meRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: cookie } });
    assert.equal(meRes.status, 200);
    const { user } = await meRes.json();
    assert.equal(user.email, ADMIN_EMAIL);
    assert.equal(user.role, 'admin');
  });

  test('vehicles and accessories were seeded on first boot', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const cookie = extractCookie(loginRes);

    const vehiclesRes = await fetch(`${BASE_URL}/api/vehicles`, { headers: { Cookie: cookie } });
    const vehicles = await vehiclesRes.json();
    // 3x E5, 3x Starray EM-i, 3x Geely E2 (seedGeelyE2IfMissing in database/init.js). The
    // old "coming soon" E2 placeholder row must be gone.
    assert.equal(vehicles.length, 9);
    assert.deepEqual(
      vehicles.filter((v) => v.name === 'Geely E2').map((v) => [v.model, v.basePrice]).sort(),
      [['MAX', 23990], ['PRO', 21490], ['ULTRA', 26990]]
    );
    assert.ok(!vehicles.some((v) => v.id === 'geely-e2'), 'the E2 placeholder should have been retired');

    const accessoriesRes = await fetch(`${BASE_URL}/api/accessories`, { headers: { Cookie: cookie } });
    const accessories = await accessoriesRes.json();
    // 12 from STANDARD_ACCESSORIES (paint colors + upholstery for E5/Starray) + 6 from
    // GEELY_E2_ACCESSORIES (5 paints + 1 upholstery) + 1 from GEELY_E5_LATER_ACCESSORIES
    // (Moss Green) + 1 mandatory delivery pack (one row)
    // + 1 towing hook + 2 charging cables + 1 free standard white paint color (all models)
    // — the non-STANDARD_ACCESSORIES rows are seeded on every boot, see database/init.js.
    assert.equal(accessories.length, 24);
  });

  test('a Geely E2 quote gets the mandatory Delivery Pack, and the charging cables apply to the E2', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const cookie = extractCookie(loginRes);

    const accessories = await (await fetch(`${BASE_URL}/api/accessories`, { headers: { Cookie: cookie } })).json();
    for (const id of ['delivery-pack', 'laadkabel-3fasig-6m', 'laadkabel-3fasig-8m']) {
      const row = accessories.find((a) => a.id === id);
      assert.ok(row && row.vehicleModels.includes('Geely E2'), `${id} should apply to the Geely E2`);
    }
    assert.ok(!accessories.find((a) => a.id === 'towing-hook').vehicleModels.includes('Geely E2'), 'the E2 cannot tow — no towing hook');

    const quoteRes = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        customerName: 'E2 Delivery Pack Test',
        selectedVehicleId: 'geely-e2-pro',
        configuration: { vehicleName: 'Geely E2', vehicleModel: 'PRO' },
        accessories: [],
        discountPercentage: 0,
      }),
    });
    assert.equal(quoteRes.status, 201);
    const quote = await quoteRes.json();
    assert.equal(quote.totalPrice, 21490 + 949, 'E2 PRO adviesprijs plus the Delivery Pack, exactly once');

    const deleteRes = await fetch(`${BASE_URL}/api/quotes/${quote.id}`, { method: 'DELETE', headers: { Cookie: cookie } });
    assert.equal(deleteRes.status, 204);
  });

  test('creating a quote produces correct VAT-inclusive/exclusive totals end-to-end', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const cookie = extractCookie(loginRes);

    const vehiclesRes = await fetch(`${BASE_URL}/api/vehicles`, { headers: { Cookie: cookie } });
    const vehicles = await vehiclesRes.json();
    const e5pro = vehicles.find((v) => v.id === 'geely-e5-pro');
    assert.ok(e5pro, 'geely-e5-pro should exist in the seed data');

    const quoteRes = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        customerName: 'Integration Test Klant',
        selectedVehicleId: 'geely-e5-pro',
        configuration: { vehicleName: e5pro.name, vehicleModel: e5pro.model },
        accessories: [],
        discountPercentage: 0,
      }),
    });
    assert.equal(quoteRes.status, 201);
    const quote = await quoteRes.json();

    // The mandatory Delivery Pack (€949 incl. BTW) is injected server-side regardless of
    // what's submitted (see resolveMandatoryAccessories in routes/quotes.js) — so even an
    // empty accessories list still adds it on top of the bare adviesprijs.
    const DELIVERY_PACK_PRICE_INCL_VAT = 949.00;
    assert.equal(quote.totalPrice, e5pro.basePrice + DELIVERY_PACK_PRICE_INCL_VAT, 'incl-VAT total should equal the adviesprijs plus the mandatory delivery pack, with no discount/other accessories');
    assert.ok(quote.subtotal < quote.totalPrice, 'excl-VAT subtotal should be lower than the incl-VAT total');
    assert.equal(Math.round((quote.subtotal + quote.vatAmount) * 100) / 100, quote.totalPrice);
    assert.equal(quote.createdByName, 'Integration Admin');

    // Clean up the quote we just created
    const deleteRes = await fetch(`${BASE_URL}/api/quotes/${quote.id}`, { method: 'DELETE', headers: { Cookie: cookie } });
    assert.equal(deleteRes.status, 204);
  });

  test('a same-named mandatory fee scoped to "all models" does not double up with the model-specific one', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const cookie = extractCookie(loginRes);

    // Simulate the drift that caused the recurring "Delivery Pack twice on the Starray"
    // bug: a second mandatory "Delivery Pack" row scoped to every model (empty
    // vehicleModels), alongside the seeded model-specific delivery-pack-emi.
    const accRes = await fetch(`${BASE_URL}/api/accessories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Delivery Pack', price: 949, category: 'verplicht', vehicleModels: [], mandatory: true, discountable: false }),
    });
    assert.equal(accRes.status, 201);
    const rogueAccessory = await accRes.json();

    const vehiclesRes = await fetch(`${BASE_URL}/api/vehicles`, { headers: { Cookie: cookie } });
    const starray = (await vehiclesRes.json()).find((v) => v.name === 'Starray EM-i');
    assert.ok(starray, 'a Starray EM-i trim should exist in the seed data');

    const quoteRes = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        customerName: 'Starray Dup Test',
        selectedVehicleId: starray.id,
        configuration: { vehicleName: starray.name, vehicleModel: starray.model },
        accessories: [],
        discountPercentage: 0,
      }),
    });
    assert.equal(quoteRes.status, 201);
    const quote = await quoteRes.json();

    // Exactly one €949 Delivery Pack, not two.
    const deliveryLines = quote.items.filter((i) => i.name === 'Delivery Pack');
    assert.equal(deliveryLines.length, 1, 'the Delivery Pack must appear exactly once');
    assert.equal(quote.totalPrice, starray.basePrice + 949, 'total should include the delivery pack exactly once');

    await fetch(`${BASE_URL}/api/quotes/${quote.id}`, { method: 'DELETE', headers: { Cookie: cookie } });
    await fetch(`${BASE_URL}/api/accessories/${rogueAccessory.id}`, { method: 'DELETE', headers: { Cookie: cookie } });
  });

  test('an option scoped to specific trims is only accepted on those trims', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const cookie = extractCookie(loginRes);

    const vehicles = await (await fetch(`${BASE_URL}/api/vehicles`, { headers: { Cookie: cookie } })).json();
    const maxPlus = vehicles.find((v) => v.name === 'Starray EM-i' && v.model === 'MAX+');
    const pro = vehicles.find((v) => v.name === 'Starray EM-i' && v.model === 'PRO');
    assert.ok(maxPlus && pro, 'Starray EM-i MAX+ and PRO trims should exist');

    // An interior colour offered only on the MAX+ trim.
    const accRes = await fetch(`${BASE_URL}/api/accessories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ name: 'Bekleding: Nappa Zwart', price: 1200, category: 'interior', vehicleModels: [], vehicleTrims: [maxPlus.id] }),
    });
    assert.equal(accRes.status, 201);
    const trimOption = await accRes.json();
    assert.deepEqual(trimOption.vehicleTrims, [maxPlus.id], 'the API should echo back vehicleTrims');

    // Rejected on the PRO trim...
    const badQuote = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        customerName: 'Trim Scope Test', customerEmail: 'x@y.be', customerPhone: '0470', customerStreet: 'S1', customerPostalCode: '8800', customerCity: 'R',
        selectedVehicleId: pro.id,
        configuration: { vehicleName: pro.name, vehicleModel: pro.model },
        accessories: [{ id: trimOption.id }],
      }),
    });
    assert.equal(badQuote.status, 400, 'a trim-scoped option must be rejected on a trim it is not scoped to');

    // ...accepted on the MAX+ trim, and priced in.
    const goodQuote = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        customerName: 'Trim Scope Test', customerEmail: 'x@y.be', customerPhone: '0470', customerStreet: 'S1', customerPostalCode: '8800', customerCity: 'R',
        selectedVehicleId: maxPlus.id,
        configuration: { vehicleName: maxPlus.name, vehicleModel: maxPlus.model },
        accessories: [{ id: trimOption.id }],
      }),
    });
    assert.equal(goodQuote.status, 201);
    const created = await goodQuote.json();
    assert.ok(created.items.some((i) => i.name === 'Bekleding: Nappa Zwart'), 'the trim-scoped option should be on the MAX+ quote');

    await fetch(`${BASE_URL}/api/quotes/${created.id}`, { method: 'DELETE', headers: { Cookie: cookie } });
    await fetch(`${BASE_URL}/api/accessories/${trimOption.id}`, { method: 'DELETE', headers: { Cookie: cookie } });
  });

  test('the E5 defaults to its free Snowy White, and Moss Green is only offered on PRO+ / MAX+', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const cookie = extractCookie(loginRes);
    const customer = { customerName: 'E5 Colour Test', customerEmail: 'x@y.be', customerPhone: '0470', customerStreet: 'S1', customerPostalCode: '8800', customerCity: 'R' };
    const createQuote = (vehicleId, accessories) => fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ ...customer, selectedVehicleId: vehicleId, configuration: {}, accessories }),
    });

    // No colour chosen: the E5 gets Snowy White at €0, never the shared "Standaardkleur: Wit".
    const defaultRes = await createQuote('geely-e5-pro', []);
    assert.equal(defaultRes.status, 201);
    const defaultQuote = await defaultRes.json();
    const paint = defaultQuote.items.filter((i) => i.name.startsWith('Metallic:') || i.name.startsWith('Standaardkleur:'));
    assert.deepEqual(paint.map((i) => [i.name, i.price]), [['Metallic: Snowy White', 0]]);

    // Moss Green: rejected on PRO, accepted on PRO+.
    assert.equal((await createQuote('geely-e5-pro', [{ id: 'e5-paint-moss-green' }])).status, 400);
    const mossRes = await createQuote('geely-e5-pro-plus', [{ id: 'e5-paint-moss-green' }]);
    assert.equal(mossRes.status, 201);
    const mossQuote = await mossRes.json();
    assert.ok(mossQuote.items.some((i) => i.name === 'Metallic: Moss Green' && i.price === 650));

    for (const q of [defaultQuote, mossQuote]) {
      await fetch(`${BASE_URL}/api/quotes/${q.id}`, { method: 'DELETE', headers: { Cookie: cookie } });
    }
  });

  test('a showroom offer carries no customer or offer number and is blocked from customer flows', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const cookie = extractCookie(loginRes);

    // No customerName sent at all — a normal quote would 400 here.
    const createRes = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        isShowroom: true,
        selectedVehicleId: 'geely-e5-pro',
        configuration: { vehicleName: 'Geely E5', vehicleModel: 'PRO' },
        accessories: [],
      }),
    });
    assert.equal(createRes.status, 201);
    const showroom = await createRes.json();
    assert.equal(showroom.isShowroom, 1);
    assert.equal(showroom.sequenceNumber, null, 'a showroom offer gets no offer number');
    assert.equal(showroom.customerEmail, null);

    // It shows in the list (created just now, well within the 2h window)...
    const listRes = await fetch(`${BASE_URL}/api/quotes?limit=100`, { headers: { Cookie: cookie } });
    const list = await listRes.json();
    assert.ok(list.quotes.some((q) => q.id === showroom.id), 'showroom offer should be in the list within 2h');

    // ...but can't be mailed, duplicated, or edited.
    const mailRes = await fetch(`${BASE_URL}/api/quotes/${showroom.id}/send-email`, { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(mailRes.status, 400);
    const dupRes = await fetch(`${BASE_URL}/api/quotes/${showroom.id}/duplicate`, { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(dupRes.status, 400);
    const editRes = await fetch(`${BASE_URL}/api/quotes/${showroom.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ notes: 'x' }),
    });
    assert.equal(editRes.status, 400);

    // It is left out of the CSV export entirely.
    const csvRes = await fetch(`${BASE_URL}/api/quotes/export.csv`, { headers: { Cookie: cookie } });
    const csv = await csvRes.text();
    assert.ok(!csv.includes('Showroom'), 'showroom offer should not appear in the CSV export');

    const deleteRes = await fetch(`${BASE_URL}/api/quotes/${showroom.id}`, { method: 'DELETE', headers: { Cookie: cookie } });
    assert.equal(deleteRes.status, 204);
  });

  test('a sales-role user is blocked from admin-only routes', async () => {
    const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const adminCookie = extractCookie(adminLogin);

    const createRes = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ name: 'Sales Tester', email: 'sales-tester@geely.local', phone: '0470000000', password: 'SalesTester123!', role: 'sales' }),
    });
    assert.equal(createRes.status, 201);

    const salesLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sales-tester@geely.local', password: 'SalesTester123!' }),
    });
    const salesCookie = extractCookie(salesLogin);

    const blockedRes = await fetch(`${BASE_URL}/api/users`, { headers: { Cookie: salesCookie } });
    assert.equal(blockedRes.status, 403);
  });

  test('the seeded branches carry the bestelbon letterhead phone and e-mail', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const cookie = extractCookie(loginRes);
    const branches = await (await fetch(`${BASE_URL}/api/branches`, { headers: { Cookie: cookie } })).json();
    const roeselare = branches.find((b) => b.id === 'roeselare');
    assert.equal(roeselare.phone, 'ROE 051 97 19 17');
    assert.equal(roeselare.email, 'verkoop.roeselare@geely-maurin.be');
  });

  test('a bestelbon downloads for a customer quote, but not for a showroom offer or an unapproved discount', async () => {
    const adminLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const adminCookie = extractCookie(adminLogin);

    const quoteRes = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        customerName: 'Bestelbon Klant',
        customerEmail: 'klant@example.be',
        selectedVehicleId: 'geely-e2-max',
        configuration: { vehicleName: 'Geely E2', vehicleModel: 'MAX' },
        accessories: [],
        tradeInEnabled: true,
        tradeInMake: 'Volkswagen',
        tradeInModel: 'Golf',
        tradeInMileage: 112000,
        tradeInValue: 6500,
      }),
    });
    assert.equal(quoteRes.status, 201);
    const quote = await quoteRes.json();

    const pdfRes = await fetch(`${BASE_URL}/api/order-form/${quote.id}`, { headers: { Cookie: adminCookie } });
    assert.equal(pdfRes.status, 200);
    assert.equal(pdfRes.headers.get('content-type'), 'application/pdf');
    assert.match(pdfRes.headers.get('content-disposition'), /filename="Bestelbon_Geely_OFF-\d{4}_Bestelbon_Klant\.pdf"/);
    const pdf = Buffer.from(await pdfRes.arrayBuffer());
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');

    const unauthenticated = await fetch(`${BASE_URL}/api/order-form/${quote.id}`);
    assert.equal(unauthenticated.status, 401);

    // A French quote gets the French "bon de commande".
    const frRes = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        customerName: 'Client Francophone',
        selectedVehicleId: 'starray-emi-pro',
        configuration: { vehicleName: 'Starray EM-i', vehicleModel: 'PRO' },
        accessories: [],
        language: 'fr',
      }),
    });
    assert.equal(frRes.status, 201);
    const frQuote = await frRes.json();
    const frPdf = await fetch(`${BASE_URL}/api/order-form/${frQuote.id}`, { headers: { Cookie: adminCookie } });
    assert.equal(frPdf.status, 200);
    assert.match(frPdf.headers.get('content-disposition'), /filename="Bon_de_commande_Geely_OFF-\d{4}_Client_Francophone\.pdf"/);
    assert.equal(Buffer.from(await frPdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
    await fetch(`${BASE_URL}/api/quotes/${frQuote.id}`, { method: 'DELETE', headers: { Cookie: adminCookie } });

    const showroomRes = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ isShowroom: true, selectedVehicleId: 'geely-e5-pro', configuration: { vehicleName: 'Geely E5', vehicleModel: 'PRO' }, accessories: [] }),
    });
    const showroom = await showroomRes.json();
    const showroomPdf = await fetch(`${BASE_URL}/api/order-form/${showroom.id}`, { headers: { Cookie: adminCookie } });
    assert.equal(showroomPdf.status, 400);

    // A rep's discount above the approval threshold stays 'pending' until a manager signs
    // off — no bestelbon until then.
    const repEmail = 'order-form-rep@geely.local';
    const createRep = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ name: 'Order Form Rep', email: repEmail, phone: '0470000001', password: 'OrderFormRep123!', role: 'sales' }),
    });
    assert.equal(createRep.status, 201);
    const repLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: repEmail, password: 'OrderFormRep123!' }),
    });
    const repCookie = extractCookie(repLogin);
    const changed = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: repCookie },
      body: JSON.stringify({ currentPassword: 'OrderFormRep123!', newPassword: 'OrderFormRep456!' }),
    });
    assert.equal(changed.status, 200);
    const pendingRes = await fetch(`${BASE_URL}/api/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: repCookie },
      body: JSON.stringify({
        customerName: 'Grote Korting Klant',
        selectedVehicleId: 'geely-e5-pro',
        configuration: { vehicleName: 'Geely E5', vehicleModel: 'PRO' },
        accessories: [],
        discountType: 'percentage',
        discountValue: 20,
      }),
    });
    const pending = await pendingRes.json();
    assert.equal(pending.discountApprovalStatus, 'pending');
    const pendingPdf = await fetch(`${BASE_URL}/api/order-form/${pending.id}`, { headers: { Cookie: repCookie } });
    assert.equal(pendingPdf.status, 400);

    for (const id of [quote.id, showroom.id, pending.id]) {
      await fetch(`${BASE_URL}/api/quotes/${id}`, { method: 'DELETE', headers: { Cookie: adminCookie } });
    }
  });
});

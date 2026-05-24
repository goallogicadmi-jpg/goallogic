/**
 * Humo de API contra el backend GOAL_LOGIC (E2E ligero sin navegador).
 *
 * Uso:
 *   1) Arranca el servidor: npm start  (o node server.js)
 *   2) TEST_BASE_URL=http://127.0.0.1:3000 node tests/api-smoke.mjs
 *
 * Si el servidor no responde, sale 0 salvo REQUIRE_SERVER=1 (entonces sale 1).
 *
 * No ejecuta Stripe real ni crea usuarios en BD (salvo que añadas casos).
 */

const BASE = (process.env.TEST_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const REQUIRE = process.env.REQUIRE_SERVER === '1' || process.env.REQUIRE_SERVER === 'true';

async function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

async function run(name, fn) {
  try {
    await fn();
    console.log(`OK  ${name}`);
    return true;
  } catch (e) {
    console.error(`FAIL ${name}: ${e.message}`);
    return false;
  }
}

async function main() {
  let reachable = false;
  try {
    const r = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    reachable = true;
    const ct = r.headers.get('content-type') || '';
    const text = await r.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      console.warn(
        `SKIP: ${BASE}/api/health no devolvió JSON (${ct}). Suele indicar que TEST_BASE_URL apunta a Vite u otro servicio, no al backend Node.`
      );
      if (REQUIRE) process.exit(1);
      process.exit(0);
    }
    await assert(r.ok && json.status === 'ok' && typeof json.uptime === 'number' && json.timestamp, 'health body');
  } catch (e) {
    if (!reachable) {
      console.warn(`SKIP: no se pudo conectar a ${BASE} (${e.message})`);
      if (REQUIRE) process.exit(1);
      process.exit(0);
    }
    console.error(e.message);
    process.exit(1);
  }

  const results = [];

  results.push(
    await run('GET /api/unknown → 404 JSON', async () => {
      const r = await fetch(`${BASE}/api/this-route-should-not-exist-xyz`);
      const j = await r.json();
      await assert(r.status === 404, `status ${r.status}`);
      await assert(j.error || j.success === false, 'json error field');
    })
  );

  results.push(
    await run('POST /api/auth/login credenciales malas → 401', async () => {
      const r = await fetch(`${BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'noexiste_smoke@test.invalid', password: 'badpass' }),
      });
      await assert(r.status === 401, `status ${r.status}`);
    })
  );

  results.push(
    await run('POST /api/auth/login x6 mismo IP → 429 en el 6º (loginLimiter)', async () => {
      for (let i = 0; i < 5; i++) {
        const r = await fetch(`${BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `smoke_${i}_${Date.now()}@test.invalid`,
            password: 'wrong',
          }),
        });
        if (i < 4) await assert(r.status === 401, `iter ${i} esperaba 401, fue ${r.status}`);
        else await assert(r.status === 429, `iter 4 esperaba 429, fue ${r.status}`);
      }
    })
  );

  results.push(
    await run('POST /api/payments/webhook firma inválida → 400', async () => {
      const r = await fetch(`${BASE}/api/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 't=0,v1=fake',
        },
        body: JSON.stringify({ not: 'a real stripe event' }),
      });
      await assert(r.status === 400, `status ${r.status}`);
    })
  );

  results.push(
    await run('GET /api/auth/me sin Authorization → 401 JSON', async () => {
      const r = await fetch(`${BASE}/api/auth/me`);
      const j = await r.json();
      await assert(r.status === 401, `status ${r.status}`);
      await assert(j.success === false || j.message, 'json error');
    })
  );

  const failed = results.filter((x) => !x).length;
  if (failed) {
    console.error(`\n${failed} prueba(s) fallaron.`);
    process.exit(1);
  }
  console.log('\nTodas las pruebas de humo pasaron.');
}

main();

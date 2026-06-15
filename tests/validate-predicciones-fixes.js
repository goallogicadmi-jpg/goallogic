/**
 * Validación final de fixes Predicciones / selecciones / Mundial.
 * Uso: node tests/validate-predicciones-fixes.js
 */
require('dotenv').config();
const axios = require('axios');

const BASE = process.env.VALIDATION_BASE_URL || 'http://localhost:3000';
const ARGENTINA_ID = 26;
const BRAZIL_ID = 6;
const WORLD_CUP_LEAGUE = 1;
const SEASON_2026 = 2026;

const results = [];

function pass(name, detail) {
  results.push({ ok: true, name, detail });
  console.log(`✅ ${name}${detail ? `: ${detail}` : ''}`);
}

function fail(name, detail) {
  results.push({ ok: false, name, detail });
  console.log(`❌ ${name}${detail ? `: ${detail}` : ''}`);
}

async function getJson(path) {
  const res = await axios.get(`${BASE}${path}`, { timeout: 120000, validateStatus: () => true });
  return { status: res.status, data: res.data };
}

async function main() {
  console.log(`\n🔍 Validación en ${BASE}\n`);

  // Health
  try {
    await axios.get(`${BASE}/api/league/seasons?leagueId=1`, { timeout: 5000 });
  } catch (e) {
    fail('Servidor accesible', e.message);
    printSummary();
    process.exit(1);
  }
  pass('Servidor accesible');

  // --- /ligas/1/equipos (Mundial, fallback season) ---
  const equiposRes = await getJson(`/api/ligas/${WORLD_CUP_LEAGUE}/equipos?domain=selection`);
  if (equiposRes.status !== 200 || !equiposRes.data?.success) {
    fail('/ligas/1/equipos responde', `status ${equiposRes.status}`);
  } else {
    const equipos = equiposRes.data.equipos || [];
    const hasArg = equipos.some((e) => e.id === ARGENTINA_ID);
    const hasBra = equipos.some((e) => e.id === BRAZIL_ID);
    if (equipos.length > 0 && hasArg && hasBra) {
      pass('/ligas/1/equipos Mundial', `${equipos.length} equipos (incl. Argentina y Brasil)`);
    } else if (equipos.length > 0) {
      pass('/ligas/1/equipos Mundial', `${equipos.length} equipos (fallback season activo)`);
    } else {
      fail('/ligas/1/equipos Mundial', 'lista vacía — fallback 2026→2022 no aplicó');
    }
  }

  // --- /detalle Argentina & Brasil season=2026 (debe usar 2022) ---
  const [argRes, braRes] = await Promise.all([
    getJson(`/api/equipos/${ARGENTINA_ID}/detalle?leagueId=${WORLD_CUP_LEAGUE}&season=${SEASON_2026}`),
    getJson(`/api/equipos/${BRAZIL_ID}/detalle?leagueId=${WORLD_CUP_LEAGUE}&season=${SEASON_2026}`),
  ]);

  for (const [label, res, teamId] of [
    ['Argentina', argRes, ARGENTINA_ID],
    ['Brasil', braRes, BRAZIL_ID],
  ]) {
    if (res.status !== 200 || !res.data?.success) {
      fail(`/detalle ${label}`, `status ${res.status}`);
      continue;
    }
    const eq = res.data.equipo;
    const dbg = res.data.debug || {};

    if (dbg.statsFallbackApplied && dbg.seasonFinal === 2022) {
      pass(`/detalle ${label} fallback 2026→2022`, `seasonFinal=${dbg.seasonFinal}`);
    } else if (dbg.seasonFinal === 2022) {
      pass(`/detalle ${label} season usada`, `seasonFinal=2022`);
    } else {
      fail(`/detalle ${label} fallback season`, `seasonFinal=${dbg.seasonFinal}, fallback=${dbg.statsFallbackApplied}`);
    }

    const promF = Number(eq.promedioGolesFavor);
    const promC = Number(eq.promedioGolesContra);
    if (promF > 0 || promC > 0) {
      pass(`/detalle ${label} promedios`, `GF=${promF.toFixed(2)} GC=${promC.toFixed(2)}${dbg.promediosFromUltimos ? ' (ultimosPartidos)' : ' (API)'}`);
    } else if ((eq.ultimosPartidos || []).length > 0) {
      fail(`/detalle ${label} promedios`, '0.00 pese a tener ultimosPartidos');
    } else {
      fail(`/detalle ${label} promedios`, 'sin datos');
    }

    const xG = eq.estadisticasOfensivas?.xG;
    const xGSource = eq.estadisticasOfensivas?.xGSource;
    const xGA = eq.estadisticasDefensivas?.xGA;
    const xGASource = eq.estadisticasDefensivas?.xGASource;

    if (xG != null && xG > 0) {
      if (xGSource === 'estimated' || xGSource === 'api') {
        pass(`/detalle ${label} xG`, `${xG} (${xGSource})`);
      } else {
        fail(`/detalle ${label} xGSource`, xGSource);
      }
    } else {
      fail(`/detalle ${label} xG`, 'null o 0');
    }

    if (xGA != null && xGA > 0 && (xGASource === 'estimated' || xGASource === 'api')) {
      pass(`/detalle ${label} xGA`, `${xGA} (${xGASource})`);
    } else {
      fail(`/detalle ${label} xGA`, `${xGA} source=${xGASource}`);
    }
  }

  // --- KPI Goles Esperados (misma fórmula que cruzarDatosEquipos) ---
  if (argRes.data?.success && braRes.data?.success) {
    const a = argRes.data.equipo;
    const b = braRes.data.equipo;
    const promA = parseFloat(a.promedioGolesFavor) || 0;
    const promB = parseFloat(b.promedioGolesFavor) || 0;
    const promCA = parseFloat(a.promedioGolesContra) || 0;
    const promCB = parseFloat(b.promedioGolesContra) || 0;
    const combinadoAnotados = (promA + promB) / 2;
    const combinadoRecibidos = (promCA + promCB) / 2;
    const total = combinadoAnotados + combinadoRecibidos;
    if (Number.isFinite(total) && total > 0) {
      pass('KPI Goles Esperados (motor cliente)', `${total.toFixed(2)} (no 0.00)`);
    } else {
      fail('KPI Goles Esperados', `valor=${total}`);
    }
  }

  // --- Caso vacío API: season 2026 sin fallback forzado en query pero sin stats ---
  // Verificar que ultimosPartidos fallback funciona cuando played=0
  const emptyStatsCheck = await getJson(
    `/api/equipos/${ARGENTINA_ID}/detalle?leagueId=${WORLD_CUP_LEAGUE}&season=${SEASON_2026}`
  );
  if (emptyStatsCheck.data?.equipo?.ultimosPartidos?.length > 0) {
    pass('ultimosPartidos disponibles', `${emptyStatsCheck.data.equipo.ultimosPartidos.length} partidos`);
  }

  // --- UI: no debe haber guards xG !== null en Predicciones ---
  const fs = require('fs');
  const path = require('path');
  const predPage = fs.readFileSync(
    path.join(__dirname, '../frontend/src/pages/Predicciones.jsx'),
    'utf8'
  );
  const compTabs = fs.readFileSync(
    path.join(__dirname, '../frontend/src/components/Predicciones/ComparacionConTabs.jsx'),
    'utf8'
  );
  if (!predPage.includes('estadisticasOfensivas?.xG !== null')) {
    pass('UI Predicciones.jsx no oculta xG por null');
  } else {
    fail('UI Predicciones.jsx', 'aún oculta filas xG con !== null');
  }
  if (!compTabs.includes('estadisticasOfensivas?.xG !== null')) {
    pass('UI ComparacionConTabs no oculta xG por null');
  } else {
    fail('UI ComparacionConTabs', 'aún oculta filas xG');
  }
  if (predPage.includes('formatXgPromedioLabel')) {
    pass('UI etiqueta estimado', 'formatXgPromedioLabel en uso');
  }

  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  const ok = results.filter((r) => r.ok).length;
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n--- Resumen: ${ok} OK, ${bad} FAIL ---\n`);
}

main().catch((e) => {
  console.error('Error fatal:', e.message);
  process.exit(1);
});

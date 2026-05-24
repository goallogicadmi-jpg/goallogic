# 🚀 Plan de Ejecución Final: Módulo "Torneos"

## 📋 Resumen Ejecutivo

**Objetivo:** Transformar el módulo "Ligas" en "Torneos" con soporte completo para ligas, copas nacionales, copas internacionales y torneos continentales.

**Duración estimada:** ~4-5 horas  
**Riesgo general:** 🟡 MEDIO (con mitigaciones adecuadas)  
**Archivos afectados:** 10 archivos principales + varios secundarios

---

## 🎯 Objetivos Específicos

1. ✅ Renombrar "Ligas" → "Torneos" en toda la plataforma
2. ✅ Implementar filtrado híbrido (IDs + tipo) para incluir copas
3. ✅ Adaptar cálculo de temporada según tipo de competición
4. ✅ Implementar renderizado condicional (ligas vs copas)
5. ✅ Validar que todas las copas relevantes se muestran
6. ✅ Mantener funcionalidad existente intacta

---

## 📦 Fase 0: Preparación y Backup

### Tareas
- [ ] Crear branch: `feature/torneos-module`
- [ ] Hacer commit del estado actual
- [ ] Crear backup de archivos críticos:
  - `frontend/src/pages/Leagues.jsx`
  - `frontend/src/router/AppRouter.jsx`
  - `frontend/src/layout/Layout.jsx`
  - `frontend/src/api/api.js`

### Verificación
- [ ] Branch creado y activo
- [ ] Backup completado
- [ ] Estado actual guardado en commit

**Tiempo estimado:** 15 minutos

---

## 🔧 Fase 1: Implementar Filtrado Híbrido (ANTES del Renombrado)

**⚠️ CRÍTICO:** Hacer esto ANTES de renombrar para probar el filtrado con el código actual.

### 1.1 Crear Configuración Centralizada

**Archivo:** `frontend/src/pages/Leagues.jsx`  
**Ubicación:** Al inicio del componente, después de los imports

**Código a agregar:**
```javascript
// Configuración centralizada para filtrado de torneos
const TORNEOS_CONFIG = {
  // IDs prioritarios (siempre mostrar)
  idsPrioritarios: [
    // Ligas principales
    140, 39, 135, 78, 61, 88, 94, 203, 235, 71, 72, 262, 253, 141, 40,
    // Copas internacionales
    2, 13, 15, 848, 849,
    // Copas nacionales importantes
    45, 143, 144, 145, 146
  ],
  
  // Tipos de competición permitidos
  tiposPermitidos: ['League', 'Cup', 'Tournament'],
  
  // Países/regiones relevantes para ligas
  paisesRelevantes: [
    'Spain', 'England', 'Italy', 'Germany', 'France', 
    'Netherlands', 'Portugal', 'Brazil', 'Argentina', 
    'Mexico', 'Colombia', 'Chile', 'Uruguay', 'Peru'
  ],
  
  // Palabras clave para excluir competiciones no deseadas
  palabrasExcluidas: [
    'women', 'femenino', 'femenina', 'womens', 'ladies',
    'u19', 'u20', 'u21', 'u23', 'youth', 'junior', 'sub-19', 'sub-20'
  ]
};
```

### 1.2 Crear Función de Filtrado

**Archivo:** `frontend/src/pages/Leagues.jsx`  
**Ubicación:** Después de TORNEOS_CONFIG, antes del componente

**Código a agregar:**
```javascript
// Función para filtrar torneos usando enfoque híbrido
const filtrarTorneos = (data) => {
  if (!data.response || !Array.isArray(data.response)) {
    return [];
  }
  
  return data.response
    .filter(liga => {
      const leagueId = liga.league?.id;
      const leagueType = liga.league?.type;
      const leagueName = (liga.league?.name || '').toLowerCase();
      const country = (liga.country?.name || liga.country || '').toLowerCase();
      
      // Excluir competiciones no deseadas
      if (TORNEOS_CONFIG.palabrasExcluidas.some(palabra => 
        leagueName.includes(palabra)
      )) {
        return false;
      }
      
      // Si está en lista prioritaria, siempre incluir
      if (TORNEOS_CONFIG.idsPrioritarios.includes(leagueId)) {
        return true;
      }
      
      // Verificar tipo permitido
      if (!TORNEOS_CONFIG.tiposPermitidos.includes(leagueType)) {
        return false;
      }
      
      // Si es copa o torneo internacional, incluir
      if (leagueType === 'Cup' || leagueType === 'Tournament') {
        const isInternational = country === 'world' || country === '' || 
                                 country === 'international';
        if (isInternational) {
          return true;
        }
      }
      
      // Si es liga de países relevantes, incluir
      if (leagueType === 'League') {
        const isPaisRelevante = TORNEOS_CONFIG.paisesRelevantes.some(p => 
          country.includes(p.toLowerCase())
        );
        if (isPaisRelevante) {
          return true;
        }
      }
      
      return false;
    })
    .map(liga => ({
      id: liga.league.id,
      name: liga.league.name,
      type: liga.league.type, // ← Incluir tipo para uso futuro
      country: liga.country.name || liga.country,
      logo: liga.league.logo || `https://media.api-sports.io/football/leagues/${liga.league.id}.png`
    }))
    .sort((a, b) => {
      // Ordenar: IDs prioritarios primero, luego por nombre
      const aIsPriority = TORNEOS_CONFIG.idsPrioritarios.includes(a.id);
      const bIsPriority = TORNEOS_CONFIG.idsPrioritarios.includes(b.id);
      
      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;
      
      return a.name.localeCompare(b.name);
    });
};
```

### 1.3 Reemplazar Filtrado Actual

**Archivo:** `frontend/src/pages/Leagues.jsx`  
**Ubicación:** Línea ~68, dentro del `useEffect` que carga ligas

**Código a reemplazar:**
```javascript
// ❌ ELIMINAR ESTO:
const ligasPrincipalesIds = [140, 39, 135, 78, 61, 88, 94, 203, 2, 235, 71, 72, 262, 253, 141, 40, 13, 15];
ligasDisponibles = data.response
  .filter(liga => ligasPrincipalesIds.includes(liga.league?.id))
  .map(liga => ({
    id: liga.league.id,
    name: liga.league.name,
    country: liga.country.name || liga.country,
    logo: liga.league.logo || `https://media.api-sports.io/football/leagues/${liga.league.id}.png`
  }));
```

**Por esto:**
```javascript
// ✅ USAR ESTO:
ligasDisponibles = filtrarTorneos(data);
```

### 1.4 Actualizar Fallbacks

**Archivo:** `frontend/src/pages/Leagues.jsx`  
**Ubicación:** Líneas ~91-110 y ~119-138 (fallbacks)

**Cambio:** Agregar copas importantes a los fallbacks hardcodeados:
```javascript
// Agregar después de las ligas existentes:
{ id: 45, name: "FA Cup", country: "England", logo: "https://media.api-sports.io/football/leagues/45.png" },
{ id: 143, name: "Copa del Rey", country: "Spain", logo: "https://media.api-sports.io/football/leagues/143.png" },
{ id: 144, name: "Coppa Italia", country: "Italy", logo: "https://media.api-sports.io/football/leagues/144.png" },
{ id: 145, name: "DFB-Pokal", country: "Germany", logo: "https://media.api-sports.io/football/leagues/145.png" },
{ id: 146, name: "Coupe de France", country: "France", logo: "https://media.api-sports.io/football/leagues/146.png" },
{ id: 848, name: "UEFA Europa League", country: "World", logo: "https://media.api-sports.io/football/leagues/848.png" },
{ id: 849, name: "UEFA Conference League", country: "World", logo: "https://media.api-sports.io/football/leagues/849.png" },
```

### Verificación Fase 1
- [ ] La configuración TORNEOS_CONFIG está definida
- [ ] La función filtrarTorneos está implementada
- [ ] El filtrado antiguo fue reemplazado
- [ ] Los fallbacks incluyen copas importantes
- [ ] **PRUEBA:** Verificar que se muestran más competiciones (incluyendo copas)
- [ ] **PRUEBA:** Verificar que no aparecen competiciones juveniles o femeninas
- [ ] **PRUEBA:** Verificar que las copas importantes están visibles

**Tiempo estimado:** 45 minutos

---

## 🔧 Fase 2: Adaptar Cálculo de Temporada

### 2.1 Crear Función de Cálculo de Temporada

**Archivo:** `frontend/src/pages/Leagues.jsx`  
**Ubicación:** Después de filtrarTorneos, antes del componente

**Código a agregar:**
```javascript
// Función para obtener temporada actual usando API (más preciso)
const obtenerTemporadaActual = async (leagueId) => {
  try {
    const response = await axios.get(`/api/league/seasons?leagueId=${leagueId}`);
    const seasons = response.data.seasons || [];
    const temporadaActual = seasons.find(s => s.current);
    
    if (temporadaActual) {
      return temporadaActual.year.toString();
    }
    
    // Fallback: usar última temporada disponible
    if (seasons.length > 0) {
      const ultimaTemporada = seasons[seasons.length - 1];
      return ultimaTemporada.year.toString();
    }
    
    // Fallback final: cálculo básico
    return calcularTemporadaBasica(leagueId);
  } catch (error) {
    console.warn("⚠️ Error obteniendo temporada desde API, usando cálculo básico:", error);
    return calcularTemporadaBasica(leagueId);
  }
};

// Función de cálculo básico como fallback
const calcularTemporadaBasica = (leagueId) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  
  // Copas internacionales (febrero-noviembre)
  const copasInternacionales = [13, 15, 2, 848, 849]; // Libertadores, Sudamericana, Champions, Europa, Conference
  if (copasInternacionales.includes(leagueId)) {
    if (currentMonth >= 2 && currentMonth <= 11) {
      return currentYear.toString();
    } else {
      return (currentYear - 1).toString();
    }
  }
  
  // Ligas europeas (agosto-mayo)
  const ligasEuropeas = [140, 39, 135, 78, 61, 88, 94, 141, 40]; // Top ligas europeas
  if (ligasEuropeas.includes(leagueId)) {
    if (currentMonth >= 8) {
      return currentYear.toString();
    } else {
      return (currentYear - 1).toString();
    }
  }
  
  // Por defecto, año actual
  return currentYear.toString();
};
```

### 2.2 Actualizar useEffect de Temporada

**Archivo:** `frontend/src/pages/Leagues.jsx`  
**Ubicación:** Línea ~214-233 (useEffect que calcula temporada)

**Código a reemplazar:**
```javascript
// ❌ ELIMINAR ESTO:
useEffect(() => {
  if (selectedLeagueId) {
    console.log("🔄 Calculando temporada para liga:", selectedLeagueId);
    setLoadingSeason(true);
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const seasonYear = currentMonth >= 8 ? currentYear : currentYear - 1;
    
    console.log("✅ Temporada calculada:", seasonYear);
    setSelectedSeason(seasonYear.toString());
    setLoadingSeason(false);
  }
}, [selectedLeagueId]);
```

**Por esto:**
```javascript
// ✅ USAR ESTO:
useEffect(() => {
  if (selectedLeagueId) {
    console.log("🔄 Obteniendo temporada para torneo:", selectedLeagueId);
    setLoadingSeason(true);
    
    obtenerTemporadaActual(selectedLeagueId)
      .then(temporada => {
        console.log("✅ Temporada obtenida:", temporada);
        setSelectedSeason(temporada);
        setLoadingSeason(false);
      })
      .catch(error => {
        console.error("❌ Error obteniendo temporada:", error);
        setLoadingSeason(false);
      });
  }
}, [selectedLeagueId]);
```

### Verificación Fase 2
- [ ] La función obtenerTemporadaActual está implementada
- [ ] La función calcularTemporadaBasica está implementada
- [ ] El useEffect fue actualizado
- [ ] **PRUEBA:** Seleccionar una liga europea y verificar temporada correcta
- [ ] **PRUEBA:** Seleccionar Copa Libertadores y verificar temporada correcta
- [ ] **PRUEBA:** Verificar que no hay errores en consola

**Tiempo estimado:** 30 minutos

---

## 🔧 Fase 3: Implementar Renderizado Condicional

### 3.1 Detectar Tipo de Competición

**Archivo:** `frontend/src/pages/Leagues.jsx`  
**Ubicación:** Dentro del componente, después de los estados

**Código a agregar:**
```javascript
// Detectar si la competición seleccionada es una copa
const torneoSeleccionado = ligas.find(t => t.id === selectedLeagueId);
const esCopa = torneoSeleccionado?.type === 'Cup' || torneoSeleccionado?.type === 'Tournament';
const esCopaConGrupos = esCopa && [2, 13, 15, 848, 849].includes(selectedLeagueId); // Champions, Libertadores, etc.
```

### 3.2 Importar CupCompetitionView

**Archivo:** `frontend/src/pages/Leagues.jsx`  
**Ubicación:** En la sección de imports

**Código a agregar:**
```javascript
import CupCompetitionView from "../components/CupCompetition/CupCompetitionView";
```

### 3.3 Actualizar Renderizado

**Archivo:** `frontend/src/pages/Leagues.jsx`  
**Ubicación:** Línea ~489 (donde se renderiza StandingsTable)

**Código a reemplazar:**
```javascript
// ❌ ELIMINAR ESTO:
{selectedLeagueId && selectedSeason && !loadingSeason && (
  <div className="standings-table-container">
    <StandingsTable 
      leagueId={parseInt(selectedLeagueId)} 
      season={selectedSeason}
      onTeamClick={(teamId) => setEquipoSeleccionado(teamId)}
    />
  </div>
)}
```

**Por esto:**
```javascript
// ✅ USAR ESTO:
{selectedLeagueId && selectedSeason && !loadingSeason && (
  <div className="standings-table-container">
    {esCopaConGrupos ? (
      <CupCompetitionView 
        competitionId={parseInt(selectedLeagueId)}
        season={selectedSeason}
      />
    ) : (
      <StandingsTable 
        leagueId={parseInt(selectedLeagueId)} 
        season={selectedSeason}
        onTeamClick={(teamId) => setEquipoSeleccionado(teamId)}
      />
    )}
  </div>
)}
```

### Verificación Fase 3
- [ ] CupCompetitionView está importado
- [ ] La detección de tipo de competición está implementada
- [ ] El renderizado condicional está implementado
- [ ] **PRUEBA:** Seleccionar una liga y verificar que muestra StandingsTable
- [ ] **PRUEBA:** Seleccionar Champions League y verificar que muestra CupCompetitionView
- [ ] **PRUEBA:** Verificar que no hay errores en consola

**Tiempo estimado:** 30 minutos

---

## 🔄 Fase 4: Renombrar "Ligas" → "Torneos" (Parte 1 - Componente Principal)

### 4.1 Renombrar Archivo

**Tarea:**
- [ ] Renombrar `frontend/src/pages/Leagues.jsx` → `Torneos.jsx`

### 4.2 Renombrar Componente y Estados

**Archivo:** `frontend/src/pages/Torneos.jsx`

**Cambios:**
- [ ] `export default function Leagues()` → `export default function Torneos()`
- [ ] `const initialState = location.state?.activeSection || "ligas"` → `"torneos"`
- [ ] `if (activeSection === "ligas"` → `"torneos"` (todas las ocurrencias)
- [ ] `const [ligas, setLigas]` → `const [torneos, setTorneos]`
- [ ] `const [loadingLigas, setLoadingLigas]` → `const [loadingTorneos, setLoadingTorneos]`
- [ ] `ligasPrincipalesIds` → `torneosPrincipalesIds` (si aún existe)
- [ ] `ligasDisponibles` → `torneosDisponibles`
- [ ] `ligas.find` → `torneos.find`
- [ ] `ligas.length` → `torneos.length`
- [ ] `setLigas` → `setTorneos` (todas las ocurrencias)
- [ ] `setLoadingLigas` → `setLoadingTorneos` (todas las ocurrencias)
- [ ] Actualizar comentarios que mencionen "ligas" → "torneos"
- [ ] Actualizar logs: `console.log("🔄 Iniciando carga de ligas...")` → `"torneos"`

### 4.3 Actualizar Import de API

**Archivo:** `frontend/src/pages/Torneos.jsx`

**Cambios:**
- [ ] `import { obtenerLigas } from "../api/api"` → `import { obtenerTorneos } from "../api/api"`
- [ ] `obtenerLigas()` → `obtenerTorneos()` (en el useEffect)

### Verificación Fase 4
- [ ] Archivo renombrado correctamente
- [ ] Componente renombrado
- [ ] Todos los estados renombrados
- [ ] Todos los logs actualizados
- [ ] **PRUEBA:** Verificar que el componente compila sin errores
- [ ] **PRUEBA:** Verificar que no hay referencias rotas

**Tiempo estimado:** 45 minutos

---

## 🔄 Fase 5: Renombrar "Ligas" → "Torneos" (Parte 2 - Router y Layout)

### 5.1 Actualizar Router

**Archivo:** `frontend/src/router/AppRouter.jsx`

**Cambios:**
- [ ] `import Leagues from "../pages/Leagues"` → `import Torneos from "../pages/Torneos"`
- [ ] `<Route path="/" element={<Leagues />} />` → `<Route path="/" element={<Torneos />} />`
- [ ] `<Route path="/ligas" element={<Leagues />} />` → `<Route path="/torneos" element={<Torneos />} />`
- [ ] `<Route path="/ligas/:liga/teams" element={<Teams />} />` → `<Route path="/torneos/:torneo/teams" element={<Teams />} />`
- [ ] `<Route path="/ligas/:liga/teams/:equipo" element={<TeamDetails />} />` → `<Route path="/torneos/:torneo/teams/:equipo" element={<TeamDetails />} />`
- [ ] (Opcional) Agregar redirección: `<Route path="/ligas" element={<Navigate to="/torneos" replace />} />`

### 5.2 Actualizar Layout

**Archivo:** `frontend/src/layout/Layout.jsx`

**Cambios:**
- [ ] `if (path === '/' || path === '/ligas') return 'ligas'` → `'torneos'`
- [ ] `case 'ligas': navigate('/ligas')` → `case 'torneos': navigate('/torneos')`
- [ ] `navigate('/ligas', { state: { activeSection: 'proyecto' } })` → `navigate('/torneos', { state: { activeSection: 'proyecto' } })`
- [ ] `{ label: 'Ligas', section: 'ligas', path: '/ligas' }` → `{ label: 'Torneos', section: 'torneos', path: '/torneos' }`
- [ ] `else if (btn.section === 'ligas')` → `'torneos'`
- [ ] Actualizar comentarios: `// Para "Mi Cuenta", se maneja internamente en Leagues.jsx` → `Torneos.jsx`

### Verificación Fase 5
- [ ] Router actualizado
- [ ] Layout actualizado
- [ ] **PRUEBA:** Navegar a `/` y verificar que muestra Torneos
- [ ] **PRUEBA:** Navegar a `/torneos` y verificar que funciona
- [ ] **PRUEBA:** Hacer clic en botón "Torneos" del header
- [ ] **PRUEBA:** Hacer clic en botón "Mi Cuenta" y verificar que navega a `/torneos`
- [ ] **PRUEBA:** Verificar que el botón "Torneos" se marca como activo

**Tiempo estimado:** 30 minutos

---

## 🔄 Fase 6: Renombrar API y Backend

### 6.1 Actualizar API Frontend

**Archivo:** `frontend/src/api/api.js`

**Cambios:**
- [ ] `export async function obtenerLigas()` → `obtenerTorneos()`
- [ ] `console.log("✅ Ligas encontradas:", ...)` → `"Torneos encontrados:"`
- [ ] Actualizar comentarios

### 6.2 Actualizar Backend (Opcional)

**Archivo:** `server.js`

**Cambios (solo logs y comentarios):**
- [ ] `// 📌 Obtener lista de ligas desde API-Football` → `"torneos"`
- [ ] `console.log("🔍 [LEAGUES] ...")` → `"[TORNEOS] ..."`
- [ ] `res.status(500).json({ error: "Error al obtener ligas" })` → `"torneos"`

**NOTA:** El endpoint `/api/leagues` puede mantenerse igual por compatibilidad.

### Verificación Fase 6
- [ ] API frontend actualizada
- [ ] Backend actualizado (logs)
- [ ] **PRUEBA:** Verificar que la carga de torneos funciona
- [ ] **PRUEBA:** Verificar que no hay errores en consola

**Tiempo estimado:** 20 minutos

---

## 🔄 Fase 7: Actualizar Componentes Relacionados

### 7.1 Revisar Teams.jsx y TeamDetails.jsx

**Archivos:** `frontend/src/pages/Teams.jsx`, `frontend/src/pages/TeamDetails.jsx`

**Cambios (si aplica):**
- [ ] Verificar si usan `useParams().liga` → cambiar a `useParams().torneo` o mantener compatibilidad
- [ ] Actualizar navegaciones a `/ligas` → `/torneos`

### 7.2 Revisar Otros Componentes

**Archivos a revisar:**
- `frontend/src/components/MiCuenta/DashboardUsuario.jsx` (tiene `id="grafica-ligas"`)
- `frontend/src/components/Partidos/AgrupadorPartidos.jsx`
- `frontend/src/services/statsService.js`
- `frontend/src/utils/favoritos.js`

**Cambios:** Solo si hay referencias directas a rutas `/ligas` o imports de `Leagues`

### Verificación Fase 7
- [ ] Teams.jsx y TeamDetails.jsx revisados
- [ ] Otros componentes revisados
- [ ] **PRUEBA:** Navegar a `/torneos/:torneo/teams` y verificar que funciona
- [ ] **PRUEBA:** Verificar que no hay imports rotos

**Tiempo estimado:** 30 minutos

---

## ✅ Fase 8: Testing Completo y Validación

### 8.1 Checklist de Funcionalidad

**Navegación:**
- [ ] La ruta `/` muestra el componente Torneos
- [ ] La ruta `/torneos` muestra el componente Torneos
- [ ] (Opcional) La ruta `/ligas` redirige a `/torneos`
- [ ] El botón "Torneos" en el header funciona
- [ ] El botón "Torneos" se marca como activo cuando está en `/torneos`
- [ ] El botón "Mi Cuenta" navega a `/torneos` con estado correcto
- [ ] La navegación entre secciones (torneos, proyecto, escuela) funciona

**Filtrado y Visualización:**
- [ ] El dropdown de torneos se carga correctamente
- [ ] Se muestran ligas principales
- [ ] Se muestran copas nacionales importantes (FA Cup, Copa del Rey, etc.)
- [ ] Se muestran copas internacionales (Champions, Libertadores, etc.)
- [ ] NO se muestran competiciones juveniles
- [ ] NO se muestran competiciones femeninas
- [ ] El orden de las competiciones es correcto (prioritarias primero)

**Selección y Temporada:**
- [ ] Seleccionar una liga funciona correctamente
- [ ] Seleccionar una copa funciona correctamente
- [ ] La temporada se calcula correctamente para ligas europeas
- [ ] La temporada se calcula correctamente para copas internacionales
- [ ] No hay errores al cambiar de competición

**Renderizado:**
- [ ] Las ligas muestran StandingsTable
- [ ] Las copas con grupos muestran CupCompetitionView
- [ ] Las copas sin grupos muestran StandingsTable
- [ ] La tabla de posiciones se carga correctamente
- [ ] El detalle de equipo funciona

**Rutas con Parámetros:**
- [ ] `/torneos/:torneo/teams` funciona correctamente
- [ ] `/torneos/:torneo/teams/:equipo` funciona correctamente

### 8.2 Checklist de Código

- [ ] No hay imports rotos
- [ ] No hay referencias a `Leagues` o `ligas` en código crítico
- [ ] Todos los estados y variables están renombrados
- [ ] Los logs y comentarios están actualizados
- [ ] No hay errores en consola del navegador
- [ ] No hay warnings en consola del navegador

### 8.3 Pruebas Específicas de Copas

**Copas a verificar:**
- [ ] FA Cup (45) - Se muestra y funciona
- [ ] Copa del Rey (143) - Se muestra y funciona
- [ ] Coppa Italia (144) - Se muestra y funciona
- [ ] DFB-Pokal (145) - Se muestra y funciona
- [ ] Coupe de France (146) - Se muestra y funciona
- [ ] Champions League (2) - Se muestra y funciona
- [ ] Copa Libertadores (13) - Se muestra y funciona
- [ ] Copa Sudamericana (15) - Se muestra y funciona
- [ ] UEFA Europa League (848) - Se muestra y funciona
- [ ] UEFA Conference League (849) - Se muestra y funciona

### Verificación Fase 8
- [ ] Todas las pruebas pasan
- [ ] No hay errores críticos
- [ ] La funcionalidad está intacta
- [ ] Las copas se muestran correctamente

**Tiempo estimado:** 60 minutos

---

## 🚨 Riesgos y Mitigaciones

### Riesgo 1: Romper "Mi Cuenta"
**Probabilidad:** 🟡 MEDIA  
**Impacto:** 🔴 ALTO

**Mitigación:**
- Verificar que `navigate('/torneos', { state: { activeSection: 'proyecto' } })` funciona
- Probar el botón "Mi Cuenta" después de Fase 5
- Mantener lógica de `activeSection === "proyecto"` en Torneos.jsx

### Riesgo 2: Rutas con Parámetros Rotos
**Probabilidad:** 🟡 MEDIA  
**Impacto:** 🟡 MEDIO

**Mitigación:**
- Verificar que Teams.jsx y TeamDetails.jsx usan parámetros correctamente
- Probar rutas `/torneos/:torneo/teams` después de Fase 5
- Mantener compatibilidad con `:liga` si es necesario

### Riesgo 3: Cálculo de Temporada Incorrecto
**Probabilidad:** 🟡 MEDIA  
**Impacto:** 🟡 MEDIO

**Mitigación:**
- Usar API para obtener temporada actual (más preciso)
- Tener fallback con cálculo básico
- Probar con diferentes tipos de competiciones en Fase 2

### Riesgo 4: Renderizado Condicional Roto
**Probabilidad:** 🟢 BAJA  
**Impacto:** 🟡 MEDIO

**Mitigación:**
- Verificar que CupCompetitionView está importado
- Probar con copas que tienen grupos (Champions, Libertadores)
- Probar con ligas normales

### Riesgo 5: Filtrado Incluye Competiciones No Deseadas
**Probabilidad:** 🟡 MEDIA  
**Impacto:** 🟢 BAJO

**Mitigación:**
- Usar filtros de palabras excluidas
- Probar que no aparecen competiciones juveniles o femeninas
- Ajustar filtros según resultados

### Riesgo 6: Performance con Muchas Competiciones
**Probabilidad:** 🟢 BAJA  
**Impacto:** 🟢 BAJO

**Mitigación:**
- El filtrado híbrido mantiene control sobre cantidad
- Ordenar competiciones (prioritarias primero)
- Si hay problemas, ajustar filtros

---

## 📊 Resumen de Fases

| Fase | Descripción | Tiempo | Riesgo | Dependencias |
|------|-------------|--------|--------|--------------|
| 0 | Preparación | 15 min | 🟢 Bajo | Ninguna |
| 1 | Filtrado Híbrido | 45 min | 🟡 Medio | Ninguna |
| 2 | Cálculo Temporada | 30 min | 🟡 Medio | Fase 1 |
| 3 | Renderizado Condicional | 30 min | 🟡 Medio | Fase 1, 2 |
| 4 | Renombrar Componente | 45 min | 🔴 Alto | Fase 1, 2, 3 |
| 5 | Renombrar Router/Layout | 30 min | 🔴 Alto | Fase 4 |
| 6 | Renombrar API | 20 min | 🟢 Bajo | Fase 4 |
| 7 | Componentes Relacionados | 30 min | 🟡 Medio | Fase 5 |
| 8 | Testing Completo | 60 min | 🟢 Bajo | Todas |

**Total estimado:** ~4.5 horas

---

## ✅ Criterios de Éxito

El módulo "Torneos" está completo cuando:

1. ✅ Todas las rutas usan `/torneos` en lugar de `/ligas`
2. ✅ El componente se llama `Torneos` en lugar de `Leagues`
3. ✅ Se muestran ligas, copas nacionales, copas internacionales y torneos
4. ✅ El filtrado híbrido funciona correctamente
5. ✅ El cálculo de temporada es correcto para todos los tipos
6. ✅ El renderizado condicional funciona (ligas vs copas)
7. ✅ No hay errores en consola
8. ✅ La funcionalidad existente sigue funcionando
9. ✅ "Mi Cuenta" sigue funcionando correctamente
10. ✅ Todas las pruebas pasan

---

## 🎯 Orden de Ejecución Final

```
Fase 0: Preparación
  ↓
Fase 1: Filtrado Híbrido
  ↓
Fase 2: Cálculo Temporada
  ↓
Fase 3: Renderizado Condicional
  ↓
Fase 4: Renombrar Componente
  ↓
Fase 5: Renombrar Router/Layout
  ↓
Fase 6: Renombrar API
  ↓
Fase 7: Componentes Relacionados
  ↓
Fase 8: Testing Completo
```

**⚠️ IMPORTANTE:** No saltar fases. Cada fase debe completarse y probarse antes de continuar.

---

**Documento generado:** Plan de ejecución final consolidado  
**Fecha:** Plan listo para implementación  
**Propósito:** Guía paso a paso ejecutable para transformar "Ligas" en "Torneos"

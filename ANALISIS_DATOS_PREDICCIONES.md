# 📊 ANÁLISIS DETALLADO: DATOS SOLICITADOS EN MÓDULO PREDICCIONES

## 🎯 RESUMEN EJECUTIVO

Este documento detalla qué datos se están solicitando actualmente a la API cuando se ejecuta el botón "Analizar" en el módulo de Predicciones (Comparador Inteligente de Equipos).

---

## 📡 ENDPOINTS LLAMADOS

### 1. Endpoint Principal
**URL:** `/api/equipos/:id/detalle`  
**Método:** `GET`  
**Llamadas:** Se ejecutan **2 llamadas en paralelo** (una por cada equipo)

**Ejemplo de llamadas:**
```javascript
// Equipo A
axios.get(`/api/equipos/${equipoA.id}/detalle`)

// Equipo B  
axios.get(`/api/equipos/${equipoB.id}/detalle`)
```

**Ubicación en código:**
- Frontend: `frontend/src/pages/Predicciones.jsx` (líneas 121-124)
- Backend: `server.js` (líneas 1252-1403)

---

## 🔧 PARÁMETROS ENVIADOS

### Parámetros en la URL
- `id` (path parameter): ID numérico del equipo
  - Ejemplo: `/api/equipos/33/detalle` (donde 33 es el ID del equipo)

### Parámetros de Query
- **Ninguno** - El endpoint no recibe parámetros de query string

### Headers
- El backend usa `apiHeaders` que incluye:
  - `x-apisports-key`: API key de API-Football
  - `x-rapidapi-host`: "v3.football.api-sports.io"

---

## 📋 CAMPOS ESPERADOS RECIBIR

Basado en el análisis del código, estos son los campos que el frontend **espera recibir** en la respuesta:

### Estructura de Respuesta Esperada
```javascript
{
  success: true,
  equipo: {
    // === INFORMACIÓN BÁSICA ===
    id: number,                    // ✅ REQUERIDO
    nombre: string,                 // ✅ REQUERIDO
    liga: string,                  // ✅ REQUERIDO
    pais: string,                  // ✅ REQUERIDO
    logo: string | null,            // ⚠️ OPCIONAL
    
    // === ESTADÍSTICAS DE LIGA ===
    posicion: number | null,        // ⚠️ OPCIONAL (puede ser null)
    puntos: number | null,          // ⚠️ OPCIONAL (puede ser null)
    golesFavor: number,            // ✅ REQUERIDO (default: 0)
    golesContra: number,           // ✅ REQUERIDO (default: 0)
    promedioGolesFavor: number,    // ✅ REQUERIDO (default: 0)
    promedioGolesContra: number,   // ✅ REQUERIDO (default: 0)
    
    // === ÚLTIMOS PARTIDOS ===
    ultimosPartidos: Array<{       // ⚠️ OPCIONAL (puede ser [])
      resultado: "G" | "E" | "P",  // ✅ REQUERIDO si existe array
      golesFavor: number,          // ✅ REQUERIDO si existe array
      golesContra: number          // ✅ REQUERIDO si existe array
    }>,
    
    // === ESTADÍSTICAS OFENSIVAS ===
    estadisticasOfensivas: {        // ⚠️ OPCIONAL (puede tener nulls)
      tirosAlArco: number | null,
      tirosAlArcoPromedio: number | null,
      xG: number | null
    },
    
    // === ESTADÍSTICAS DEFENSIVAS ===
    estadisticasDefensivas: {       // ⚠️ OPCIONAL (puede tener nulls)
      tirosEnContra: number | null,
      tirosEnContraPromedio: number | null,
      xGA: number | null
    }
  }
}
```

---

## ✅ CAMPOS QUE SÍ ESTÁN LLEGANDO

Según el código del backend (`server.js` líneas 1365-1388), estos campos **SÍ están siendo devueltos**:

### ✅ Información Básica
- ✅ `id` - Se obtiene de `teamData.team?.id`
- ✅ `nombre` - Se obtiene de `teamData.team?.name`
- ✅ `liga` - Se obtiene de `teamData.league?.name`
- ✅ `pais` - Se obtiene de `teamData.country?.name` o `teamData.team?.country`
- ✅ `logo` - Se obtiene de `teamData.team?.logo`

### ✅ Estadísticas de Liga
- ✅ `posicion` - Se obtiene de la tabla de posiciones (standings)
- ✅ `puntos` - Se obtiene de la tabla de posiciones (standings)
- ✅ `golesFavor` - Se calcula de `stats.goals?.for?.total?.total`
- ✅ `golesContra` - Se calcula de `stats.goals?.against?.total?.total`
- ✅ `promedioGolesFavor` - Se calcula: `golesFavor / partidosJugados`
- ✅ `promedioGolesContra` - Se calcula: `golesContra / partidosJugados`

### ✅ Últimos Partidos
- ✅ `ultimosPartidos` - Array con los últimos 5 partidos
  - ✅ `resultado` - "G", "E" o "P"
  - ✅ `golesFavor` - Goles del equipo
  - ✅ `golesContra` - Goles del rival

### ✅ Estadísticas Ofensivas
- ✅ `estadisticasOfensivas.tirosAlArco` - De `stats.shots?.on?.total`
- ✅ `estadisticasOfensivas.tirosAlArcoPromedio` - De `stats.shots?.on?.average`
- ✅ `estadisticasOfensivas.xG` - De `stats.goals?.for?.expected?.total`

### ✅ Estadísticas Defensivas
- ✅ `estadisticasDefensivas.tirosEnContra` - De `stats.shots?.against?.total`
- ✅ `estadisticasDefensivas.tirosEnContraPromedio` - De `stats.shots?.against?.average`
- ✅ `estadisticasDefensivas.xGA` - De `stats.goals?.against?.expected?.total`

---

## ⚠️ POSIBLES PROBLEMAS DETECTADOS

### 1. **Dependencia de `leagueId` en `teamData`**
**Ubicación:** `server.js` línea 1284

```javascript
const leagueId = teamData.league?.id;
```

**Problema:** Si el equipo no tiene `league.id` en la respuesta de `/teams?id=${id}`, entonces:
- ❌ No se obtienen estadísticas (`estadisticas = null`)
- ❌ No se obtiene posición en tabla (`posicion = null`, `puntos = null`)
- ⚠️ Solo se obtienen últimos partidos y datos básicos

**Impacto:** Los equipos que no tienen liga asociada en la respuesta inicial no tendrán estadísticas completas.

---

### 2. **Dependencia de Temporada Calculada**
**Ubicación:** `server.js` líneas 1264-1267

```javascript
const season = currentMonth >= 8 ? currentYear : currentYear - 1;
```

**Problema:** La temporada se calcula automáticamente, pero:
- ⚠️ Si el equipo cambió de liga, puede estar buscando estadísticas en la liga incorrecta
- ⚠️ Si la temporada actual aún no ha comenzado, puede devolver datos de la temporada anterior

**Impacto:** Puede devolver estadísticas de una temporada diferente a la actual.

---

### 3. **Manejo de Errores Silencioso**
**Ubicación:** `server.js` líneas 1295-1297, 1327-1329, 1360-1362

```javascript
catch (statsError) {
    console.warn(`⚠️ No se pudieron obtener estadísticas...`);
    // estadisticas = null (ya estaba inicializado)
}
```

**Problema:** Si falla la obtención de estadísticas, el endpoint **no falla**, simplemente devuelve `null` para esos campos.

**Impacto:** El frontend recibe datos incompletos sin saber que hubo un error.

---

### 4. **Últimos Partidos Limitados a 5**
**Ubicación:** `server.js` línea 1304

```javascript
`https://v3.football.api-sports.io/fixtures?team=${teamId}&last=5`
```

**Problema:** Solo se obtienen los últimos 5 partidos, lo cual puede ser insuficiente para:
- Calcular estadísticas avanzadas más precisas
- Analizar tendencias a largo plazo

**Impacto:** Las predicciones pueden ser menos precisas si solo se basan en 5 partidos.

---

### 5. **Campos que Pueden Ser `null`**
Los siguientes campos pueden ser `null` si no se encuentran datos:

- `posicion` - Si no se puede obtener la tabla de posiciones
- `puntos` - Si no se puede obtener la tabla de posiciones
- `estadisticasOfensivas.tirosAlArco` - Si no hay estadísticas disponibles
- `estadisticasOfensivas.tirosAlArcoPromedio` - Si no hay estadísticas disponibles
- `estadisticasOfensivas.xG` - Si no hay estadísticas disponibles
- `estadisticasDefensivas.tirosEnContra` - Si no hay estadísticas disponibles
- `estadisticasDefensivas.tirosEnContraPromedio` - Si no hay estadísticas disponibles
- `estadisticasDefensivas.xGA` - Si no hay estadísticas disponibles

**Impacto:** El frontend debe manejar estos casos con validaciones (lo cual ya hace en `Predicciones.jsx`).

---

## 🔍 ENDPOINTS DE API-FOOTBALL LLAMADOS POR EL BACKEND

El backend hace las siguientes llamadas a API-Football:

### 1. Información del Equipo
```
GET https://v3.football.api-sports.io/teams?id=${id}
```
**Propósito:** Obtener información básica del equipo y su liga actual

### 2. Estadísticas del Equipo
```
GET https://v3.football.api-sports.io/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}
```
**Propósito:** Obtener estadísticas detalladas del equipo en su liga  
**⚠️ CONDICIONAL:** Solo se ejecuta si `leagueId` existe

### 3. Últimos Partidos
```
GET https://v3.football.api-sports.io/fixtures?team=${teamId}&last=5
```
**Propósito:** Obtener los últimos 5 partidos del equipo  
**✅ SIEMPRE SE EJECUTA:** Incluso si fallan las estadísticas

### 4. Tabla de Posiciones
```
GET https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}
```
**Propósito:** Obtener posición y puntos del equipo en la tabla  
**⚠️ CONDICIONAL:** Solo se ejecuta si `leagueId` existe

---

## 📊 CAMPOS USADOS EN EL FRONTEND

### En `cruzarDatosEquipos.js`:
- ✅ `ultimosPartidos` - Para calcular estadísticas avanzadas
- ✅ `promedioGolesFavor` - Para cálculos de probabilidades
- ✅ `promedioGolesContra` - Para cálculos de probabilidades
- ✅ `id` - Para identificar el equipo

### En `Predicciones.jsx` (Componente FichaEquipo):
- ✅ `nombre`, `liga`, `pais`, `logo` - Información básica
- ✅ `posicion`, `puntos` - Estadísticas de liga
- ✅ `golesFavor`, `golesContra` - Goles totales
- ✅ `promedioGolesFavor`, `promedioGolesContra` - Promedios
- ✅ `ultimosPartidos` - Para mostrar forma reciente
- ✅ `estadisticasOfensivas` - Para mostrar estadísticas ofensivas
- ✅ `estadisticasDefensivas` - Para mostrar estadísticas defensivas

### En `EstadisticasAvanzadasEquipo.jsx`:
- ✅ `ultimosPartidos` - Para calcular estadísticas avanzadas

---

## 🧪 PRUEBAS RECOMENDADAS

Para validar qué datos están llegando y cuáles no, se recomienda probar con:

1. **Equipos de ligas principales** (Premier League, LaLiga, Serie A, etc.)
2. **Equipos de ligas menores** (para ver si fallan las estadísticas)
3. **Equipos sin liga asociada** (para ver el comportamiento)
4. **Equipos con pocos partidos jugados** (para ver si afecta los cálculos)

---

## 📝 RESUMEN DE ENDPOINTS Y PARÁMETROS

| Endpoint | Parámetros | Campos Devueltos | Estado |
|----------|-----------|------------------|--------|
| `/api/equipos/:id/detalle` | `id` (path) | Todos los campos listados arriba | ✅ Funcional |

---

## 🔧 RECOMENDACIONES

1. **Agregar logging detallado** para identificar qué campos faltan
2. **Validar `leagueId`** antes de hacer llamadas condicionales
3. **Aumentar cantidad de últimos partidos** de 5 a 10 o 15
4. **Agregar manejo de errores más explícito** para informar al frontend
5. **Agregar parámetro opcional de temporada** para mayor flexibilidad

---

## 📅 FECHA DE ANÁLISIS

**Fecha:** 2025-01-27  
**Versión del código analizada:** Actual (última revisión)

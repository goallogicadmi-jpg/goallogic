# 📊 ANÁLISIS: CAMPOS FALTANTES (Shots, xG, xGA)

## ✅ HALLAZGOS

### 1. **Shots (Tiros al arco) - DISPONIBLE**
- **Endpoint:** `/fixtures/statistics?fixture={fixtureId}`
- **Campos disponibles:**
  - `Shots on Goal` (tiros al arco)
  - `Shots off Goal` (tiros fuera)
  - `Total Shots` (tiros totales)
  - `Blocked Shots` (tiros bloqueados)
  - `Shots insidebox` (tiros dentro del área)
  - `Shots outsidebox` (tiros fuera del área)

### 2. **Expected Goals (xG) - DISPONIBLE**
- **Endpoint:** `/fixtures/statistics?fixture={fixtureId}`
- **Campo disponible:**
  - `expected_goals` (xG del equipo en ese partido)

### 3. **Expected Goals Against (xGA) - DISPONIBLE**
- **Endpoint:** `/fixtures/statistics?fixture={fixtureId}`
- **Campo disponible:**
  - `expected_goals` del equipo rival (para calcular xGA)

## ⚠️ LIMITACIÓN IMPORTANTE

**Estos datos están disponibles SOLO para partidos individuales**, no para estadísticas de temporada completa.

El endpoint `/teams/statistics` (que usamos actualmente) NO devuelve estos campos porque es un resumen de temporada, no estadísticas detalladas de partidos.

## 🔧 OPCIONES PARA OBTENER ESTOS DATOS

### Opción 1: Obtener de últimos partidos (RECOMENDADA)

**Ventajas:**
- Ya tenemos los últimos 5 partidos del equipo
- Solo necesitamos hacer 5 llamadas adicionales por equipo
- Datos recientes y relevantes

**Implementación:**
1. Para cada uno de los últimos 5 partidos, obtener estadísticas del fixture
2. Promediar los valores de shots y xG
3. Calcular xGA desde los partidos donde el equipo fue visitante

**Costo:** 5 llamadas adicionales por equipo (10 total para comparar 2 equipos)

### Opción 2: Dejarlos como NULL

**Ventajas:**
- No requiere llamadas adicionales
- El módulo funciona con los datos principales
- Evita rate limiting

**Desventajas:**
- Los campos quedarán como NULL en el frontend

### Opción 3: Obtener de todos los partidos de la temporada

**Ventajas:**
- Datos completos y precisos

**Desventajas:**
- Muy costoso en llamadas a la API (38 partidos × 2 equipos = 76 llamadas)
- Alto riesgo de rate limiting
- Lento

## 💡 RECOMENDACIÓN

**Recomiendo la Opción 1:** Obtener de los últimos 5 partidos.

**Razones:**
1. Ya tenemos los IDs de los últimos 5 partidos
2. Solo requiere 5 llamadas adicionales por equipo
3. Los datos recientes son más relevantes para predicciones
4. Es un buen balance entre completitud y eficiencia

## 📋 IMPLEMENTACIÓN SUGERIDA

```javascript
// Para cada uno de los últimos 5 partidos
for (const fixture of ultimosPartidosRaw) {
  const fixtureStats = await axios.get(
    `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixture.fixture.id}`,
    { headers: apiHeaders }
  );
  
  // Extraer shots y xG del equipo
  // Promediar al final
}
```

## 🎯 DECISIÓN REQUERIDA

¿Prefieres que implemente la Opción 1 (obtener de últimos 5 partidos) o dejamos los campos como NULL (Opción 2)?

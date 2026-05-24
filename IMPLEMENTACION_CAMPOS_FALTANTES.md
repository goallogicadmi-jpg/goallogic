# ✅ IMPLEMENTACIÓN: OBTENER DATOS DE ÚLTIMOS 5 PARTIDOS

## 📋 CAMBIOS REALIZADOS

### 1. Modificación del endpoint `/api/equipos/:id/detalle`

**Ubicación:** `server.js` (líneas 1353-1460)

**Funcionalidad agregada:**
- ✅ Obtiene estadísticas detalladas de los últimos 5 partidos del equipo
- ✅ Extrae datos de `shots on goal`, `total shots`, `xG` y `xGA` de cada fixture
- ✅ Calcula promedios de estos datos
- ✅ Incluye delays entre peticiones (300ms) para evitar rate limiting

**Campos que ahora se obtienen:**
- `tirosAlArco`: Total de tiros al arco en los últimos 5 partidos
- `tirosAlArcoPromedio`: Promedio de tiros al arco por partido
- `xG`: Promedio de Expected Goals en los últimos 5 partidos
- `tirosEnContra`: Total de tiros recibidos en los últimos 5 partidos
- `tirosEnContraPromedio`: Promedio de tiros recibidos por partido
- `xGA`: Promedio de Expected Goals Against (xG del rival) en los últimos 5 partidos

## 🔧 LÓGICA IMPLEMENTADA

### Flujo de ejecución:

1. **Obtener últimos 5 partidos** (ya existía)
   - Endpoint: `/fixtures?team=${teamId}&last=5`
   - Guarda `fixtureId` de cada partido

2. **Obtener estadísticas de cada fixture** (NUEVO)
   - Para cada uno de los 5 partidos:
     - Endpoint: `/fixtures/statistics?fixture=${fixtureId}`
     - Delay de 300ms entre peticiones
     - Extrae datos del equipo y del rival

3. **Calcular promedios** (NUEVO)
   - Suma todos los valores
   - Divide por número de partidos con estadísticas disponibles
   - Guarda en variables

4. **Incluir en respuesta** (MODIFICADO)
   - Los campos ahora usan los datos calculados de los últimos 5 partidos
   - Si no hay datos, quedan como NULL

## 📊 ESTRUCTURA DE DATOS

### Estadísticas Ofensivas:
```javascript
estadisticasOfensivas: {
    tirosAlArco: number | null,           // Total de últimos 5 partidos
    tirosAlArcoPromedio: number | null,   // Promedio por partido
    xG: number | null                      // Promedio de xG
}
```

### Estadísticas Defensivas:
```javascript
estadisticasDefensivas: {
    tirosEnContra: number | null,          // Total de últimos 5 partidos
    tirosEnContraPromedio: number | null,  // Promedio por partido
    xGA: number | null                     // Promedio de xGA (xG del rival)
}
```

## ⚠️ IMPORTANTE: REINICIAR SERVIDOR

**El servidor DEBE reiniciarse** para que los cambios surtan efecto.

1. Detener el servidor actual (Ctrl+C)
2. Reiniciar: `node server.js`
3. Ejecutar pruebas: `node test-debug-backend.js`

## 📝 LOGS ESPERADOS

Después de reiniciar el servidor, deberías ver en los logs:

```
📊 [EQUIPOS/DETALLE] FixturesRaw length: 5
📡 [EQUIPOS/DETALLE] Obteniendo estadísticas detalladas de 5 partidos recientes...
✅ [EQUIPOS/DETALLE] Estadísticas de partidos: X partidos procesados
📊 [EQUIPOS/DETALLE] Promedios: tirosAlArco=X, tirosEnContra=Y, xG=Z, xGA=W
```

## 🎯 COSTO EN LLAMADAS A API

- **Por equipo:** 5 llamadas adicionales (una por cada fixture)
- **Para comparar 2 equipos:** 10 llamadas adicionales
- **Total por análisis:** ~15-20 llamadas (incluyendo las existentes)

## ⏱️ TIEMPO ESTIMADO

- **Delay entre peticiones:** 300ms
- **5 partidos × 300ms = 1.5 segundos adicionales por equipo**
- **Total:** ~3 segundos adicionales para comparar 2 equipos

## ✅ VALIDACIÓN

Después de reiniciar el servidor, ejecuta:

```bash
node test-debug-backend.js
```

Y verifica que:
- ✅ Los campos `tirosAlArco`, `xG`, `tirosEnContra`, `xGA` ya no sean NULL
- ✅ Los valores sean números (no null)
- ✅ Los promedios sean razonables (ej: tirosAlArco entre 0-20, xG entre 0-5)

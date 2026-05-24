# 📋 INSTRUCCIONES PARA REVISAR LOGS DEL SERVIDOR

## ✅ CAMBIOS REALIZADOS

He modificado el código del servidor para:
1. ✅ Escribir logs en archivo `logs-equipos-detalle.txt` (en el directorio raíz)
2. ✅ Incluir información de debugging en la respuesta JSON
3. ✅ Agregar logging detallado en cada paso del proceso

## 🔄 PASOS PARA VER LOS LOGS

### 1. Reiniciar el servidor
**IMPORTANTE:** El servidor necesita reiniciarse para que los cambios surtan efecto.

```bash
# Detener el servidor actual (Ctrl+C)
# Luego reiniciarlo:
node server.js
```

### 2. Ejecutar las pruebas
Una vez que el servidor esté corriendo, ejecuta:

```bash
node test-debug-backend.js
```

### 3. Revisar los logs

**Opción A: Archivo de logs**
```bash
# En Windows PowerShell:
Get-Content logs-equipos-detalle.txt

# O simplemente abre el archivo:
logs-equipos-detalle.txt
```

**Opción B: Consola del servidor**
Revisa la consola donde está corriendo el servidor. Deberías ver mensajes como:

```
📌 [EQUIPOS/DETALLE] TeamId: 33, LeagueId inicial: 39
📌 [EQUIPOS/DETALLE] Season obtenida de API: 2025 para liga 39
📌 [EQUIPOS/DETALLE] Season final: 2025, LeagueId final: 39
📡 [EQUIPOS/DETALLE] Solicitando estadísticas: team=33&league=39&season=2025
✅ [EQUIPOS/DETALLE] Estadísticas obtenidas: Sí/No
📡 [EQUIPOS/DETALLE] Solicitando standings: league=39&season=2025
✅ [EQUIPOS/DETALLE] Posición obtenida: 15, Puntos: 42
```

## 🔍 QUÉ BUSCAR EN LOS LOGS

### 1. Confirmación de leagueId
```
📌 [EQUIPOS/DETALLE] TeamId: 33, LeagueId inicial: 39
```
**Si aparece:** ✅ LeagueId se está recibiendo correctamente
**Si NO aparece o es NULL:** ❌ Problema con el parámetro

### 2. Confirmación de season
```
📌 [EQUIPOS/DETALLE] Season obtenida de API: 2025 para liga 39
📌 [EQUIPOS/DETALLE] Season final: 2025, LeagueId final: 39
```
**Si aparece 2025:** ✅ Season correcta
**Si aparece 2024:** ⚠️ Season incorrecta (puede ser el problema)
**Si NO aparece:** ❌ Problema calculando season

### 3. Ejecución de llamadas a estadísticas
```
📡 [EQUIPOS/DETALLE] Solicitando estadísticas: team=33&league=39&season=2025
✅ [EQUIPOS/DETALLE] Estadísticas obtenidas: Sí
📊 [EQUIPOS/DETALLE] Estructura: tiene goals=true, tiene fixtures=true
```
**Si aparece "Sí":** ✅ Las estadísticas se obtuvieron
**Si aparece "No":** ❌ Las estadísticas no se obtuvieron
**Si NO aparece:** ❌ Las llamadas no se están ejecutando

### 4. Ejecución de llamadas a standings
```
📡 [EQUIPOS/DETALLE] Solicitando standings: league=39&season=2025
✅ [EQUIPOS/DETALLE] Posición obtenida: 15, Puntos: 42
```
**Si aparece posición y puntos:** ✅ Standings funcionan
**Si aparece warning:** ⚠️ Revisar el mensaje de error
**Si NO aparece:** ❌ Las llamadas no se están ejecutando

### 5. Errores o warnings
```
⚠️ No se pudieron obtener estadísticas para equipo 33: [mensaje]
⚠️ Status: 429, Data: {"message":"Rate limit exceeded"}
```
**Si aparecen errores:** ❌ Revisar el mensaje específico
**Errores comunes:**
- `429`: Rate limiting (demasiadas peticiones)
- `401`: API key inválida
- `404`: Recurso no encontrado
- `500`: Error del servidor de API

## 📊 INFORMACIÓN DE DEBUGGING EN LA RESPUESTA

Además de los logs, la respuesta JSON ahora incluye un objeto `debug`:

```json
{
  "success": true,
  "equipo": { ... },
  "debug": {
    "leagueIdRecibido": "39",
    "leagueIdFinal": 39,
    "seasonRecibida": "2025",
    "seasonFinal": 2025,
    "tieneEstadisticas": true,
    "tienePosicion": true,
    "tienePuntos": true,
    "estructuraEstadisticas": {
      "tieneGoals": true,
      "tieneFixtures": true,
      "keys": ["league", "team", "form", "fixtures", "goals", ...]
    }
  }
}
```

## 🎯 PRÓXIMOS PASOS

1. **Reiniciar el servidor** con los cambios aplicados
2. **Ejecutar las pruebas** con `node test-debug-backend.js`
3. **Revisar los logs** (archivo o consola del servidor)
4. **Compartir los logs** para identificar el problema exacto
5. **Aplicar la corrección** según los hallazgos

## 📝 NOTA IMPORTANTE

El archivo `logs-equipos-detalle.txt` se crea automáticamente cuando se ejecuta el endpoint. Si no aparece, significa que:
- El servidor no se ha reiniciado
- Hay un error al escribir el archivo (permisos)
- El endpoint no se está ejecutando

En ese caso, revisa la consola del servidor directamente.

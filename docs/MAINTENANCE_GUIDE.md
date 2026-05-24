# Guía de Mantenimiento - Motor de Predicciones

## Actualización de Promedios de Liga

### Método Automático (Recomendado)

Los promedios de liga se actualizan automáticamente cada vez que se solicita una predicción. El sistema:

1. Intenta obtener últimos 10 partidos de la liga
2. Calcula promedios desde partidos reales
3. Guarda en cache por 10 minutos
4. Usa fallback si no hay datos disponibles

### Método Manual

Si necesitas forzar actualización de promedios:

1. **Limpiar cache:**
   ```javascript
   const predictionCache = require('./engine/cache');
   predictionCache.invalidate('leagueAverages');
   ```

2. **O reiniciar servidor:**
   ```bash
   pm2 restart goallogic-predictions
   ```

### Verificar Promedios Actuales

Los promedios se calculan automáticamente. Para verificar:

1. Revisar logs del servidor
2. Verificar campo `source` en respuesta de predicción:
   - `'calculated'` - Calculados desde partidos reales
   - `'calculated_with_xg'` - Calculados con xG
   - `'fallback'` - Promedio de los dos equipos

---

## Ejecutar Análisis de Precisión

### Comando Básico

```bash
npm run analyze:predictions
```

### Con Parámetros

```bash
npm run analyze:predictions [leagueId] [season] [limit]
```

**Ejemplo:**
```bash
# Analizar 20 partidos de Premier League 2024
npm run analyze:predictions 39 2024 20

# Analizar 50 partidos de La Liga 2024
npm run analyze:predictions 140 2024 50
```

### Resultados

Los resultados se guardan en:
- **Directorio:** `results/`
- **Formato:** `prediction-analysis-{leagueId}-{season}-{timestamp}.json`

### Interpretar Resultados

1. **Precisión:** % de predicciones correctas (objetivo: >60%)
2. **MAE:** Error promedio absoluto (objetivo: <0.15)
3. **Brier Score:** Calibración (objetivo: <0.25, menor es mejor)

### Análisis Semanal Recomendado

Ejecutar análisis semanal para monitorear precisión:

```bash
# Crear script semanal (cron job)
0 0 * * 0 cd /ruta/proyecto && npm run analyze:predictions 39 2024 20
```

---

## Ajustar Pesos del Modelo

### Ubicación de Configuración

Los pesos están en: `engine/predictionConfig.js`

### Pesos Globales

```javascript
poissonCalibration: {
  poissonWeight: 0.80,      // 80% peso de Poisson
  traditionalWeight: 0.20    // 20% peso de factores tradicionales
}
```

### Pesos por Perfil

```javascript
profilesConfig: {
  balanceado: {
    weights: {
      forma: 0.25,
      localia: 0.15,
      xg: 0.25,
      rachas: 0.05,
      rendimiento: 0.10,
      base: 0.30
    }
  }
}
```

### Proceso de Ajuste

1. **Hacer backup de configuración actual**
2. **Modificar valores en `predictionConfig.js`**
3. **Ejecutar análisis de precisión:**
   ```bash
   npm run analyze:predictions
   ```
4. **Comparar resultados con configuración anterior**
5. **Ajustar iterativamente hasta encontrar mejor configuración**

### Recomendaciones

- ⚠️ **No ajustar sin datos:** Siempre ejecutar análisis después de cambios
- ⚠️ **Cambios pequeños:** Ajustar en incrementos de 0.05-0.10
- ⚠️ **Documentar cambios:** Anotar qué cambió y por qué
- ⚠️ **Validar con múltiples ligas:** Probar en diferentes ligas

---

## Calibrar Valores del Modelo

### Valores Calibrables

En `engine/predictionConfig.js`:

1. **Factor de Localía:**
   ```javascript
   homeAdvantage: {
     base: 0.15  // 15% de ventaja base
   }
   ```

2. **Puntos de Forma:**
   ```javascript
   formPoints: {
     win: 0.6,   // Puntos por victoria
     draw: 0.3,  // Puntos por empate
     loss: 0.0   // Puntos por derrota
   }
   ```

3. **Factor de Racha:**
   ```javascript
   streakFactor: {
     incrementPerGame: 0.04,  // 4% por partido
     maxBonus: 0.2            // Máximo 20%
   }
   ```

4. **Umbrales de Recomendación:**
   ```javascript
   recommendationThresholds: {
     highProbability: 0.55,
     drawProbability: 0.35,
     smallDifference: 0.15,
     strongForm: 0.6,
     minStreak: 3
   }
   ```

### Proceso de Calibración

1. **Recopilar datos históricos:**
   - Al menos 100 partidos
   - Múltiples ligas
   - Diferentes temporadas

2. **Ejecutar análisis con valores actuales:**
   ```bash
   npm run analyze:predictions
   ```

3. **Ajustar valores y comparar:**
   - Modificar un valor a la vez
   - Ejecutar análisis
   - Comparar métricas

4. **Documentar mejor configuración:**
   - Anotar valores óptimos
   - Documentar resultados
   - Actualizar `predictionConfig.js`

---

## Monitoreo del Sistema

### Logs del Servidor

Revisar logs regularmente para:

1. **Errores de API:**
   - Rate limits
   - Timeouts
   - Datos faltantes

2. **Rendimiento de Cache:**
   - Hit rate
   - Tiempos de respuesta
   - Llamadas a API evitadas

3. **Errores del Motor:**
   - Datos inválidos
   - Cálculos fallidos
   - Excepciones

### Métricas Clave

1. **Tasa de Éxito de Predicciones:**
   - Ejecutar análisis semanal
   - Comparar con semanas anteriores
   - Alertar si baja de 60%

2. **Tiempo de Respuesta:**
   - Monitorear tiempos promedio
   - Alertar si > 5 segundos
   - Optimizar si es necesario

3. **Uso de Cache:**
   - Monitorear hit rate
   - Objetivo: > 70% hit rate
   - Ajustar TTL si es necesario

---

## Solución de Problemas Comunes

### Problema: Predicciones Inconsistentes

**Posibles Causas:**
- Datos faltantes de API
- Cache desactualizado
- Valores de configuración incorrectos

**Solución:**
1. Verificar logs para errores
2. Limpiar cache
3. Verificar configuración

### Problema: Respuestas Lentas

**Posibles Causas:**
- Cache no funcionando
- Demasiadas llamadas a API
- Servidor sobrecargado

**Solución:**
1. Verificar que cache está activo
2. Revisar logs de llamadas a API
3. Considerar activar Redis

### Problema: Baja Precisión

**Posibles Causas:**
- Valores de configuración no calibrados
- Datos de API incompletos
- Modelo necesita ajuste

**Solución:**
1. Ejecutar análisis de precisión
2. Comparar con resultados anteriores
3. Ajustar pesos del modelo
4. Considerar recalibrar valores

### Problema: Errores de API Externa

**Posibles Causas:**
- API key inválida o expirada
- Rate limit alcanzado
- Problemas de red

**Solución:**
1. Verificar API key
2. Revisar límites de rate
3. Implementar retry logic (futuro)
4. Contactar soporte de API

---

## Actualizaciones del Modelo

### Cuándo Actualizar

1. **Nuevos datos disponibles:** Cuando la API añade nuevas métricas
2. **Mejoras del modelo:** Cuando se desarrollan mejoras
3. **Calibración:** Cuando análisis muestra mejor configuración

### Proceso de Actualización

1. **Hacer backup:**
   ```bash
   cp engine/predictionConfig.js engine/predictionConfig.js.backup
   ```

2. **Actualizar código:**
   ```bash
   git pull
   npm install
   ```

3. **Probar cambios:**
   ```bash
   npm test
   npm run analyze:predictions
   ```

4. **Desplegar:**
   ```bash
   pm2 restart goallogic-predictions
   ```

5. **Monitorear:**
   - Revisar logs
   - Ejecutar análisis después de 24h
   - Comparar resultados

---

## Mejores Prácticas

### Configuración

- ✅ Mantener valores calibrados documentados
- ✅ No cambiar múltiples valores a la vez
- ✅ Validar cambios con análisis

### Cache

- ✅ Monitorear hit rate regularmente
- ✅ Ajustar TTL según necesidades
- ✅ Limpiar cache cuando sea necesario

### Análisis

- ✅ Ejecutar análisis semanal
- ✅ Comparar resultados históricos
- ✅ Documentar cambios significativos

### Seguridad

- ✅ No exponer API keys
- ✅ Mantener dependencias actualizadas
- ✅ Revisar logs regularmente

---

## Recursos Adicionales

- **Documentación de API:** `docs/API_PREDICTIONS.md`
- **Guía de Usuario:** `docs/USER_GUIDE_PREDICCIONES.md`
- **Guía de Despliegue:** `docs/DEPLOYMENT_GUIDE.md`
- **Análisis Técnico:** `ANALISIS_BOTON_PREDICCIONES.md`

---

**Última actualización:** $(date)

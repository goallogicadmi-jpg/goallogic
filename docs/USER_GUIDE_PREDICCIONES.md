# Guía de Usuario - Motor de Predicciones

## ¿Qué es el Motor de Predicciones?

El Motor de Predicciones de GoalLogic es un sistema avanzado que utiliza datos reales de la API de fútbol y modelos estadísticos para predecir los resultados de partidos. Combina múltiples factores para generar probabilidades precisas de victoria local, empate y victoria visitante.

---

## ¿Cómo Funciona?

### Modelo Poisson (80% del peso)

El modelo Poisson es un modelo estadístico ampliamente usado en predicciones de fútbol. Funciona así:

1. **Calcula la tasa de goles esperados (lambda)** para cada equipo basándose en:
   - Promedio de goles a favor del equipo
   - Promedio de goles en contra del oponente
   - Ajuste por ventaja local (jugar en casa)
   - Ajuste por promedios de liga (si están disponibles)

2. **Genera una matriz de probabilidades** de marcador usando la distribución de Poisson:
   - Calcula la probabilidad de cada marcador posible (0-0, 1-0, 0-1, 1-1, etc.)
   - Suma las probabilidades para obtener:
     - Probabilidad de victoria local
     - Probabilidad de empate
     - Probabilidad de victoria visitante

### Factores Tradicionales (20% del peso)

Para complementar el modelo Poisson, también consideramos:

- **Forma Reciente:** Resultados de los últimos 5 partidos (W=Victoria, D=Empate, L=Derrota)
- **Ventaja Local:** Bonus por jugar en casa
- **xG/xGA Normalizado:** Expected Goals ajustados por promedios de liga
- **Rachas:** Partidos consecutivos sin perder
- **Rendimiento Histórico:** Porcentaje de puntos obtenidos
- **Estadísticas Base:** Tasa de victorias histórica

### Combinación Final

Las probabilidades finales combinan ambos métodos:
- **80%** del peso viene del modelo Poisson
- **20%** del peso viene de factores tradicionales

---

## ¿Qué Significan las Métricas?

### Probabilidades

- **Probabilidad Local:** Probabilidad de que gane el equipo local (0-100%)
- **Probabilidad Empate:** Probabilidad de que el partido termine empatado (0-100%)
- **Probabilidad Visitante:** Probabilidad de que gane el equipo visitante (0-100%)

**Nota:** Las tres probabilidades siempre suman 100%.

### Goles Esperados

- **Goles Esperados Local:** Número promedio de goles que se espera que anote el equipo local
- **Goles Esperados Visitante:** Número promedio de goles que se espera que anote el equipo visitante

Estos valores se calculan usando el modelo Poisson y representan el promedio esperado, no una predicción exacta.

### Métricas Avanzadas

#### xG (Expected Goals)
- **xG Local:** Goles esperados del equipo local basados en oportunidades de gol
- **xGA Local:** Goles esperados en contra del equipo local (calidad defensiva)
- **xG Visitante:** Goles esperados del equipo visitante
- **xGA Visitante:** Goles esperados en contra del equipo visitante

**⚠️ Importante:** Si ves "(est.)" junto a un valor de xG, significa que la API no proporcionó este dato y se usó una estimación basada en el promedio de goles.

#### Forma Reciente
- **Forma Local/Visitante:** String con resultados de últimos 5 partidos
  - **W** = Victoria (Win)
  - **D** = Empate (Draw)
  - **L** = Derrota (Loss)
  - Ejemplo: "WWDLW" = Ganó, Ganó, Empató, Perdió, Ganó

#### Racha
- **Racha Local/Visitante:** Número de partidos consecutivos sin perder o ganados

#### Rendimiento
- **Rendimiento Local/Visitante:** Porcentaje de puntos obtenidos jugando como local/visitante
  - Se calcula: (Puntos obtenidos / Puntos máximos posibles) × 100

#### Promedio de Goles
- **Promedio Local/Visitante:** Promedio de goles a favor y en contra
  - Formato: "a_favor / en_contra"

---

## ¿De Dónde Vienen los Datos?

### Datos Directos de la API

Estos datos provienen directamente de la API externa (API-Football):

- ✅ Promedios de goles (a favor y en contra)
- ✅ xG/xGA (cuando está disponible)
- ✅ Estadísticas de partidos
- ✅ Información de equipos y ligas

### Datos Calculados

Estos datos se calculan desde datos reales de la API:

- ✅ **Forma Reciente:** Calculada desde resultados de últimos 5 partidos
- ✅ **Racha:** Calculada desde resultados consecutivos
- ✅ **Rendimiento:** Calculado desde victorias, empates y partidos jugados
- ✅ **Promedios de Liga:** Calculados desde últimos 10 partidos de la liga

### Datos Estimados

Estos datos se estiman cuando la API no los proporciona:

- ⚠️ **xG Estimado:** Cuando la API no tiene xG, se usa el promedio de goles como estimación
- ⚠️ Siempre se indica claramente cuando un dato es estimado

---

## Perfiles de Predicción

Puedes elegir entre tres perfiles diferentes:

### Conservador
- Favorece localía y rendimiento histórico
- Más seguro, menos volátil
- Ideal para: Predicciones a largo plazo, análisis conservador

### Balanceado (Recomendado)
- Equilibrio entre todos los factores
- Combina modelo Poisson con factores contextuales
- Ideal para: Uso general, mayoría de casos

### Agresivo
- Favorece xG/xGA y forma reciente
- Más reactivo a tendencias actuales
- Ideal para: Predicciones a corto plazo, equipos en buena forma

---

## Interpretando las Recomendaciones

El motor genera recomendaciones basadas en las probabilidades:

- **"Victoria Local"** o **"Victoria Visitante":** Probabilidad > 55% para ese resultado
- **"Empate Probable":** Probabilidad de empate > 35% y diferencia pequeña entre equipos
- **"Victoria Local (Forma Fuerte)":** Probabilidad alta + forma reciente fuerte + racha significativa

---

## Transparencia del Modelo

El motor es completamente transparente. Puedes ver:

1. **Origen de cada dato:** API, Calculado, o Estimado
2. **Métodos usados:** Si se aplicó modelo Poisson y normalización de xG
3. **Explicación del cálculo:** Cómo se combinaron los factores

Haz clic en "Ver detalles" en la tarjeta de predicciones para ver toda esta información.

---

## Preguntas Frecuentes

### ¿Por qué las probabilidades no siempre coinciden con mi intuición?

Las probabilidades se basan en datos estadísticos y modelos matemáticos, no en intuición. Pueden diferir de lo que "sentimos" porque consideran factores objetivos que no siempre son obvios.

### ¿Qué tan precisas son las predicciones?

La precisión varía según múltiples factores. El motor está calibrado para maximizar la precisión, pero el fútbol es impredecible por naturaleza. Las predicciones son estimaciones basadas en datos históricos.

### ¿Por qué a veces veo "xG estimado"?

La API externa no siempre proporciona datos de xG para todos los partidos. En esos casos, usamos el promedio de goles como estimación y lo indicamos claramente.

### ¿Puedo confiar en las recomendaciones?

Las recomendaciones son interpretaciones de las probabilidades. Son útiles como guía, pero siempre debes considerar otros factores (lesiones, motivación, contexto del partido, etc.).

### ¿Cómo elijo el mejor perfil?

- **Conservador:** Si prefieres predicciones más estables y basadas en historia
- **Balanceado:** Si quieres un equilibrio (recomendado para la mayoría)
- **Agresivo:** Si quieres predicciones más reactivas a la forma reciente

---

## Notas Importantes

1. **Las predicciones no son garantías:** Son estimaciones basadas en datos históricos
2. **El fútbol es impredecible:** Factores como lesiones, motivación y suerte pueden cambiar resultados
3. **Usa las predicciones como guía:** Combínalas con tu propio análisis y conocimiento
4. **Los datos se actualizan regularmente:** El motor usa los datos más recientes disponibles

---

**Última actualización:** $(date)

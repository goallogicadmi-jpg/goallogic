# Análisis Técnico: Botones "Comparar" y "Predicciones" en el Módulo de Partidos

## Resumen Ejecutivo

Este documento analiza en detalle los dos botones principales dentro del módulo de Partidos: **"Comparar"** y **"Predicciones"** (también conocido como "Ver Predicciones"). Se identifican sus rutas, parámetros, componentes renderizados, funciones y dependencias.

---

## 1. BOTÓN "COMPARAR"

### 1.1 Ubicación y Estructura

**Archivo:** `frontend/src/pages/Partidos.jsx`  
**Líneas:** 244-278

**Características:**
- **No está dentro de `PartidoCard.jsx`**, sino en el componente padre `Partidos.jsx`
- Aparece como un botón flotante fijo en la esquina inferior derecha
- Solo se muestra cuando hay **2 o más partidos seleccionados** en `partidosComparacion`

### 1.2 Ruta y Navegación

**❌ NO NAVEGA A NINGUNA RUTA**

El botón **NO utiliza React Router** ni navegación. En su lugar:
- Abre un **modal/overlay** directamente sobre la página actual
- Usa `setMostrarComparador(true)` para mostrar el componente `ComparadorPredicciones`
- El modal se renderiza con `position: fixed` cubriendo toda la pantalla

### 1.3 Parámetros y Props Enviados

**Componente renderizado:** `ComparadorPredicciones`  
**Props enviadas:**

```javascript
<ComparadorPredicciones
  fixtureIdA={partidosComparacion[0]?.fixture?.id}
  fixtureIdB={partidosComparacion[1]?.fixture?.id}
  profile="balanceado"
  onClose={() => {
    setMostrarComparador(false);
    setPartidosComparacion([]);
  }}
/>
```

**Parámetros:**
- `fixtureIdA`: ID del primer partido seleccionado (`partidosComparacion[0].fixture.id`)
- `fixtureIdB`: ID del segundo partido seleccionado (`partidosComparacion[1].fixture.id`)
- `profile`: Perfil de predicción (hardcodeado a `"balanceado"`)
- `onClose`: Función que cierra el modal y limpia la selección

### 1.4 Componente Renderizado

**Componente:** `frontend/src/components/Comparador/ComparadorPredicciones.jsx`

**Funcionalidad:**
- Compara dos partidos lado a lado
- Muestra probabilidades (Local, Empate, Visitante) para cada partido
- Muestra métricas avanzadas (xG, xGA, Rendimiento, Racha)
- Genera insights de comparación
- Permite exportar análisis de cada partido
- Muestra gráfico de tendencias históricas (opcional)

### 1.5 Datos Utilizados

**Endpoint del backend:**
- `/api/predictions/compare?fixtureIdA={idA}&fixtureIdB={idB}&profile={profile}`

**Función API:** `comparePredictions(fixtureIdA, fixtureIdB, profile)`  
**Archivo:** `frontend/src/api/api.js` (línea 313)

**Datos que consume:**
- Predicciones del partido A (probabilidades, métricas, recomendación)
- Predicciones del partido B (probabilidades, métricas, recomendación)
- Historial de predicciones del equipo local (opcional, cuando se expande)

### 1.6 Flujo del Usuario

1. Usuario selecciona **2 partidos** haciendo clic en cada tarjeta (selección múltiple)
2. Los partidos se agregan a `partidosComparacion` (estado en `Partidos.jsx`)
3. Aparece el botón flotante **"🔄 Comparar (2)"** en la esquina inferior derecha
4. Usuario hace clic en el botón
5. Se abre el modal `ComparadorPredicciones` con ambos partidos lado a lado
6. Usuario puede:
   - Ver comparación de probabilidades
   - Ver insights generados
   - Exportar análisis de cada partido
   - Ver tendencias históricas
7. Usuario cierra el modal con el botón "✕ Cerrar"
8. El estado se limpia (`partidosComparacion = []`)

### 1.7 Dependencias

**Depende de:**
- Estado `partidosComparacion` en `Partidos.jsx`
- Función `onPartidoComparacionChange` en `AgrupadorPartidos.jsx`
- Endpoint `/api/predictions/compare` en el backend
- Componente `ComparadorPredicciones.jsx`

**No depende de:**
- React Router (no navega)
- Módulo de Equipos
- Módulo de Predicciones (página principal)
- Estado global

---

## 2. BOTÓN "PREDICCIONES" (Ver Predicciones)

### 2.1 Ubicación y Estructura

**Archivo:** `frontend/src/components/Partidos/PartidoCard.jsx`  
**Líneas:** 252-261

**Características:**
- Está dentro de cada `PartidoCard` individual
- Es un botón simple con el texto "Predicciones"
- Se muestra en todas las tarjetas de partido

### 2.2 Ruta y Navegación

**❌ NO NAVEGA A NINGUNA RUTA**

El botón **NO utiliza React Router** ni navegación. En su lugar:
- Expande/colapsa el componente `PrediccionesCard` **dentro de la misma tarjeta**
- Usa estado local `mostrarPredicciones` para controlar la visibilidad
- La animación se hace con CSS transitions (`maxHeight` y `opacity`)

### 2.3 Parámetros y Props Enviados

**Función llamada:** `handlePrediccionesClick`  
**Endpoint del backend:**
- `/api/predictions?fixtureId={fixtureId}&profile={profile}`

**Función API:** `getMatchPredictions(fixtureId, profile)`  
**Archivo:** `frontend/src/api/api.js` (línea 298)

**Parámetros enviados:**
- `fixtureId`: ID del fixture del partido (`partido.fixture.id`)
- `profile`: Perfil de predicción (default: `'balanceado'`, configurable por usuario)

**Componente renderizado:** `PrediccionesCard`  
**Props enviadas:**

```javascript
<PrediccionesCard 
  {...predicciones}
  perfil={perfilPrediccion}
  fixtureId={fixtureId}
  onPerfilChange={(nuevoPerfil) => {
    setPerfilPrediccion(nuevoPerfil);
  }}
/>
```

### 2.4 Componente Renderizado

**Componente:** `frontend/src/components/Partidos/PrediccionesCard.jsx`

**Funcionalidad:**
- Muestra probabilidades (Local, Empate, Visitante)
- Muestra goles esperados
- Muestra métricas avanzadas (xG, xGA, rendimiento, racha, etc.)
- Muestra promedio de corners esperados
- Muestra componente de transparencia (`PrediccionTransparency`)
- Muestra insights del partido (`InsightsCard`)
- Permite cambiar el perfil de predicción (conservador, balanceado, agresivo)

### 2.5 Datos Utilizados

**Endpoint del backend:**
- `/api/predictions?fixtureId={fixtureId}&profile={profile}`

**Datos que consume:**
- Probabilidades (Local, Empate, Visitante)
- Goles esperados (Local, Visitante)
- Métricas avanzadas:
  - xG y xGA (normalizados por liga)
  - Rendimiento
  - Racha
  - Forma reciente
  - Promedio de corners esperados
- Recomendación basada en el perfil
- Indicadores de transparencia (origen de datos, uso de Poisson, etc.)

**Caché implementado:**
- Las predicciones se cachean en `cachePredicciones` (objeto global)
- Clave de caché: `${fixtureId}_${profile}`
- Evita llamadas redundantes a la API

### 2.6 Flujo del Usuario

1. Usuario hace clic en el botón **"Predicciones"** dentro de una tarjeta de partido
2. Si las predicciones ya están cargadas y mostradas, se ocultan
3. Si no están cargadas:
   - Se muestra un spinner de carga
   - Se verifica el caché primero
   - Si no hay en caché, se llama a `/api/predictions?fixtureId={id}&profile={profile}`
   - Se guardan en caché
   - Se expande `PrediccionesCard` con animación
4. Usuario puede:
   - Ver probabilidades y métricas
   - Cambiar el perfil de predicción (conservador, balanceado, agresivo)
   - Ver detalles de transparencia
   - Ver insights del partido
5. Usuario puede hacer clic nuevamente para ocultar las predicciones

### 2.7 Dependencias

**Depende de:**
- `fixtureId` del partido (obligatorio)
- Endpoint `/api/predictions` en el backend
- Componente `PrediccionesCard.jsx`
- Componente `PrediccionTransparency.jsx`
- Componente `InsightsCard.jsx`
- Motor de predicciones (`engine/predictionEngine.js`)

**No depende de:**
- React Router (no navega)
- Módulo de Equipos
- Módulo de Predicciones (página principal `/predicciones`)
- Estado global
- Otros partidos

---

## 3. COMPARACIÓN Y DIFERENCIAS

### 3.1 Similitudes

- Ambos botones **NO navegan a rutas**
- Ambos usan el mismo endpoint base (`/api/predictions`)
- Ambos muestran predicciones y métricas avanzadas
- Ambos permiten cambiar el perfil de predicción

### 3.2 Diferencias Clave

| Aspecto | Botón "Comparar" | Botón "Predicciones" |
|---------|------------------|----------------------|
| **Ubicación** | Componente padre (`Partidos.jsx`) | Dentro de cada `PartidoCard` |
| **Visibilidad** | Solo cuando hay 2 partidos seleccionados | Siempre visible en cada tarjeta |
| **Tipo de UI** | Modal/Overlay flotante | Expansión dentro de la tarjeta |
| **Cantidad de partidos** | 2 partidos (comparación) | 1 partido (análisis individual) |
| **Endpoint** | `/api/predictions/compare` | `/api/predictions` |
| **Props requeridas** | `fixtureIdA`, `fixtureIdB` | `fixtureId` |
| **Componente** | `ComparadorPredicciones` | `PrediccionesCard` |
| **Funcionalidad extra** | Insights de comparación, exportación, gráficos históricos | Transparencia, insights del partido, corners esperados |

---

## 4. PROBLEMAS DETECTADOS Y RECOMENDACIONES

### 4.1 Botón "Comparar"

**Problemas:**
1. ❌ **Perfil hardcodeado**: El perfil está fijado a `"balanceado"`, no es configurable por el usuario
2. ❌ **No hay indicador visual de selección**: No es claro qué partidos están seleccionados para comparar
3. ❌ **Límite de 2 partidos**: Solo permite comparar 2 partidos, podría ser más flexible
4. ⚠️ **Botón flotante puede ser intrusivo**: El botón flotante puede ocultar contenido importante

**Recomendaciones:**
1. ✅ Permitir al usuario seleccionar el perfil de predicción antes de comparar
2. ✅ Agregar indicadores visuales (checkboxes o badges) en las tarjetas seleccionadas
3. ✅ Considerar permitir comparar 3 o más partidos (con scroll horizontal o tabs)
4. ✅ Mover el botón a una posición menos intrusiva o hacerlo colapsable

### 4.2 Botón "Predicciones"

**Problemas:**
1. ❌ **No hay navegación a página completa**: Si el usuario quiere ver más detalles, no puede navegar a la página principal de Predicciones
2. ❌ **No muestra probabilidades GoalLogic**: Solo muestra probabilidades del motor tradicional, no las nuevas probabilidades GoalLogic implementadas
3. ⚠️ **Caché global puede causar problemas**: El caché es global y puede no invalidarse correctamente

**Recomendaciones:**
1. ✅ Agregar un botón "Ver análisis completo" que navegue a `/predicciones` con los IDs de los equipos
2. ✅ Integrar las probabilidades GoalLogic en `PrediccionesCard.jsx`
3. ✅ Implementar invalidación de caché cuando cambian los datos del partido
4. ✅ Agregar un indicador de cuándo los datos están en caché vs. recién cargados

---

## 5. CONCLUSIÓN

### 5.1 Estado Actual

- **Botón "Comparar"**: Funcional, pero con limitaciones (perfil hardcodeado, solo 2 partidos)
- **Botón "Predicciones"**: Funcional, pero no integrado con las nuevas probabilidades GoalLogic

### 5.2 Funcionalidad Real

- **"Comparar"**: Compara 2 partidos lado a lado en un modal, útil para análisis comparativo
- **"Predicciones"**: Muestra predicciones individuales de un partido dentro de su tarjeta, útil para análisis rápido

### 5.3 Correcciones Necesarias

1. **Integrar probabilidades GoalLogic** en `PrediccionesCard.jsx`
2. **Hacer configurable el perfil** en el botón "Comparar"
3. **Agregar navegación** desde "Predicciones" a la página completa de Predicciones
4. **Mejorar indicadores visuales** de selección para comparación

---

## 6. ARCHIVOS RELACIONADOS

### Backend
- `server.js` - Endpoints `/api/predictions` y `/api/predictions/compare`

### Frontend - Componentes
- `frontend/src/pages/Partidos.jsx` - Componente principal, contiene botón "Comparar"
- `frontend/src/components/Partidos/PartidoCard.jsx` - Contiene botón "Predicciones"
- `frontend/src/components/Partidos/PrediccionesCard.jsx` - Muestra predicciones individuales
- `frontend/src/components/Comparador/ComparadorPredicciones.jsx` - Compara 2 partidos
- `frontend/src/components/Partidos/AgrupadorPartidos.jsx` - Maneja selección de partidos

### Frontend - Utilidades
- `frontend/src/api/api.js` - Funciones `getMatchPredictions()` y `comparePredictions()`

### Motor de Predicciones
- `engine/predictionEngine.js` - Motor principal de predicciones
- `engine/predictionConfig.js` - Configuración de perfiles y pesos
- `frontend/src/utils/calculateGoalLogicProbability.js` - Cálculo de probabilidades GoalLogic

---

**Fecha de análisis:** 2024  
**Versión del código analizada:** Actual

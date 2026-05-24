# 📋 Plan de Implementación: "Ligas" → "Torneos"

## 🎯 Objetivo
Renombrar completamente la sección "Ligas" a "Torneos" en toda la plataforma, incluyendo rutas, componentes, estados, variables y documentación.

---

## 📁 Archivos a Modificar

### Frontend - Componentes y Páginas

#### 1. **`frontend/src/pages/Leagues.jsx` → `Torneos.jsx`**
**Prioridad:** 🔴 CRÍTICA  
**Cambios:**
- Renombrar archivo: `Leagues.jsx` → `Torneos.jsx`
- Renombrar componente: `export default function Leagues()` → `export default function Torneos()`
- Cambiar estados:
  - `const initialState = location.state?.activeSection || "ligas"` → `"torneos"`
  - `if (activeSection === "ligas"` → `"torneos"` (múltiples ocurrencias)
- Cambiar variables:
  - `ligas` → `torneos`
  - `setLigas` → `setTorneos`
  - `loadingLigas` → `loadingTorneos`
  - `setLoadingLigas` → `setLoadingTorneos`
  - `ligasPrincipalesIds` → `torneosPrincipalesIds`
  - `ligasDisponibles` → `torneosDisponibles`
- Cambiar comentarios y logs que mencionen "ligas"
- Actualizar referencias a `activeSection === "ligas"` → `"torneos"`

**Líneas afectadas:** ~535 líneas (todo el archivo)

#### 2. **`frontend/src/router/AppRouter.jsx`**
**Prioridad:** 🔴 CRÍTICA  
**Cambios:**
- Cambiar import: `import Leagues from "../pages/Leagues"` → `import Torneos from "../pages/Torneos"`
- Cambiar rutas:
  - `<Route path="/" element={<Leagues />} />` → `<Route path="/" element={<Torneos />} />`
  - `<Route path="/ligas" element={<Leagues />} />` → `<Route path="/torneos" element={<Torneos />} />`
  - `<Route path="/ligas/:liga/teams" element={<Teams />} />` → `<Route path="/torneos/:torneo/teams" element={<Teams />} />`
  - `<Route path="/ligas/:liga/teams/:equipo" element={<TeamDetails />} />` → `<Route path="/torneos/:torneo/teams/:equipo" element={<TeamDetails />} />`

**Líneas afectadas:** 4-5 líneas

#### 3. **`frontend/src/layout/Layout.jsx`**
**Prioridad:** 🔴 CRÍTICA  
**Cambios:**
- Cambiar detección de ruta activa:
  - `if (path === '/' || path === '/ligas') return 'ligas'` → `'torneos'`
- Cambiar navegación:
  - `case 'ligas': navigate('/ligas')` → `case 'torneos': navigate('/torneos')`
- Cambiar referencia a "Mi Cuenta":
  - `navigate('/ligas', { state: { activeSection: 'proyecto' } })` → `navigate('/torneos', { state: { activeSection: 'proyecto' } })`
- Cambiar botón del header:
  - `{ label: 'Ligas', section: 'ligas', path: '/ligas' }` → `{ label: 'Torneos', section: 'torneos', path: '/torneos' }`
- Cambiar condición de icono:
  - `else if (btn.section === 'ligas')` → `'torneos'`
- Cambiar comentarios:
  - `// Para "Mi Cuenta", se maneja internamente en Leagues.jsx` → `Torneos.jsx`

**Líneas afectadas:** ~10 líneas

#### 4. **`frontend/src/api/api.js`**
**Prioridad:** 🟡 MEDIA  
**Cambios:**
- Renombrar función: `obtenerLigas()` → `obtenerTorneos()`
- Cambiar logs:
  - `console.log("✅ Ligas encontradas:", ...)` → `"Torneos encontrados:"`
- **NOTA:** El endpoint `/api/leagues` puede mantenerse igual en el backend (solo cambiar logs)

**Líneas afectadas:** ~30 líneas

#### 5. **`frontend/src/pages/Torneos.jsx`** (nuevo archivo)
**Cambios:**
- Actualizar import: `import { obtenerLigas } from "../api/api"` → `import { obtenerTorneos } from "../api/api"`
- Actualizar llamada: `obtenerLigas()` → `obtenerTorneos()`

**Líneas afectadas:** 2 líneas

### Backend - Servidor

#### 6. **`server.js`**
**Prioridad:** 🟡 MEDIA  
**Cambios:**
- Cambiar comentarios y logs:
  - `// 📌 Obtener lista de ligas desde API-Football` → `"torneos"`
  - `console.log("🔍 [LEAGUES] ...")` → `"[TORNEOS] ..."`
  - `res.status(500).json({ error: "Error al obtener ligas" })` → `"torneos"`
- **NOTA:** El endpoint `/api/leagues` puede mantenerse por compatibilidad, o cambiarse a `/api/torneos`

**Líneas afectadas:** ~10 líneas (solo logs y comentarios)

### Archivos con Referencias Indirectas

#### 7. **`frontend/src/pages/Teams.jsx`**
**Prioridad:** 🟢 BAJA  
**Cambios:**
- Actualizar parámetro de ruta: `:liga` → `:torneo` (si se usa en el código)
- Actualizar navegación si hay links a `/ligas`

**Líneas afectadas:** 1-2 líneas (si aplica)

#### 8. **`frontend/src/pages/TeamDetails.jsx`**
**Prioridad:** 🟢 BAJA  
**Cambios:**
- Similar a Teams.jsx

#### 9. **`frontend/src/components/StandingsTable.jsx`**
**Prioridad:** 🟢 BAJA  
**Cambios:**
- Revisar si hay referencias a "ligas" en comentarios o logs

#### 10. **Otros archivos con referencias**
**Prioridad:** 🟢 BAJA  
**Archivos a revisar:**
- `frontend/src/components/MiCuenta/DashboardUsuario.jsx` (tiene `id="grafica-ligas"`)
- `frontend/src/components/Partidos/AgrupadorPartidos.jsx` (puede tener referencias)
- `frontend/src/services/statsService.js`
- `frontend/src/utils/favoritos.js`
- `frontend/src/utils/chartUtils.js`
- `frontend/src/services/favoritesService.js`

**Cambios:** Solo si hay referencias directas a rutas o nombres de componentes

---

## 🔄 Cambios Específicos por Categoría

### Rutas
| Ruta Antigua | Ruta Nueva | Tipo |
|--------------|------------|------|
| `/ligas` | `/torneos` | Principal |
| `/ligas/:liga/teams` | `/torneos/:torneo/teams` | Con parámetro |
| `/ligas/:liga/teams/:equipo` | `/torneos/:torneo/teams/:equipo` | Con parámetros |

**Consideración:** Mantener redirección `/ligas` → `/torneos` por compatibilidad (opcional)

### Estados y Variables
| Estado/Variable Antiguo | Estado/Variable Nuevo | Ubicación |
|-------------------------|----------------------|-----------|
| `activeSection === "ligas"` | `"torneos"` | Layout.jsx, Torneos.jsx |
| `ligas` | `torneos` | Torneos.jsx |
| `setLigas` | `setTorneos` | Torneos.jsx |
| `loadingLigas` | `loadingTorneos` | Torneos.jsx |
| `ligasPrincipalesIds` | `torneosPrincipalesIds` | Torneos.jsx |
| `ligasDisponibles` | `torneosDisponibles` | Torneos.jsx |

### Funciones
| Función Antigua | Función Nueva | Ubicación |
|----------------|---------------|-----------|
| `obtenerLigas()` | `obtenerTorneos()` | api.js |
| `function Leagues()` | `function Torneos()` | Torneos.jsx |

### Nombres de Componentes
| Componente Antiguo | Componente Nuevo | Ubicación |
|-------------------|------------------|-----------|
| `Leagues` | `Torneos` | pages/Torneos.jsx |
| `import Leagues` | `import Torneos` | AppRouter.jsx |

### Comentarios y Documentación
- Actualizar todos los comentarios que mencionen "ligas" → "torneos"
- Actualizar logs de consola
- Actualizar documentación interna

---

## ⚠️ Consideraciones para Evitar Romper Lógica Existente

### 1. **Compatibilidad con "Mi Cuenta"**
**Problema:** El botón "Mi Cuenta" navega a `/ligas` con estado `{ activeSection: 'proyecto' }`

**Solución:**
- Cambiar navegación a `/torneos` en Layout.jsx
- El componente Torneos.jsx debe seguir manejando `activeSection === "proyecto"` correctamente

**Archivo afectado:** `Layout.jsx` línea 83

### 2. **Ruta Raíz `/`**
**Problema:** La ruta `/` renderiza el componente de ligas/torneos

**Solución:**
- Cambiar `<Route path="/" element={<Leagues />} />` → `<Route path="/" element={<Torneos />} />`
- Actualizar detección en Layout.jsx: `if (path === '/' || path === '/ligas')` → `if (path === '/' || path === '/torneos')`

**Archivos afectados:** `AppRouter.jsx`, `Layout.jsx`

### 3. **Parámetros de Ruta `:liga`**
**Problema:** Las rutas `/ligas/:liga/teams` usan el parámetro `:liga`

**Solución:**
- Cambiar a `/torneos/:torneo/teams`
- Verificar que `Teams.jsx` y `TeamDetails.jsx` usen el parámetro correctamente
- Si usan `useParams().liga`, cambiar a `useParams().torneo` (o mantener compatibilidad)

**Archivos afectados:** `AppRouter.jsx`, `Teams.jsx`, `TeamDetails.jsx`

### 4. **Estado Interno `activeSection`**
**Problema:** El estado `activeSection === "ligas"` se usa en múltiples lugares

**Solución:**
- Cambiar todas las referencias a `"torneos"`
- Verificar que `"proyecto"` y `"escuela"` sigan funcionando
- Actualizar condición inicial: `location.state?.activeSection || "ligas"` → `"torneos"`

**Archivos afectados:** `Torneos.jsx` (múltiples líneas)

### 5. **Endpoint del Backend `/api/leagues`**
**Problema:** El endpoint puede tener referencias en otros lugares

**Solución:**
- **Opción A:** Mantener `/api/leagues` por compatibilidad (recomendado)
- **Opción B:** Crear `/api/torneos` que apunte a la misma lógica
- **Opción C:** Cambiar completamente a `/api/torneos` (requiere actualizar todos los llamados)

**Recomendación:** Opción A (mantener endpoint, solo cambiar logs)

### 6. **Referencias en Otros Componentes**
**Problema:** Componentes como `StandingsTable`, `EquipoDetalle`, etc. pueden tener referencias indirectas

**Solución:**
- Buscar y reemplazar referencias a rutas `/ligas`
- Verificar que no haya imports de `Leagues` en otros archivos
- Revisar navegaciones programáticas con `navigate('/ligas')`

### 7. **LocalStorage y Estado Persistente**
**Problema:** Si hay datos guardados en localStorage con claves como "ligas"

**Solución:**
- Buscar uso de localStorage relacionado con ligas
- Considerar migración de datos o mantener compatibilidad

---

## 📝 Orden Recomendado de Ejecución

### Fase 1: Preparación (Sin Cambios de Código)
1. ✅ Crear backup del código actual
2. ✅ Documentar todas las referencias encontradas
3. ✅ Crear lista de verificación (checklist)

### Fase 2: Backend (Bajo Riesgo)
1. ✅ Actualizar logs y comentarios en `server.js`
2. ✅ Verificar que el endpoint `/api/leagues` siga funcionando
3. ✅ (Opcional) Crear endpoint `/api/torneos` como alias

### Fase 3: API Frontend (Bajo Riesgo)
1. ✅ Renombrar función `obtenerLigas()` → `obtenerTorneos()` en `api.js`
2. ✅ Actualizar logs y comentarios
3. ✅ Verificar que la función siga funcionando correctamente

### Fase 4: Componente Principal (Alto Riesgo)
1. ✅ Renombrar archivo `Leagues.jsx` → `Torneos.jsx`
2. ✅ Renombrar componente `Leagues` → `Torneos`
3. ✅ Cambiar todas las referencias internas:
   - Estados: `ligas` → `torneos`
   - Variables: `ligasPrincipalesIds` → `torneosPrincipalesIds`
   - Condiciones: `activeSection === "ligas"` → `"torneos"`
4. ✅ Actualizar import de API: `obtenerLigas` → `obtenerTorneos`
5. ✅ Actualizar llamada: `obtenerLigas()` → `obtenerTorneos()`
6. ✅ Actualizar comentarios y logs

### Fase 5: Router (Alto Riesgo)
1. ✅ Actualizar import: `import Leagues` → `import Torneos`
2. ✅ Cambiar rutas:
   - `/` → `<Torneos />`
   - `/ligas` → `/torneos` → `<Torneos />`
   - `/ligas/:liga/teams` → `/torneos/:torneo/teams`
3. ✅ (Opcional) Agregar redirección `/ligas` → `/torneos`

### Fase 6: Layout (Alto Riesgo)
1. ✅ Actualizar detección de ruta activa: `path === '/ligas'` → `'/torneos'`
2. ✅ Cambiar navegación: `case 'ligas'` → `'torneos'`
3. ✅ Actualizar botón del header: `label: 'Ligas'` → `'Torneos'`
4. ✅ Actualizar navegación de "Mi Cuenta": `/ligas` → `/torneos`
5. ✅ Actualizar comentarios

### Fase 7: Componentes Relacionados (Medio Riesgo)
1. ✅ Revisar `Teams.jsx` y `TeamDetails.jsx` para parámetros de ruta
2. ✅ Revisar otros componentes con referencias indirectas
3. ✅ Actualizar navegaciones programáticas

### Fase 8: Limpieza y Verificación (Bajo Riesgo)
1. ✅ Buscar referencias restantes a "ligas" o "Leagues"
2. ✅ Actualizar documentación interna
3. ✅ Verificar que no haya imports rotos
4. ✅ Ejecutar pruebas manuales

---

## ✅ Checklist de Verificación

### Funcionalidad
- [ ] La ruta `/` muestra el componente Torneos
- [ ] La ruta `/torneos` muestra el componente Torneos
- [ ] El botón "Torneos" en el header funciona correctamente
- [ ] El botón "Mi Cuenta" navega a `/torneos` con estado correcto
- [ ] El dropdown de torneos se carga y muestra competiciones
- [ ] La selección de torneo funciona
- [ ] La tabla de posiciones se muestra correctamente
- [ ] Las rutas `/torneos/:torneo/teams` funcionan
- [ ] La navegación entre secciones (torneos, proyecto, escuela) funciona

### Código
- [ ] No hay imports rotos
- [ ] No hay referencias a `Leagues` o `ligas` en código crítico
- [ ] Todos los estados y variables están renombrados
- [ ] Los logs y comentarios están actualizados
- [ ] El endpoint del backend funciona correctamente

### Compatibilidad
- [ ] (Opcional) La ruta `/ligas` redirige a `/torneos`
- [ ] Los parámetros de ruta funcionan correctamente
- [ ] El estado `activeSection` funciona con todos los valores

---

## 🚨 Puntos de Atención Especial

### 1. **No Romper "Mi Cuenta"**
El botón "Mi Cuenta" depende de navegar a `/ligas` (ahora `/torneos`) con estado. Verificar que:
- La navegación funcione
- El estado se pase correctamente
- El componente Torneos detecte `activeSection === "proyecto"`

### 2. **Mantener Compatibilidad con Rutas Antiguas**
Si hay enlaces externos o bookmarks a `/ligas`, considerar:
- Redirección automática
- O mantener ambas rutas funcionando temporalmente

### 3. **Verificar Componentes Hijos**
Componentes como `StandingsTable`, `EquipoDetalle`, etc. deben seguir funcionando sin cambios si no tienen referencias directas a "ligas".

### 4. **Testing Manual**
Después de cada fase, realizar pruebas manuales:
- Navegar a todas las rutas
- Probar todos los botones
- Verificar que los datos se carguen correctamente
- Verificar que no haya errores en consola

---

## 📊 Estimación de Tiempo

| Fase | Tiempo Estimado | Riesgo |
|------|----------------|--------|
| Fase 1: Preparación | 30 min | Bajo |
| Fase 2: Backend | 15 min | Bajo |
| Fase 3: API Frontend | 15 min | Bajo |
| Fase 4: Componente Principal | 45 min | Alto |
| Fase 5: Router | 20 min | Alto |
| Fase 6: Layout | 30 min | Alto |
| Fase 7: Componentes Relacionados | 30 min | Medio |
| Fase 8: Limpieza | 30 min | Bajo |
| **Total** | **~3.5 horas** | |

---

## 🎯 Resultado Esperado

Después de la implementación:
- ✅ La sección se llama "Torneos" en toda la plataforma
- ✅ Las rutas usan `/torneos` en lugar de `/ligas`
- ✅ El componente se llama `Torneos` en lugar de `Leagues`
- ✅ Todos los estados y variables están actualizados
- ✅ La funcionalidad existente sigue funcionando
- ✅ No hay referencias rotas o imports fallidos

---

**Documento generado:** Plan de implementación completo  
**Fecha:** Plan basado en análisis del código actual  
**Propósito:** Guía paso a paso para el cambio "Ligas" → "Torneos"

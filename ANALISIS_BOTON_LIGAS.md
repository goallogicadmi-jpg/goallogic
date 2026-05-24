# 📋 Análisis Completo: Botón de "Ligas"

## 1. Archivo que Controla la Lógica del Botón

### Componente Principal
- **Archivo:** `frontend/src/layout/Layout.jsx`
- **Ubicación exacta:** Líneas 140-245
- **Tipo de implementación:** Botón creado dinámicamente con `document.createElement` dentro de un `useEffect`

### Estructura del Botón
```javascript
// Línea 141: Definición en el array de botones
{ label: 'Ligas', section: 'ligas', path: '/ligas' }

// Líneas 220-245: Creación y configuración del botón
else if (btn.section === 'ligas') {
  // Creación del icono SVG (trofeo/copa)
  // Configuración del tooltip
  // Asignación del handler onClick
}
```

---

## 2. Qué Hace Exactamente Cuando el Usuario Hace Clic

### Flujo de Ejecución Completo

#### Paso 1: Click Handler (Línea 302-305)
```javascript
button.onclick = (e) => {
  e.preventDefault();
  handleNavigation(btn.section); // Llama con 'ligas'
};
```

#### Paso 2: Función `handleNavigation` (Líneas 64-94)
```javascript
const handleNavigation = useCallback((section) => {
  switch(section) {
    case 'ligas':
      setInternalActiveSection(null);  // Limpia estado interno
      navigate('/ligas');              // Navega a la ruta /ligas
      break;
    // ... otros casos
  }
}, [navigate]);
```

**Acciones específicas:**
1. ✅ **Limpia el estado interno** (`setInternalActiveSection(null)`)
2. ✅ **Navega a la ruta `/ligas`** usando React Router (`navigate('/ligas')`)
3. ❌ **NO llama a ningún endpoint directamente**
4. ❌ **NO filtra datos en este momento**
5. ❌ **NO desencadena estados globales adicionales**

#### Paso 3: React Router (AppRouter.jsx)
- **Ruta registrada:** `frontend/src/router/AppRouter.jsx` línea 24
  ```javascript
  <Route path="/ligas" element={<Leagues />} />
  ```
- **Componente renderizado:** `Leagues.jsx`

#### Paso 4: Componente Leagues.jsx se Monta
- **Estado inicial:** `activeSection = "ligas"` (línea 15)
- **Estado del dropdown:** `dropdownOpen = true` (línea 18)

#### Paso 5: Carga de Datos (Líneas 56-205)
```javascript
useEffect(() => {
  if (activeSection === "ligas" && ligas.length === 0) {
    setLoadingLigas(true);
    setDropdownOpen(true);
    
    obtenerLigas()  // ← LLAMADA AL ENDPOINT AQUÍ
      .then(data => {
        // Filtra ligas principales
        // Actualiza estado ligas
        // Selecciona automáticamente la primera liga
      });
  }
}, [activeSection, ligas.length]);
```

**Resumen del flujo:**
1. Click → `handleNavigation('ligas')`
2. Navegación → `navigate('/ligas')`
3. Router → Renderiza `<Leagues />`
4. Leagues → Detecta `activeSection === "ligas"`
5. Leagues → Llama a `obtenerLigas()` (API)
6. Leagues → Filtra y muestra ligas principales

---

## 3. Estados, Variables y Contextos Utilizados

### En Layout.jsx (Botón)

#### Estados Locales
- `internalActiveSection` (línea 12)
  - **Tipo:** `useState(null)`
  - **Uso:** Controla secciones internas como "Mi Cuenta" o "Escuela"
  - **Para Ligas:** Se limpia a `null` cuando se hace clic

#### Contextos Globales
- `useUser()` (línea 13)
  - **Propiedades usadas:**
    - `isAuthenticated` - No afecta la visibilidad del botón de Ligas
    - `isAdmin` - No afecta la visibilidad del botón de Ligas
    - `isMainAdmin` - No afecta la visibilidad del botón de Ligas
  - **Nota:** El botón de Ligas es **siempre visible**, independientemente del estado de autenticación

#### Hooks de React Router
- `useLocation()` (línea 10)
  - **Uso:** Detecta la ruta actual para determinar `activeSection`
- `useNavigate()` (línea 11)
  - **Uso:** Navega a `/ligas` cuando se hace clic

#### Variables Derivadas
- `activeSection` (línea 60)
  - **Función:** `getActiveSection()` (líneas 44-58)
  - **Para Ligas:** Retorna `'ligas'` si `path === '/' || path === '/ligas'`
  - **Uso:** Determina si el botón debe tener la clase `'active'`

### En Leagues.jsx (Componente Destino)

#### Estados Locales
```javascript
const [activeSection, setActiveSection] = useState("ligas");
const [dropdownOpen, setDropdownOpen] = useState(true);
const [ligas, setLigas] = useState([]);
const [loadingLigas, setLoadingLigas] = useState(false);
const [selectedLeagueId, setSelectedLeagueId] = useState(null);
const [selectedSeason, setSelectedSeason] = useState("2024");
const [loadingSeason, setLoadingSeason] = useState(false);
const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
```

#### Props Recibidas
- **Ninguna** - El componente no recibe props directamente
- **Location State:** Lee `location.state?.activeSection` para casos especiales (Mi Cuenta)

---

## 4. Dependencias Externas e Internas

### Hooks Personalizados
- ❌ **Ninguno** - No usa hooks personalizados

### Funciones Auxiliares

#### En Layout.jsx
- `getActiveSection()` (líneas 44-58)
  - **Función:** Determina qué sección está activa basándose en la ruta
  - **Para Ligas:** Retorna `'ligas'` si la ruta es `/` o `/ligas`

#### En Leagues.jsx
- `obtenerLigas()` (importada desde `../api/api.js`)
  - **Función:** Llama al endpoint `/api/leagues`
  - **Retorna:** Promise con datos de ligas

### Servicios o APIs

#### Endpoint del Servidor
- **Ruta:** `GET /api/leagues`
- **Ubicación:** `server.js` líneas 136-167
- **Proveedor externo:** API-Football (https://v3.football.api-sports.io)
- **Método:** `GET https://v3.football.api-sports.io/leagues`
- **Headers:** Requiere `API_KEY` en `process.env.API_KEY`

#### Función API del Frontend
- **Archivo:** `frontend/src/api/api.js` líneas 11-38
- **Función:** `obtenerLigas()`
- **Método:** `fetch('/api/leagues')`
- **Procesamiento:**
  - Normaliza la respuesta a formato `{ response: [...] }`
  - Maneja errores y formatos inesperados

### Componentes Dependientes

#### En Leagues.jsx
```javascript
import StandingsTable from "../components/StandingsTable";
import EquipoDetalle from "../components/EquipoDetalle";
import Partidos from "./Partidos";
import SimuladorApuestas from "./SimuladorApuestas";
import MiCuenta from "../components/MiCuenta/MiCuenta";
import Predicciones from "./Predicciones";
```

**Nota:** Estos componentes se renderizan condicionalmente según `activeSection`.

---

## 5. Condiciones Especiales

### Reglas de Visibilidad
- ✅ **El botón de Ligas es SIEMPRE visible**
  - No depende de `isAuthenticated`
  - No depende de `isAdmin` o `isMainAdmin`
  - Aparece en el array de botones sin condiciones (línea 141)

### Comportamientos Especiales

#### 1. Estado Activo del Botón
- **Condición:** El botón se marca como activo cuando:
  ```javascript
  activeSection === 'ligas'
  // Donde activeSection viene de getActiveSection()
  // que retorna 'ligas' si path === '/' || path === '/ligas'
  ```
- **Clase CSS aplicada:** `'active'` (línea 167)
  ```javascript
  button.className = `nav-button ${activeSection === btn.section ? 'active' : ''}`;
  ```

#### 2. Carga de Datos
- **Condición:** Las ligas se cargan solo si:
  ```javascript
  activeSection === "ligas" && ligas.length === 0
  ```
- **Comportamiento:**
  - Se carga una sola vez cuando se monta el componente
  - No se recarga si ya hay ligas en el estado

#### 3. Filtrado de Ligas
- **Ligas principales mostradas:** Solo se muestran ligas con IDs específicos
  ```javascript
  const ligasPrincipalesIds = [140, 39, 135, 78, 61, 88, 94, 203, 2, 235, 71, 72, 262, 253, 141, 40, 13, 15];
  ```
- **Ligas filtradas:**
  - La Liga (140)
  - Premier League (39)
  - Serie A (135)
  - Bundesliga (78)
  - Ligue 1 (61)
  - Eredivisie (88)
  - Primeira Liga (94)
  - Super Lig (203)
  - UEFA Champions League (2)
  - Y otras 9 ligas adicionales

#### 4. Selección Automática
- **Comportamiento:** Cuando se cargan las ligas, se selecciona automáticamente la primera
  ```javascript
  useEffect(() => {
    if (ligas.length > 0 && !selectedLeagueId && activeSection === "ligas") {
      setSelectedLeagueId(ligas[0].id);
    }
  }, [ligas, selectedLeagueId, activeSection]);
  ```

#### 5. Cálculo de Temporada
- **Comportamiento:** Cuando se selecciona una liga, se calcula automáticamente la temporada actual
  ```javascript
  // Si estamos en agosto o después, temporada = año actual
  // Si estamos antes de agosto, temporada = año anterior
  const seasonYear = currentMonth >= 8 ? currentYear : currentYear - 1;
  ```

### Lazy Loading
- ❌ **No hay lazy loading** - El componente `Leagues` se importa directamente
- ✅ **Carga condicional de datos** - Solo carga ligas cuando `activeSection === "ligas"`

### Eventos Personalizados
- ❌ **No dispara eventos** - A diferencia de "Mi Cuenta" que dispara `CustomEvent('changeSection')`
- ✅ **Usa navegación estándar de React Router**

---

## 6. Resumen Ejecutivo

### Flujo Completo en 6 Pasos

1. **Usuario hace clic** en el botón "Ligas" en el header
2. **Layout.jsx** ejecuta `handleNavigation('ligas')`
3. **React Router** navega a `/ligas`
4. **AppRouter.jsx** renderiza el componente `<Leagues />`
5. **Leagues.jsx** detecta `activeSection === "ligas"` y carga datos
6. **API** se llama (`GET /api/leagues`) y se muestran las ligas filtradas

### Características Clave

| Aspecto | Detalle |
|---------|---------|
| **Visibilidad** | Siempre visible (no depende de autenticación) |
| **Navegación** | Directa a `/ligas` usando React Router |
| **Carga de datos** | Lazy (solo cuando se activa la sección) |
| **Filtrado** | Solo muestra 18 ligas principales |
| **Selección automática** | Selecciona la primera liga al cargar |
| **Estado activo** | Se marca cuando `path === '/ligas'` o `path === '/'` |
| **Dependencias externas** | API-Football (v3.football.api-sports.io) |

### Archivos Clave

1. **`frontend/src/layout/Layout.jsx`** - Creación y manejo del botón
2. **`frontend/src/pages/Leagues.jsx`** - Componente destino y lógica de datos
3. **`frontend/src/router/AppRouter.jsx`** - Configuración de rutas
4. **`frontend/src/api/api.js`** - Función `obtenerLigas()`
5. **`server.js`** - Endpoint `/api/leagues`

---

## 7. Comparación con Otros Botones

| Botón | Ruta | Estado Activo | Carga de Datos | Visibilidad |
|-------|------|---------------|----------------|-------------|
| **Ligas** | `/ligas` | ✅ Por ruta | ✅ Lazy (al activar) | ✅ Siempre |
| Partidos | `/partidos` | ✅ Por ruta | ❓ Depende del componente | ✅ Siempre |
| Predicciones | `/predicciones` | ✅ Por ruta | ❓ Depende del componente | ✅ Siempre |
| Mi Cuenta | `/ligas` (con state) | ⚠️ Por evento | ❌ No carga datos | ⚠️ Condicional |
| Comunidad | `/comunidad` | ✅ Por ruta | ❓ Depende del componente | ✅ Siempre |

---

**Documento generado:** Análisis completo del botón de "Ligas"  
**Fecha:** Análisis basado en código actual del proyecto  
**Propósito:** Consolidación del módulo y garantizar consistencia arquitectónica

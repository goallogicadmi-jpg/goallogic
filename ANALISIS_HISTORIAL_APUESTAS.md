# 🔍 ANÁLISIS COMPLETO: Historial de Apuestas

## 📋 RESUMEN EJECUTIVO

El **Historial de Apuestas** es un sistema independiente que permite a los usuarios registrar, gestionar y hacer seguimiento de sus apuestas reales. Funciona completamente separado del Simulador de Apuestas y utiliza su propia base de datos y API.

---

## 1. FUNCIONAMIENTO GENERAL DEL HISTORIAL

### **1.1. Carga de Apuestas al Iniciar Sesión**

**Ubicación:** `frontend/src/components/MiCuenta/HistorialApuestas.jsx`

**Flujo de Carga:**
1. El componente `HistorialApuestas` se monta cuando el usuario accede a "Mi Cuenta"
2. Se ejecuta `useEffect` que llama a `cargarApuestas(1)` (línea 219-223)
3. `cargarApuestas()` llama al servicio `getBets()` con paginación y filtros
4. Los datos se obtienen desde el backend mediante `GET /api/bets`
5. Las apuestas se almacenan en el estado local `apuestas` del componente

**Código Clave:**
```javascript
// Línea 53-72: Función cargarApuestas
const cargarApuestas = async (pageNum) => {
  setLoading(true);
  setError('');
  
  try {
    const filters = construirFiltros();
    const data = await getBets(pageNum, limit, filters);
    setApuestas(data.bets || []);
    setPage(data.page || 1);
    setTotalPages(data.totalPages || 1);
    setTotal(data.total || 0);
  } catch (err) {
    setError(err.message || 'Error al cargar las apuestas');
    setApuestas([]);
    setTotalPages(1);
    setTotal(0);
  } finally {
    setLoading(false);
  }
};
```

**Cuándo se Carga:**
- Al montar el componente (línea 219-223)
- Cuando cambia `refreshTrigger` (prop del componente padre)
- Cuando cambian los filtros (línea 226-230)
- Al cambiar de página manualmente (línea 233-240)

### **1.2. Origen de los Datos**

**Backend:**
- **Modelo:** `models/Bet.js` (Mongoose Schema)
- **Ruta API:** `routes/bets.js`
- **Endpoint:** `GET /api/bets`
- **Base de Datos:** MongoDB (colección `bets`)

**Frontend:**
- **Servicio:** `frontend/src/services/betService.js`
- **Función:** `getBets(page, limit, filters)`
- **Autenticación:** Requiere token JWT en header `Authorization: Bearer <token>`

**Estructura de Datos:**
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,        // ID del usuario (filtrado automáticamente)
  partido: String,          // Ej: "Real Madrid vs Barcelona"
  mercado: String,          // "Resultado", "Over/Under", "BTTS", "Corners", "Combinado"
  seleccion: String,         // Ej: "Local", "Over 2.5", "Sí"
  cuota: Number,            // Ej: 2.50
  stake: Number,            // Ej: 100
  modelo_analisis: String,  // "xG", "Poisson", "Mixto"
  confianza: Number,        // 1-5
  resultado: String,         // "pendiente", "ganada", "perdida", "nula"
  created_at: Date          // Fecha de creación
}
```

### **1.3. Filtrado y Reordenamiento**

**Filtros Disponibles:**
1. **Resultado:** `pendiente`, `ganada`, `perdida`, `nula`
2. **Mercado:** `Resultado`, `Over/Under`, `BTTS`, `Corners`, `Combinado`
3. **Partido:** Búsqueda parcial (case-insensitive, regex)
4. **Fecha Desde:** Filtro por fecha mínima
5. **Fecha Hasta:** Filtro por fecha máxima

**Ubicación de Filtros:**
- Frontend: `HistorialApuestas.jsx` líneas 18-23 (estados) y 42-50 (construcción)
- Backend: `routes/bets.js` líneas 157-205 (aplicación de filtros)

**Ordenamiento:**
- **Backend:** Ordenado por `created_at` descendente (más recientes primero) - línea 213
- **Frontend:** No hay reordenamiento adicional, se respeta el orden del backend

**Paginación:**
- **Límite por página:** 20 apuestas (fijo, línea 14)
- **Total de páginas:** Calculado en backend según total de apuestas con filtros aplicados
- **Navegación:** Botones "Anterior" y "Siguiente" (líneas 487-509)

---

## 2. FLUJO DE GUARDADO

### **2.1. Creación de Nueva Apuesta**

**Flujo Completo:**
1. Usuario completa formulario en `PanelApuestas.jsx`
2. Usuario presiona "Guardar Apuesta" (línea 88-131)
3. Se valida el formulario (línea 42-72)
4. Se llama a `createBet(betData)` del servicio (línea 113)
5. Se hace petición `POST /api/bets` al backend (línea 23-30 de `betService.js`)
6. Backend valida datos y crea apuesta en MongoDB (línea 75-88 de `routes/bets.js`)
7. Backend retorna apuesta creada
8. Frontend muestra mensaje de éxito y limpia formulario (línea 116-117)
9. Se ejecuta callback `onBetCreated()` que incrementa `refreshHistorial` (línea 120-122)
10. `HistorialApuestas` detecta cambio en `refreshTrigger` y recarga apuestas (línea 219-223)

**Código Clave - Creación:**
```javascript
// PanelApuestas.jsx - Línea 88-131
const handleGuardar = async (e) => {
  e.preventDefault();
  setError('');
  setSuccess('');
  setLoading(true);

  try {
    if (!validarFormulario()) {
      setLoading(false);
      return;
    }

    const betData = {
      partido: partido.trim(),
      mercado: mercado,
      seleccion: seleccion,
      cuota: parseFloat(cuota),
      stake: parseFloat(stake),
      modelo_analisis: modeloAnalisis,
      confianza: confianza
    };

    const response = await createBet(betData);

    if (response.success) {
      setSuccess('¡Apuesta guardada exitosamente!');
      limpiarFormulario();
      
      if (onBetCreated) {
        onBetCreated(); // Incrementa refreshHistorial
      }
    }
  } catch (err) {
    setError(err.message || 'Error al guardar la apuesta');
  } finally {
    setLoading(false);
  }
};
```

**Backend - Validaciones:**
- Todos los campos requeridos presentes (línea 19-24)
- `cuota` y `stake` son números positivos (línea 35-47)
- `confianza` entre 1 y 5 (línea 49-54)
- `mercado` en enum válido (línea 57-63)
- `modelo_analisis` en enum válido (línea 66-72)
- `resultado` se establece automáticamente como `'pendiente'` (línea 84)

### **2.2. Actualización de Apuesta Existente**

**Flujo Completo:**
1. Usuario hace clic en botón "Editar" (✏️) en una apuesta del historial (línea 461)
2. Se abre modal de edición con datos actuales (línea 106-118)
3. Usuario modifica campos y presiona "Guardar Cambios" (línea 136-201)
4. Se valida formulario (línea 141-176)
5. Se llama a `updateBet(apuestaId, betData)` del servicio (línea 191)
6. Se hace petición `PUT /api/bets/:id` al backend (línea 123-130 de `betService.js`)
7. Backend verifica que la apuesta pertenezca al usuario (línea 261-267 de `routes/bets.js`)
8. Backend valida y actualiza apuesta (línea 336-340)
9. Backend retorna apuesta actualizada
10. Frontend cierra modal y recarga historial (línea 194-195)

**Código Clave - Actualización:**
```javascript
// HistorialApuestas.jsx - Línea 136-201
const guardarEdicion = async () => {
  setEditandoError('');
  setEditandoLoading(true);

  try {
    // Validaciones...
    
    const betData = {
      partido: editPartido.trim(),
      mercado: editMercado,
      seleccion: editSeleccion,
      cuota: parseFloat(editCuota),
      stake: parseFloat(editStake),
      modelo_analisis: editModeloAnalisis,
      confianza: editConfianza,
      resultado: editResultado
    };

    await updateBet(apuestaEditando._id, betData);
    
    cerrarModalEdicion();
    cargarApuestas(page); // Recarga manteniendo página y filtros
  } catch (err) {
    setEditandoError(err.message || 'Error al actualizar la apuesta');
  } finally {
    setEditandoLoading(false);
  }
};
```

**Backend - Validaciones:**
- Verifica que la apuesta pertenezca al usuario (línea 261-267)
- Valida campos opcionales si están presentes (línea 270-322)
- Actualiza solo campos enviados (línea 325-333)
- Usa `findByIdAndUpdate` con `runValidators: true` (línea 336-340)

### **2.3. Eliminación de Apuesta**

**Flujo Completo:**
1. Usuario hace clic en botón "Eliminar" (🗑️) en una apuesta (línea 469)
2. Se muestra confirmación con `window.confirm()` (línea 206)
3. Si confirma, se llama a `deleteBet(apuestaId)` del servicio (línea 210)
4. Se hace petición `DELETE /api/bets/:id` al backend (línea 158-164 de `betService.js`)
5. Backend verifica que la apuesta pertenezca al usuario (línea 395 de `routes/bets.js`)
6. Backend elimina apuesta de MongoDB
7. Frontend recarga historial (línea 212)

**Código Clave - Eliminación:**
```javascript
// HistorialApuestas.jsx - Línea 204-216
const handleEliminar = async (apuestaId) => {
  const confirmar = window.confirm('¿Estás seguro de que deseas eliminar esta apuesta? Esta acción no se puede deshacer.');
  if (!confirmar) return;

  try {
    await deleteBet(apuestaId);
    cargarApuestas(page); // Recarga manteniendo página y filtros
  } catch (err) {
    alert(err.message || 'Error al eliminar la apuesta');
  }
};
```

### **2.4. Guardado Automático vs Manual**

**✅ NO HAY GUARDADO AUTOMÁTICO**

**Evidencia:**
- Las apuestas solo se guardan cuando el usuario:
  1. Presiona "Guardar Apuesta" en `PanelApuestas` (creación)
  2. Presiona "Guardar Cambios" en modal de edición (actualización)
  3. Confirma eliminación (eliminación)

- No hay `useEffect` que guarde automáticamente
- No hay guardado al cambiar filtros
- No hay guardado al cambiar de página
- No hay guardado al cerrar sesión

**Conclusión:** El sistema es completamente manual y controlado por el usuario.

---

## 3. ESTADOS DE LAS APUESTAS

### **3.1. Estados Disponibles**

**Estados Definidos:**
1. **`pendiente`** - Apuesta creada pero sin resultado aún (estado por defecto)
2. **`ganada`** - Apuesta ganada
3. **`perdida`** - Apuesta perdida
4. **`nula`** - Apuesta anulada/cancelada

**Definición en Backend:**
```javascript
// models/Bet.js - Línea 41-45
resultado: {
  type: String,
  enum: ['pendiente', 'ganada', 'perdida', 'nula'],
  default: 'pendiente'
}
```

**Definición en Frontend:**
```javascript
// HistorialApuestas.jsx - Línea 270-295
const getResultadoClass = (resultado) => {
  switch (resultado) {
    case 'ganada': return 'resultado-ganada';
    case 'perdida': return 'resultado-perdida';
    case 'nula': return 'resultado-nula';
    default: return 'resultado-pendiente';
  }
};
```

### **3.2. Cómo se Cambia el Estado**

**Método Único: Edición Manual**

1. Usuario hace clic en botón "Editar" (✏️) de una apuesta
2. Se abre modal de edición
3. Usuario selecciona nuevo estado en dropdown (línea 661-671)
4. Usuario presiona "Guardar Cambios"
5. Se actualiza en backend mediante `PUT /api/bets/:id`
6. El cambio se refleja inmediatamente en el historial

**Código Clave:**
```javascript
// HistorialApuestas.jsx - Línea 658-672
<div className="form-group">
  <label htmlFor="edit-resultado">Resultado</label>
  <select
    id="edit-resultado"
    value={editResultado}
    onChange={(e) => setEditResultado(e.target.value)}
    disabled={editandoLoading}
  >
    <option value="pendiente">Pendiente</option>
    <option value="ganada">Ganada</option>
    <option value="perdida">Perdida</option>
    <option value="nula">Nula</option>
  </select>
</div>
```

**⚠️ IMPORTANTE:** No hay cambio automático de estado. El usuario debe editar manualmente cada apuesta para cambiar su resultado.

### **3.3. Persistencia del Estado**

**✅ El Estado Persiste Correctamente**

**Evidencia:**
1. **Al Guardar:** El estado se guarda en MongoDB mediante `PUT /api/bets/:id` (línea 336-340 de `routes/bets.js`)
2. **Al Cargar:** El estado se carga desde MongoDB al iniciar sesión (línea 212-216 de `routes/bets.js`)
3. **Al Cerrar Sesión:** Los datos permanecen en MongoDB (no se eliminan)
4. **Al Volver a Iniciar:** Los datos se cargan correctamente desde MongoDB

**Verificación:**
- Backend usa `findByIdAndUpdate` con `runValidators: true` (línea 336-340)
- Backend retorna apuesta actualizada con `new: true` (línea 340)
- Frontend recarga historial después de actualizar (línea 195)

### **3.4. Cálculo de Profit/Loss por Estado**

**Fórmula por Estado:**
```javascript
// HistorialApuestas.jsx - Línea 256-267
const calcularProfitLoss = (apuesta) => {
  if (apuesta.resultado === 'pendiente' || apuesta.resultado === 'nula') {
    return 0;
  }
  if (apuesta.resultado === 'ganada') {
    return (apuesta.cuota - 1) * apuesta.stake;
  }
  if (apuesta.resultado === 'perdida') {
    return -apuesta.stake;
  }
  return 0;
};
```

**Lógica:**
- **Pendiente:** Profit/Loss = $0.00
- **Nula:** Profit/Loss = $0.00
- **Ganada:** Profit/Loss = `(cuota - 1) × stake` (ganancia neta)
- **Perdida:** Profit/Loss = `-stake` (pérdida del stake)

**Ejemplo:**
- Cuota: 2.50, Stake: $100, Resultado: Ganada
- Profit = (2.50 - 1) × 100 = $150.00

---

## 4. INTERACCIÓN CON EL SIMULADOR

### **4.1. ¿Son Sistemas Independientes?**

**✅ SÍ, SON COMPLETAMENTE INDEPENDIENTES**

**Evidencia:**

**Historial de Apuestas:**
- **Modelo:** `models/Bet.js`
- **Ruta API:** `/api/bets`
- **Base de Datos:** Colección `bets` en MongoDB
- **Propósito:** Registrar apuestas reales del usuario

**Simulador de Apuestas:**
- **Modelo:** `models/SimulatorState.js`
- **Ruta API:** `/api/simulator`
- **Base de Datos:** Colección `simulatorstates` en MongoDB
- **Propósito:** Simular escenarios de apuestas con capital virtual

**No Hay Interacción:**
- No comparten datos
- No comparten modelos
- No comparten rutas API
- No hay funciones que transfieran datos entre sistemas
- No hay dependencias entre componentes

### **4.2. ¿El Simulador Afecta el Historial?**

**✅ NO, EL SIMULADOR NO AFECTA EL HISTORIAL**

**Verificación:**
- El simulador guarda datos en `SimulatorState` (modelo diferente)
- El historial lee datos de `Bet` (modelo diferente)
- No hay código que modifique `Bet` desde el simulador
- No hay código que modifique `SimulatorState` desde el historial

**Conclusión:** Son dos sistemas completamente separados que no interfieren entre sí.

---

## 5. PROBLEMAS POTENCIALES

### **5.1. Apuestas que Desaparecen**

**Posibles Causas:**

1. **Filtros Activos:**
   - Si hay filtros aplicados, las apuestas pueden no aparecer
   - **Solución:** Verificar filtros en la barra superior (línea 331-416)

2. **Paginación:**
   - Si hay muchas apuestas, pueden estar en otra página
   - **Solución:** Navegar entre páginas con botones "Anterior"/"Siguiente"

3. **Error al Cargar:**
   - Si hay error en la petición, se muestra mensaje de error (línea 310-321)
   - **Solución:** Verificar consola del navegador para errores

4. **Eliminación Accidental:**
   - Si el usuario eliminó una apuesta, desaparece permanentemente
   - **Solución:** No hay recuperación, solo prevención con confirmación (línea 206)

**✅ NO HAY EVIDENCIA DE DESAPARICIÓN AUTOMÁTICA**

### **5.2. Estados que No Se Actualizan**

**Posibles Causas:**

1. **Error en la Petición:**
   - Si falla `PUT /api/bets/:id`, el estado no se actualiza
   - **Solución:** Verificar consola del navegador y mensaje de error (línea 197)

2. **Validación Fallida:**
   - Si los datos no pasan validación, no se actualiza
   - **Solución:** Verificar mensaje de error en modal (línea 521-525)

3. **Cache del Navegador:**
   - En casos raros, el navegador puede cachear datos antiguos
   - **Solución:** Recargar página (F5) o limpiar cache

**✅ NO HAY EVIDENCIA DE ACTUALIZACIÓN AUTOMÁTICA FALLIDA**

### **5.3. Apuestas que Cambian de Estado Sin Acción del Usuario**

**✅ NO HAY CAMBIO AUTOMÁTICO DE ESTADO**

**Evidencia:**
- No hay `useEffect` que cambie estados automáticamente
- No hay funciones que actualicen estados sin acción del usuario
- El único método de cambio es edición manual (línea 136-201)

**Conclusión:** Si una apuesta cambia de estado, fue porque el usuario la editó manualmente.

### **5.4. Inconsistencias entre Frontend y Backend**

**Posibles Causas:**

1. **Datos No Sincronizados:**
   - Si el usuario edita en otra pestaña/dispositivo, puede haber inconsistencias
   - **Solución:** Recargar página o usar `refreshTrigger`

2. **Error en la Petición:**
   - Si falla la petición, el frontend puede mostrar datos desactualizados
   - **Solución:** Verificar consola del navegador

3. **Validación Diferente:**
   - Frontend y backend pueden tener validaciones ligeramente diferentes
   - **Solución:** Verificar mensajes de error

**✅ NO HAY EVIDENCIA DE INCONSISTENCIAS SISTEMÁTICAS**

### **5.5. Problemas Identificados**

**1. No Hay Recuperación de Apuestas Eliminadas**
- **Problema:** Si el usuario elimina una apuesta por error, no hay forma de recuperarla
- **Impacto:** Bajo (hay confirmación antes de eliminar)
- **Solución Propuesta:** Implementar "papelera" con restauración temporal

**2. No Hay Cambio Masivo de Estados**
- **Problema:** Si el usuario tiene muchas apuestas pendientes, debe editarlas una por una
- **Impacto:** Medio (puede ser tedioso)
- **Solución Propuesta:** Implementar selección múltiple y cambio masivo

**3. No Hay Exportación de Datos**
- **Problema:** El usuario no puede exportar su historial (CSV, Excel, etc.)
- **Impacto:** Bajo (funcionalidad adicional)
- **Solución Propuesta:** Implementar botón de exportación

**4. No Hay Búsqueda Avanzada**
- **Problema:** La búsqueda por partido es básica (solo texto)
- **Impacto:** Bajo (funcionalidad adicional)
- **Solución Propuesta:** Implementar búsqueda avanzada con múltiples criterios

---

## 6. RESUMEN Y RECOMENDACIONES

### **6.1. Funcionamiento Actual**

**✅ Funciona Correctamente:**
- Carga de apuestas desde backend
- Creación de nuevas apuestas
- Edición de apuestas existentes
- Eliminación de apuestas
- Filtrado y paginación
- Cálculo de Profit/Loss
- Persistencia de datos

**✅ No Hay Problemas Críticos:**
- No hay guardado automático que cause problemas
- No hay cambio automático de estados
- No hay pérdida de datos
- No hay inconsistencias sistemáticas

### **6.2. Recomendaciones**

**Prioridad Alta:**
1. **Implementar confirmación más visible para eliminación** (actualmente solo `window.confirm`)
2. **Agregar validación de estado antes de guardar** (verificar que el estado sea válido)

**Prioridad Media:**
1. **Implementar cambio masivo de estados** (seleccionar múltiples apuestas)
2. **Agregar exportación de datos** (CSV, Excel)
3. **Mejorar búsqueda** (búsqueda avanzada con múltiples criterios)

**Prioridad Baja:**
1. **Agregar "papelera" con restauración** (recuperar apuestas eliminadas)
2. **Implementar notificaciones** (cuando una apuesta cambia de estado)
3. **Agregar estadísticas avanzadas** (gráficos, análisis de rendimiento)

### **6.3. Conclusión**

El sistema de **Historial de Apuestas** funciona correctamente y de forma estable. No hay problemas críticos que afecten la funcionalidad básica. Las mejoras sugeridas son principalmente para mejorar la experiencia del usuario y agregar funcionalidades adicionales.

---

**Última actualización:** Después de análisis completo del sistema de Historial de Apuestas

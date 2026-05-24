# 📊 ANÁLISIS COMPLETO: Simulador de Apuestas Deportivas

## 🎯 RESUMEN EJECUTIVO

El **Simulador de Apuestas Deportivas** es una herramienta **completamente manual** que permite al usuario simular estrategias de apuestas con gestión de capital. **NO calcula probabilidades automáticamente** - todos los valores son ingresados manualmente por el usuario.

---

## 1️⃣ CÁLCULO DE PROBABILIDADES

### **❌ NO HAY CÁLCULO DE PROBABILIDADES**

**Hallazgo:** El simulador **NO calcula probabilidades** automáticamente desde el backend ni desde ningún sistema de predicciones.

**Evidencia:**
- No hay llamadas a endpoints de predicciones
- No hay uso de `calculateGoalLogicProbability` o `predictionEngine`
- No hay conversión de probabilidades a cuotas
- Los multiplicadores (cuotas) son **ingresados manualmente** por el usuario

**Ubicación:** `SimuladorApuestas.jsx` líneas 712-734

```javascript
// Los multiplicadores son inputs editables por el usuario
<input
  type="number"
  step="0.1"
  value={row.multiplicador_a1 || ""}
  onChange={(e) => handleCellChange(rowIndex, "multiplicador_a1", e.target.value)}
  placeholder="1.5"
/>
```

**Conclusión:** El simulador es una herramienta de **gestión de capital y proyección**, no un calculador de probabilidades.

---

## 2️⃣ CÁLCULO DE CUOTAS (ODDS/MULTIPLICADORES)

### **✅ FUNCIONAMIENTO ACTUAL**

**Tipo:** Manual - El usuario ingresa los multiplicadores directamente.

**Valores por defecto:**
- Multiplicador A1: `1.5` (línea 39)
- Multiplicador A2: `2.0` (línea 40)

**Validación:**
- ✅ Acepta valores decimales (step="0.1")
- ✅ Valores por defecto si están vacíos (línea 126-127)
- ✅ Se parsean correctamente con `parseFloat()`

**Ubicación:** `SimuladorApuestas.jsx` líneas 712-734

### **⚠️ POSIBLES PROBLEMAS:**

1. **No hay validación de rango:**
   - No se valida que el multiplicador sea > 1.0
   - Un multiplicador < 1.0 resultaría en ganancia negativa incluso si gana

2. **No hay conversión de probabilidades:**
   - Si el usuario quiere usar probabilidades, debe convertirlas manualmente
   - Fórmula esperada: `Cuota = 1 / Probabilidad`

3. **No hay validación de cuotas realistas:**
   - No hay límite máximo (podría ingresar 1000.0)
   - No hay límite mínimo (podría ingresar 0.5)

**Recomendación:** Agregar validación:
```javascript
if (multiplicador < 1.0) {
  // Mostrar error o ajustar a 1.0
}
```

---

## 3️⃣ CÁLCULO DE GANANCIAS POTENCIALES

### **✅ FÓRMULA CORRECTA**

**Ubicación:** `SimuladorApuestas.jsx` líneas 102-121

```javascript
const calcularGanancia = (apuesta, multiplicador, resultado, esProyeccion = false) => {
  if (apuesta === 0 || !apuesta) {
    return 0;
  }
  
  if (esProyeccion && !resultado) {
    return (apuesta * multiplicador) - apuesta; // Ganancia neta
  }
  
  if (resultado === 'ganada') {
    return (apuesta * multiplicador) - apuesta; // Ganancia neta
  } else if (resultado === 'perdida') {
    return -apuesta; // Pérdida del stake
  }
  
  return 0; // Sin resultado
};
```

**Fórmula aplicada:**
```
Ganancia = (Apuesta × Multiplicador) - Apuesta
```

**Ejemplo:**
- Apuesta: 200
- Multiplicador: 1.5
- Ganancia = (200 × 1.5) - 200 = 300 - 200 = **100** ✅

### **✅ VERIFICACIÓN DE CÁLCULOS:**

**Caso 1: Apuesta ganada**
- Apuesta: 200, Multiplicador: 1.5
- Ganancia = (200 × 1.5) - 200 = 100 ✅

**Caso 2: Apuesta perdida**
- Apuesta: 200
- Ganancia = -200 ✅

**Caso 3: Proyección (sin resultado)**
- Apuesta: 200, Multiplicador: 1.5, esProyeccion: true
- Ganancia = (200 × 1.5) - 200 = 100 ✅

**Caso 4: Sin resultado marcado**
- Ganancia = 0 ✅

**Conclusión:** ✅ **La fórmula es correcta y se aplica consistentemente.**

---

## 4️⃣ INTERACCIÓN Y ACTUALIZACIÓN DE LA TABLA

### **✅ ACTUALIZACIÓN EN TIEMPO REAL**

**Funciones de actualización:**

1. **`handleCellChange`** (líneas 398-439):
   - ✅ Se ejecuta en cada cambio de input
   - ✅ Recalcula desde la fila modificada hacia abajo
   - ✅ Mantiene consistencia de capital entre filas

2. **`recalcularFilasDesde`** (líneas 169-188):
   - ✅ Recalcula la fila modificada
   - ✅ Propaga cambios a filas siguientes
   - ✅ Actualiza capital: `capital[i] = capital[i-1] + ganancia_total[i-1]`

3. **`recalcularFila`** (líneas 124-166):
   - ✅ Recalcula apuestas si no han sido editadas manualmente
   - ✅ Recalcula ganancias según resultado
   - ✅ Mantiene flags de edición manual

### **✅ FLUJO DE ACTUALIZACIÓN:**

```
Usuario cambia Capital → Recalcula Apuestas (si no editadas) → Recalcula Ganancias → Actualiza Capital siguiente
Usuario cambia Apuesta → Marca como editada → Recalcula Ganancias → Actualiza Capital siguiente
Usuario cambia Multiplicador → Recalcula Ganancias → Actualiza Capital siguiente
Usuario marca Resultado → Recalcula Ganancias → Actualiza Capital siguiente
```

### **⚠️ POSIBLES PROBLEMAS:**

1. **Redondeo en visualización:**
   - Línea 692: `row.apuesta_1?.toFixed(2)` - Solo redondea para mostrar
   - El valor interno mantiene precisión completa ✅

2. **Actualización de capital siguiente:**
   - Línea 180: `nuevasFilas[i].capital = capitalAnterior + gananciaAnterior`
   - ✅ Correcto: El capital siguiente = capital anterior + ganancia anterior

3. **Apuestas editadas manualmente:**
   - Si el usuario edita una apuesta, se marca como `apuesta_1_editada = true`
   - ✅ No se recalcula automáticamente cuando cambia el capital
   - ⚠️ **Posible confusión:** Si el usuario cambia el capital después de editar una apuesta, la apuesta no se actualiza

---

## 5️⃣ ERRORES VISIBLES O COMPORTAMIENTOS EXTRAÑOS

### **✅ FUNCIONA CORRECTAMENTE:**

1. **Cálculo de apuestas desde capital:**
   - Apuesta 1 = Capital × 20% ✅
   - Apuesta 2 = Capital × 10% ✅

2. **Cálculo de ganancias:**
   - Ganancia = (Apuesta × Multiplicador) - Apuesta ✅
   - Maneja casos de apuesta = 0 ✅
   - Maneja resultados (ganada/perdida/null) ✅

3. **Propagación de capital:**
   - Capital siguiente = Capital anterior + Ganancia anterior ✅

4. **Guardado y carga:**
   - Guarda estado completo en backend ✅
   - Carga estado completo desde backend ✅
   - Mantiene flags de edición manual ✅

### **⚠️ PROBLEMAS DETECTADOS:**

#### **Problema 1: Falta de validación de multiplicadores**

**Ubicación:** Líneas 712-734

**Problema:**
- No valida que multiplicador > 1.0
- Un multiplicador < 1.0 resultaría en ganancia negativa incluso si gana

**Ejemplo:**
- Apuesta: 200, Multiplicador: 0.8
- Ganancia = (200 × 0.8) - 200 = 160 - 200 = **-40** (pierde aunque gane)

**Solución sugerida:**
```javascript
if (multiplicador < 1.0) {
  // Mostrar error o ajustar a 1.0
  alert("El multiplicador debe ser mayor o igual a 1.0");
  return;
}
```

#### **Problema 2: Apuestas editadas no se actualizan con capital**

**Ubicación:** Líneas 134-139

**Problema:**
- Si el usuario edita una apuesta manualmente, se marca como `apuesta_1_editada = true`
- Si luego cambia el capital, la apuesta editada NO se actualiza
- Esto puede causar inconsistencias

**Ejemplo:**
1. Usuario edita Apuesta 1 a 500 (marca como editada)
2. Usuario cambia Capital a 1000
3. Apuesta 1 sigue siendo 500 (no se actualiza a 200 = 20% de 1000)

**Solución sugerida:**
- Agregar botón "Resetear apuestas" para quitar flags de edición
- O mostrar advertencia cuando capital cambia y apuestas están editadas

#### **Problema 3: No hay validación de capital negativo**

**Ubicación:** Líneas 177-180

**Problema:**
- Si la ganancia anterior es muy negativa, el capital siguiente puede ser negativo
- No hay validación que evite capital negativo

**Ejemplo:**
- Capital anterior: 100
- Ganancia anterior: -150 (pérdida mayor que capital)
- Capital siguiente: 100 + (-150) = **-50** ❌

**Solución sugerida:**
```javascript
const capitalSiguiente = capitalAnterior + gananciaAnterior;
if (capitalSiguiente < 0) {
  // Mostrar advertencia o limitar a 0
  capitalSiguiente = 0;
}
```

#### **Problema 4: Redondeo en cálculos**

**Ubicación:** Líneas 154-156

**Problema:**
- Los cálculos usan `parseFloat()` que puede tener problemas de precisión
- No hay redondeo consistente en los cálculos internos

**Ejemplo:**
- 200 × 0.20 = 40.0000000001 (precisión de punto flotante)
- Se muestra como 40.00, pero internamente puede ser 40.0000000001

**Solución sugerida:**
```javascript
apuesta1 = Math.round((capital * 0.20) * 100) / 100; // Redondear a 2 decimales
```

---

## 6️⃣ DIAGNÓSTICO FINAL

### **✅ QUÉ FUNCIONA BIEN:**

1. ✅ Cálculo de ganancias (fórmula correcta)
2. ✅ Actualización en tiempo real de la tabla
3. ✅ Propagación de capital entre filas
4. ✅ Manejo de resultados (ganada/perdida)
5. ✅ Sistema de proyección (calcula como ganada si no hay resultado)
6. ✅ Guardado y carga desde backend
7. ✅ Flags de edición manual funcionan correctamente

### **⚠️ QUÉ NECESITA REVISIÓN:**

1. ⚠️ **Validación de multiplicadores:** Agregar validación > 1.0
2. ⚠️ **Validación de capital negativo:** Prevenir capital negativo
3. ⚠️ **Apuestas editadas:** Considerar resetear o advertir cuando capital cambia
4. ⚠️ **Redondeo:** Mejorar precisión en cálculos internos

### **❌ QUÉ NO FUNCIONA (Por diseño):**

1. ❌ **Cálculo de probabilidades:** No está implementado (es manual)
2. ❌ **Conversión probabilidad → cuota:** No está implementado
3. ❌ **Cálculo automático de cuotas:** No está implementado

---

## 7️⃣ RECOMENDACIONES PRIORITARIAS

### **🔴 ALTA PRIORIDAD:**

1. **Agregar validación de multiplicadores:**
   ```javascript
   if (multiplicador < 1.0) {
     alert("El multiplicador debe ser mayor o igual a 1.0");
     return;
   }
   ```

2. **Prevenir capital negativo:**
   ```javascript
   const capitalSiguiente = Math.max(0, capitalAnterior + gananciaAnterior);
   ```

### **🟡 MEDIA PRIORIDAD:**

3. **Mejorar redondeo en cálculos:**
   ```javascript
   apuesta1 = Math.round((capital * 0.20) * 100) / 100;
   ```

4. **Agregar botón "Resetear apuestas editadas":**
   - Permite quitar flags de edición manual
   - Recalcula apuestas desde capital

### **🟢 BAJA PRIORIDAD (Mejoras futuras):**

5. **Agregar cálculo de probabilidades implícitas:**
   - Probabilidad implícita = 1 / Multiplicador
   - Mostrar en tooltip o columna adicional

6. **Agregar validación de cuotas realistas:**
   - Límite mínimo: 1.0
   - Límite máximo: 100.0 (o configurable)

7. **Agregar advertencia cuando capital cambia y apuestas están editadas:**
   - "Las apuestas editadas manualmente no se actualizarán automáticamente"

---

## 8️⃣ CASOS DE PRUEBA SUGERIDOS

### **Caso 1: Cambio de capital**
1. Capital inicial: 1000
2. Cambiar capital a 2000
3. **Esperado:** Apuesta 1 = 400 (20%), Apuesta 2 = 200 (10%)
4. **Verificar:** ✅ Se actualiza correctamente

### **Caso 2: Cambio de multiplicador**
1. Multiplicador A1: 1.5
2. Cambiar a 2.0
3. Apuesta 1: 200
4. **Esperado:** Ganancia A1 = (200 × 2.0) - 200 = 200
5. **Verificar:** ✅ Se recalcula correctamente

### **Caso 3: Marcar resultado**
1. Apuesta 1: 200, Multiplicador: 1.5
2. Marcar como "Ganada"
3. **Esperado:** Ganancia A1 = 100
4. **Verificar:** ✅ Se calcula correctamente

### **Caso 4: Multiplicador inválido**
1. Intentar ingresar multiplicador: 0.5
2. **Esperado:** Error o ajuste a 1.0
3. **Actual:** ❌ No hay validación

### **Caso 5: Capital negativo**
1. Capital: 100
2. Apuesta: 200, Multiplicador: 1.5
3. Marcar como "Perdida"
4. Ganancia: -200
5. Capital siguiente: 100 + (-200) = -100
6. **Esperado:** ⚠️ Advertencia o limitar a 0
7. **Actual:** ❌ Permite capital negativo

---

## 📝 CONCLUSIÓN

El simulador funciona **correctamente en su lógica principal**, pero necesita **mejoras en validaciones y manejo de edge cases**. La funcionalidad core (cálculo de ganancias, actualización de tabla, propagación de capital) está bien implementada.

**Última actualización:** Después de análisis completo del simulador

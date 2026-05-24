# 📊 ANÁLISIS DE MODELOS: USUARIOS Y APUESTAS

**Fecha:** 2024-12-20  
**Tipo:** Análisis de Estructura de Modelos  
**Sistema:** Autenticación y Apuestas (Módulo "Mi Cuenta")

---

## 📋 RESUMEN EJECUTIVO

Se han creado dos modelos de MongoDB usando Mongoose para el sistema de usuarios y apuestas que funcionará dentro del módulo "Mi Cuenta". Los modelos están estructurados de forma sólida y preparados para escalar.

---

## 1. ✅ MODELOS CREADOS

### 1.1 Modelo User (`models/User.js`)

**Estructura:**
```javascript
{
  email: String (único, lowercase, trim, requerido)
  password_hash: String (requerido)
  created_at: Date (default: Date.now)
}
```

**Características:**
- ✅ Email único con validación
- ✅ Normalización automática (lowercase, trim)
- ✅ Hash de contraseña (no se almacena en texto plano)
- ✅ Timestamp de creación

**Evaluación:** 8/10
- Estructura sólida y segura
- Falta validación de formato de email
- Falta índice explícito en email (aunque unique lo crea automáticamente)

---

### 1.2 Modelo Bet (`models/Bet.js`)

**Estructura:**
```javascript
{
  user_id: ObjectId (ref: 'User', requerido)
  partido: String (requerido)
  mercado: Enum ['Resultado', 'Over/Under', 'BTTS', 'Corners', 'Combinado'] (requerido)
  seleccion: String (requerido)
  cuota: Number (requerido)
  stake: Number (requerido)
  modelo_analisis: Enum ['xG', 'Poisson', 'Mixto'] (requerido)
  confianza: Number (min: 1, max: 5, requerido)
  resultado: Enum ['pendiente', 'ganada', 'perdida', 'nula'] (default: 'pendiente')
  created_at: Date (default: Date.now)
}
```

**Características:**
- ✅ Referencia a User con populate
- ✅ Enums para validación de valores
- ✅ Validación de rango en confianza (1-5)
- ✅ Estado de resultado con default
- ✅ Timestamp de creación

**Evaluación:** 8.5/10
- Estructura completa y bien validada
- Falta validación de valores mínimos en cuota y stake
- Falta índice en user_id para consultas eficientes
- Falta índice en created_at para ordenamiento

---

## 2. 🔍 ANÁLISIS DE ESTRUCTURA

### 2.1 Fortalezas

**Modelo User:**
- ✅ Seguridad: password_hash en lugar de password en texto plano
- ✅ Unicidad garantizada en email
- ✅ Normalización automática de email

**Modelo Bet:**
- ✅ Relación clara con User mediante referencia
- ✅ Validación exhaustiva con enums
- ✅ Rango de confianza controlado
- ✅ Estado de resultado con default lógico

---

### 2.2 Áreas de Mejora Identificadas

#### Modelo User - Mejoras Recomendadas:

1. **Validación de formato de email**
   ```javascript
   email: {
     type: String,
     required: true,
     unique: true,
     lowercase: true,
     trim: true,
     match: [/^\S+@\S+\.\S+$/, 'Email inválido']
   }
   ```

2. **Índice explícito para mejor rendimiento**
   ```javascript
   userSchema.index({ email: 1 });
   ```

3. **Campos adicionales útiles (futuro):**
   - `nombre`: String (opcional)
   - `apellido`: String (opcional)
   - `activo`: Boolean (default: true)
   - `ultimo_acceso`: Date
   - `rol`: String (enum: ['usuario', 'premium', 'admin'])

---

#### Modelo Bet - Mejoras Recomendadas:

1. **Validación de valores mínimos**
   ```javascript
   cuota: {
     type: Number,
     required: true,
     min: 1.01
   },
   stake: {
     type: Number,
     required: true,
     min: 0.01
   }
   ```

2. **Índices para consultas eficientes**
   ```javascript
   betSchema.index({ user_id: 1, created_at: -1 });
   betSchema.index({ resultado: 1 });
   betSchema.index({ created_at: -1 });
   ```

3. **Campos adicionales útiles (futuro):**
   - `fecha_partido`: Date (para filtrar por fecha)
   - `equipo_local`: String
   - `equipo_visitante`: String
   - `liga`: String
   - `ganancia_potencial`: Number (calculado: stake * cuota)
   - `ganancia_real`: Number (si resultado = 'ganada')
   - `actualizado_at`: Date (para tracking de cambios)
   - `notas`: String (opcional, para observaciones del usuario)

4. **Validación de selección según mercado**
   - Para 'Over/Under': validar formato "Over 2.5" o "Under 2.5"
   - Para 'BTTS': validar "Sí" o "No"
   - Para 'Resultado': validar "1", "X", "2" o nombres de equipos

---

## 3. 💡 RECOMENDACIONES ADICIONALES

### 3.1 Validaciones Recomendadas

**User:**
- Validación de formato de email con regex
- Longitud mínima de password_hash (verificar en el controlador)
- Índice en email para búsquedas rápidas

**Bet:**
- Validación de cuota mínima (>= 1.01)
- Validación de stake mínima (>= 0.01)
- Validación de selección según tipo de mercado
- Índices compuestos para consultas frecuentes

---

### 3.2 Mejoras Futuras para el Módulo "Mi Cuenta"

#### Funcionalidades Sugeridas:

1. **Dashboard de Apuestas**
   - Vista resumen con estadísticas
   - Filtros por estado (pendiente, ganada, perdida)
   - Filtros por fecha y mercado
   - Gráficos de rendimiento

2. **Historial Completo**
   - Lista paginada de todas las apuestas
   - Búsqueda y filtros avanzados
   - Exportación a CSV/PDF

3. **Análisis de Rendimiento**
   - ROI (Return on Investment)
   - Win Rate por mercado
   - Rendimiento por modelo de análisis
   - Comparación de modelos

4. **Gestión de Perfil**
   - Edición de datos personales
   - Cambio de contraseña
   - Preferencias de notificaciones
   - Configuración de límites de stake

5. **Sistema de Notificaciones**
   - Alertas de resultados de apuestas
   - Recordatorios de partidos
   - Notificaciones de nuevas oportunidades

---

### 3.3 Consideraciones de Seguridad

**Recomendaciones:**
- ✅ Password hash (ya implementado)
- ⚠️ Implementar rate limiting en endpoints de autenticación
- ⚠️ Validar permisos en cada operación (usuario solo puede ver/editar sus propias apuestas)
- ⚠️ Sanitizar inputs antes de guardar
- ⚠️ Implementar tokens JWT para autenticación
- ⚠️ Validar que user_id en Bet corresponde al usuario autenticado

---

### 3.4 Optimizaciones de Rendimiento

**Índices Recomendados:**
```javascript
// User
userSchema.index({ email: 1 }); // Ya existe por unique, pero explícito es mejor

// Bet
betSchema.index({ user_id: 1, created_at: -1 }); // Consultas por usuario ordenadas
betSchema.index({ user_id: 1, resultado: 1 }); // Filtros por estado
betSchema.index({ created_at: -1 }); // Ordenamiento general
betSchema.index({ mercado: 1 }); // Si se filtra frecuentemente por mercado
```

---

## 4. 📊 EVALUACIÓN FINAL

### 4.1 Estructura Actual

**Puntuación General:** 8/10

**Fortalezas:**
- ✅ Estructura sólida y bien pensada
- ✅ Validaciones básicas implementadas
- ✅ Relaciones correctas entre modelos
- ✅ Enums para control de valores

**Debilidades:**
- ⚠️ Falta validación de formato de email
- ⚠️ Falta validación de valores mínimos en números
- ⚠️ Falta índices explícitos para optimización
- ⚠️ Falta validación de selección según mercado

---

### 4.2 Recomendaciones Prioritarias

**Prioridad Alta:**
1. Agregar validación de formato de email
2. Agregar validación de valores mínimos (cuota >= 1.01, stake >= 0.01)
3. Agregar índices para consultas eficientes

**Prioridad Media:**
4. Agregar campos adicionales útiles (fecha_partido, equipos, etc.)
5. Implementar validación de selección según mercado
6. Agregar campo `actualizado_at` para tracking

**Prioridad Baja:**
7. Agregar campos de perfil de usuario (nombre, apellido)
8. Agregar sistema de roles
9. Agregar campo de notas en apuestas

---

## 5. ✅ CONCLUSIÓN

### Estado Actual

Los modelos están **bien estructurados** y listos para usar. La base es sólida y permite escalar el sistema de autenticación y apuestas dentro del módulo "Mi Cuenta".

### Próximos Pasos Sugeridos

1. **Instalar Mongoose** (si no está instalado):
   ```bash
   npm install mongoose
   ```

2. **Conectar Mongoose en server.js** (cuando se implementen las rutas)

3. **Agregar validaciones adicionales** según recomendaciones

4. **Crear índices** para optimizar consultas

5. **Implementar controladores** para autenticación y gestión de apuestas

---

**Fin del Análisis**

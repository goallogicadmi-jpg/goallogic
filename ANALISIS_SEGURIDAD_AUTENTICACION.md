# 🔒 ANÁLISIS DE SEGURIDAD: SISTEMA DE AUTENTICACIÓN

**Fecha:** 2024-12-20  
**Tipo:** Análisis de Seguridad y Arquitectura  
**Sistema:** Autenticación JWT para Módulo "Mi Cuenta"

---

## 📋 RESUMEN EJECUTIVO

Se ha implementado un sistema de autenticación completo con JWT (JSON Web Tokens) y bcrypt para el hash de contraseñas. El sistema está diseñado para funcionar exclusivamente dentro del módulo "Mi Cuenta" sin afectar el resto de la aplicación.

---

## 1. ✅ COMPONENTES IMPLEMENTADOS

### 1.1 Middleware de Autenticación (`middleware/auth.js`)

**Funcionalidad:**
- ✅ Lee el header `Authorization: Bearer <token>`
- ✅ Verifica el token con `process.env.JWT_SECRET`
- ✅ Agrega `req.user = { id: payload.user_id }` si es válido
- ✅ Devuelve 401 si el token es inválido o expirado
- ✅ Maneja errores específicos (JsonWebTokenError, TokenExpiredError)

**Evaluación de Seguridad:** 8/10

**Fortalezas:**
- ✅ Validación correcta del formato Bearer
- ✅ Manejo de errores específicos
- ✅ Verificación de JWT_SECRET antes de usar
- ✅ Extracción segura del user_id del token

**Debilidades:**
- ⚠️ No valida si el usuario sigue existiendo en la BD
- ⚠️ No verifica si el usuario está activo
- ⚠️ No tiene rate limiting (vulnerable a ataques de fuerza bruta)

---

### 1.2 Rutas de Autenticación (`routes/auth.js`)

#### A) POST /api/auth/register

**Funcionalidad:**
- ✅ Recibe `{ email, password }`
- ✅ Valida campos requeridos
- ✅ Valida formato de email con regex
- ✅ Valida longitud mínima de contraseña (6 caracteres)
- ✅ Verifica si el email ya existe
- ✅ Hashea contraseña con bcrypt (salt rounds: 10)
- ✅ Crea usuario en MongoDB
- ✅ Retorna `{ message, user_id }`

**Evaluación de Seguridad:** 8.5/10

**Fortalezas:**
- ✅ Validación de formato de email
- ✅ Validación de longitud mínima de contraseña
- ✅ Hash seguro con bcrypt (salt rounds: 10)
- ✅ Normalización de email (lowercase, trim)
- ✅ Manejo de errores de MongoDB (duplicados, validación)

**Debilidades:**
- ⚠️ Longitud mínima de contraseña muy baja (6 caracteres)
- ⚠️ No valida complejidad de contraseña (mayúsculas, números, símbolos)
- ⚠️ No tiene rate limiting (vulnerable a registro masivo)
- ⚠️ No envía email de confirmación
- ⚠️ No tiene CAPTCHA para prevenir bots

---

#### B) POST /api/auth/login

**Funcionalidad:**
- ✅ Recibe `{ email, password }`
- ✅ Valida campos requeridos
- ✅ Busca usuario por email
- ✅ Compara contraseña con bcrypt.compare()
- ✅ Genera JWT con `{ user_id }`
- ✅ Token expira en 7 días
- ✅ Retorna `{ token }`

**Evaluación de Seguridad:** 7.5/10

**Fortalezas:**
- ✅ Comparación segura de contraseñas con bcrypt
- ✅ Mensaje genérico "Credenciales inválidas" (no revela si el email existe)
- ✅ Token con expiración (7 días)
- ✅ Verificación de JWT_SECRET antes de generar token

**Debilidades:**
- ⚠️ No tiene rate limiting (vulnerable a ataques de fuerza bruta)
- ⚠️ No registra intentos de login fallidos
- ⚠️ No bloquea cuentas después de múltiples intentos fallidos
- ⚠️ No tiene refresh tokens (el token expira en 7 días sin renovación)
- ⚠️ No valida si el usuario está activo antes de permitir login

---

## 2. 🔍 ANÁLISIS DE SEGURIDAD DETALLADO

### 2.1 Fortalezas del Sistema

#### ✅ Hash de Contraseñas
- **bcrypt con salt rounds: 10** es un estándar seguro
- Las contraseñas nunca se almacenan en texto plano
- Cada hash es único gracias al salt

#### ✅ Tokens JWT
- **Firmados con JWT_SECRET** (no pueden ser falsificados)
- **Expiración de 7 días** (balance entre seguridad y UX)
- **Payload mínimo** (solo user_id, sin información sensible)

#### ✅ Validaciones Básicas
- Formato de email validado
- Campos requeridos verificados
- Manejo de errores de MongoDB

#### ✅ Arquitectura Limpia
- Separación de responsabilidades (middleware, rutas, modelos)
- No modifica código existente
- Fácil de mantener y escalar

---

### 2.2 Riesgos y Puntos Débiles Identificados

#### 🔴 CRÍTICOS

1. **Falta de Rate Limiting**
   - **Riesgo:** Ataques de fuerza bruta en login y registro
   - **Impacto:** Alto
   - **Solución recomendada:**
     ```javascript
     const rateLimit = require('express-rate-limit');
     
     const loginLimiter = rateLimit({
       windowMs: 15 * 60 * 1000, // 15 minutos
       max: 5 // máximo 5 intentos por IP
     });
     
     router.post('/login', loginLimiter, async (req, res) => { ... });
     ```

2. **Contraseñas Débiles Permitidas**
   - **Riesgo:** Contraseñas fáciles de adivinar
   - **Impacto:** Medio-Alto
   - **Solución recomendada:**
     ```javascript
     // Validar complejidad de contraseña
     const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
     if (!passwordRegex.test(password)) {
       return res.status(400).json({
         message: 'La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, números y símbolos'
       });
     }
     ```

3. **Falta de Validación de Usuario Activo**
   - **Riesgo:** Usuarios desactivados pueden seguir usando tokens
   - **Impacto:** Medio
   - **Solución recomendada:**
     ```javascript
     // En middleware/auth.js, después de verificar token:
     const user = await User.findById(req.user.id);
     if (!user || !user.activo) {
       return res.status(401).json({ message: 'Usuario inactivo' });
     }
     ```

---

#### 🟡 MEDIOS

4. **No Hay Refresh Tokens**
   - **Riesgo:** Tokens de larga duración (7 días) son más vulnerables si se filtran
   - **Impacto:** Medio
   - **Solución recomendada:**
     - Implementar refresh tokens (30 días) y access tokens (15 minutos)
     - Endpoint `/api/auth/refresh` para renovar tokens

5. **Falta de Logging de Seguridad**
   - **Riesgo:** No se registran intentos de login fallidos o sospechosos
   - **Impacto:** Medio
   - **Solución recomendada:**
     ```javascript
     // Registrar intentos de login
     console.log(`[AUTH] Login intent: ${email} - ${success ? 'SUCCESS' : 'FAILED'}`);
     // O usar un sistema de logging más robusto (Winston, Pino)
     ```

6. **No Hay Confirmación de Email**
   - **Riesgo:** Emails inválidos o no verificados pueden registrarse
   - **Impacto:** Bajo-Medio
   - **Solución recomendada:**
     - Agregar campo `email_verificado: Boolean` al modelo User
     - Enviar email con token de verificación
     - Endpoint `/api/auth/verify-email/:token`

---

#### 🟢 BAJOS

7. **Falta de CAPTCHA en Registro**
   - **Riesgo:** Registro masivo de bots
   - **Impacto:** Bajo
   - **Solución recomendada:**
     - Integrar reCAPTCHA de Google
     - Validar en el endpoint de registro

8. **No Hay Bloqueo de Cuenta**
   - **Riesgo:** Ataques de fuerza bruta continuos
   - **Impacto:** Bajo-Medio
   - **Solución recomendada:**
     - Agregar campo `intentos_login: Number` y `bloqueado_hasta: Date`
     - Bloquear cuenta después de 5 intentos fallidos por 30 minutos

---

## 3. 💡 RECOMENDACIONES DE MEJORA

### 3.1 Mejoras Prioritarias (Alta)

1. **Implementar Rate Limiting**
   - Usar `express-rate-limit` para login y registro
   - Limitar a 5 intentos por IP cada 15 minutos

2. **Fortalecer Validación de Contraseñas**
   - Mínimo 8 caracteres
   - Requerir mayúsculas, números y símbolos
   - Validar con regex

3. **Agregar Validación de Usuario Activo**
   - Verificar en middleware si el usuario está activo
   - Agregar campo `activo: Boolean` al modelo User

---

### 3.2 Mejoras Recomendadas (Media)

4. **Implementar Refresh Tokens**
   - Access tokens cortos (15 minutos)
   - Refresh tokens largos (30 días)
   - Endpoint para renovar tokens

5. **Agregar Logging de Seguridad**
   - Registrar intentos de login (exitosos y fallidos)
   - Registrar cambios de contraseña
   - Alertas para actividad sospechosa

6. **Confirmación de Email**
   - Campo `email_verificado` en User
   - Envío de email con token de verificación
   - Bloquear funcionalidades hasta verificar email

---

### 3.3 Mejoras Opcionales (Baja)

7. **CAPTCHA en Registro**
   - Integrar reCAPTCHA v3
   - Validar score antes de permitir registro

8. **Bloqueo de Cuenta Temporal**
   - Después de 5 intentos fallidos
   - Bloquear por 30 minutos
   - Enviar email de notificación

9. **Autenticación de Dos Factores (2FA)**
   - Opcional para usuarios premium
   - Usar TOTP (Google Authenticator)

---

## 4. 🔐 INTEGRACIÓN CON "MI CUENTA"

### 4.1 Flujo Propuesto

1. **Usuario accede a "Mi Cuenta"**
   - Si no tiene token → mostrar formulario de login/registro
   - Si tiene token válido → mostrar contenido del usuario

2. **Registro/Login**
   - Formulario dentro de "Mi Cuenta"
   - Al registrarse/login → guardar token en localStorage
   - Redirigir a contenido del usuario

3. **Protección de Rutas**
   - Usar middleware `auth` en rutas de apuestas
   - Verificar token antes de crear/editar apuestas
   - Solo mostrar apuestas del usuario autenticado

---

### 4.2 Estructura de Archivos Sugerida

```
frontend/src/
  components/
    MiCuenta/
      Auth/
        LoginForm.jsx
        RegisterForm.jsx
      Apuestas/
        BetList.jsx
        BetForm.jsx
  services/
    authService.js  // Funciones para login/register
    apiService.js   // Funciones para llamadas API con token
```

---

### 4.3 Consideraciones de Frontend

1. **Almacenamiento de Token**
   - Usar `localStorage` para persistencia
   - O usar `sessionStorage` para mayor seguridad
   - Nunca almacenar en cookies sin httpOnly

2. **Manejo de Expiración**
   - Verificar expiración del token antes de hacer requests
   - Redirigir a login si el token expiró
   - Implementar refresh automático si hay refresh tokens

3. **Interceptores de Axios/Fetch**
   - Agregar token automáticamente a headers
   - Manejar 401 (token inválido) → redirigir a login

---

## 5. 📊 EVALUACIÓN FINAL

### 5.1 Puntuación General

**Seguridad:** 7.5/10

**Fortalezas:**
- ✅ Hash seguro de contraseñas (bcrypt)
- ✅ Tokens JWT firmados
- ✅ Validaciones básicas implementadas
- ✅ Arquitectura limpia y escalable

**Debilidades:**
- ⚠️ Falta rate limiting
- ⚠️ Contraseñas débiles permitidas
- ⚠️ No hay validación de usuario activo
- ⚠️ No hay refresh tokens

---

### 5.2 Estado Actual

El sistema está **funcional y seguro para un MVP**, pero necesita mejoras antes de producción en un entorno público. Para uso interno o beta cerrada, el nivel actual es aceptable.

---

### 5.3 Próximos Pasos Recomendados

1. **Inmediato:**
   - Agregar rate limiting
   - Fortalecer validación de contraseñas
   - Agregar campo `activo` al modelo User

2. **Corto Plazo:**
   - Implementar refresh tokens
   - Agregar logging de seguridad
   - Confirmación de email

3. **Largo Plazo:**
   - 2FA opcional
   - Bloqueo de cuenta
   - CAPTCHA

---

## 6. ✅ CONCLUSIÓN

El sistema de autenticación está **bien estructurado y funcional**, con una base sólida de seguridad. Las mejoras recomendadas son importantes para producción, pero el sistema actual es adecuado para desarrollo y pruebas.

**Recomendación:** Implementar las mejoras de prioridad alta antes de lanzar a producción.

---

**Fin del Análisis**

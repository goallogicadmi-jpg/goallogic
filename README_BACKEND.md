# 📚 Documentación del Backend - Sistema Premium de Usuarios

## 📋 Índice

1. [Modelos de Datos](#modelos-de-datos)
2. [Endpoints de Autenticación](#endpoints-de-autenticación)
3. [Endpoints del Simulador](#endpoints-del-simulador)
4. [Endpoints de Favoritos](#endpoints-de-favoritos)
5. [Flujo Completo del Perfil Premium](#flujo-completo-del-perfil-premium)
6. [Migración de Usuarios](#migración-de-usuarios)

---

## 🗄️ Modelos de Datos

### 1. User (Usuario)

**Archivo:** `models/User.js`

**Propósito:** Almacena la información completa del usuario, incluyendo datos personales y preferencias.

**Campos Obligatorios:**
- `nombre`: String - Nombre completo del usuario
- `telefono`: String - Número de teléfono del usuario
- `email`: String - Email único del usuario (lowercase, trimmed)
- `password_hash`: String - Contraseña hasheada con bcrypt

**Campos Opcionales:**
- `foto_perfil_url`: String - URL de la foto de perfil
- `pais`: String - País del usuario
- `ciudad`: String - Ciudad del usuario
- `idioma`: String - Idioma preferido (default: 'es')
- `timezone`: String - Zona horaria del usuario
- `equipo_favorito`: String - ID del equipo favorito
- `ligas_favoritas`: [String] - Array de IDs de ligas favoritas
- `created_at`: Date - Fecha de creación (automático)
- `updated_at`: Date - Fecha de última actualización (automático)

**Características:**
- Middleware `pre('save')` actualiza `updated_at` automáticamente
- Middleware `pre('findOneAndUpdate')` actualiza `updated_at` en actualizaciones

**Ejemplo:**
```javascript
{
  _id: ObjectId("..."),
  nombre: "Juan Pérez",
  telefono: "1234567890",
  email: "juan@example.com",
  password_hash: "$2b$10$...",
  idioma: "es",
  created_at: ISODate("2024-01-01T00:00:00.000Z"),
  updated_at: ISODate("2024-01-01T00:00:00.000Z")
}
```

---

### 2. SimulatorState (Estado del Simulador)

**Archivo:** `models/SimulatorState.js`

**Propósito:** Almacena el estado completo del simulador de apuestas de cada usuario, incluyendo capital y apuestas simuladas.

**Campos:**
- `user_id`: ObjectId (ref: 'User') - Referencia al usuario (único, requerido)
- `capital_inicial`: Number - Capital inicial del simulador (default: 1000)
- `capital_actual`: Number - Capital actual del simulador (default: 1000)
- `apuestas`: Array - Array de apuestas simuladas
  - `partido`: String - Nombre del partido
  - `cuota`: Number - Cuota de la apuesta
  - `stake`: Number - Cantidad apostada
  - `resultado`: String - Estado de la apuesta ('ganada', 'perdida', 'nula', 'pendiente')
  - `ganancia`: Number - Ganancia de la apuesta (default: 0)
  - `created_at`: Date - Fecha de creación de la apuesta
- `updated_at`: Date - Fecha de última actualización (automático)

**Características:**
- `user_id` es único: cada usuario tiene un solo documento de estado del simulador
- Middleware automático para actualizar `updated_at`
- Valores por defecto para capital inicial y actual

**Ejemplo:**
```javascript
{
  _id: ObjectId("..."),
  user_id: ObjectId("..."),
  capital_inicial: 1000,
  capital_actual: 1250,
  apuestas: [
    {
      _id: ObjectId("..."),
      partido: "Real Madrid vs Barcelona",
      cuota: 2.5,
      stake: 100,
      resultado: "ganada",
      ganancia: 150,
      created_at: ISODate("2024-01-01T00:00:00.000Z")
    }
  ],
  updated_at: ISODate("2024-01-01T00:00:00.000Z")
}
```

---

### 3. Favorites (Favoritos)

**Archivo:** `models/Favorites.js`

**Propósito:** Almacena los equipos y ligas favoritos de cada usuario.

**Campos:**
- `user_id`: ObjectId (ref: 'User') - Referencia al usuario (único, requerido)
- `equipos`: [String] - Array de IDs de equipos favoritos
- `ligas`: [String] - Array de IDs de ligas favoritas
- `updated_at`: Date - Fecha de última actualización (automático)

**Características:**
- `user_id` es único: cada usuario tiene un solo documento de favoritos
- Middleware automático para actualizar `updated_at`
- Arrays vacíos por defecto

**Ejemplo:**
```javascript
{
  _id: ObjectId("..."),
  user_id: ObjectId("..."),
  equipos: ["123", "456"],
  ligas: ["39", "140"],
  updated_at: ISODate("2024-01-01T00:00:00.000Z")
}
```

---

## 🔐 Endpoints de Autenticación

**Base URL:** `/api/auth`

### POST /api/auth/register

Registra un nuevo usuario en el sistema.

**Request:**
```json
{
  "nombre": "Juan Pérez",
  "telefono": "1234567890",
  "email": "juan@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "user_id": "507f1f77bcf86cd799439011"
}
```

**Errores:**
- `400`: Campos faltantes o inválidos
- `409`: Email ya registrado

---

### POST /api/auth/login

Autentica un usuario y genera un token JWT.

**Request:**
```json
{
  "email": "juan@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errores:**
- `400`: Campos faltantes
- `401`: Credenciales inválidas
- `500`: Error de configuración del servidor

---

### GET /api/auth/me

Obtiene el perfil completo del usuario autenticado, incluyendo datos personales, favoritos y estado del simulador.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "user_id": "507f1f77bcf86cd799439011",
    "nombre": "Juan Pérez",
    "telefono": "1234567890",
    "email": "juan@example.com",
    "foto_perfil_url": null,
    "pais": null,
    "ciudad": null,
    "idioma": "es",
    "timezone": null,
    "equipo_favorito": null,
    "ligas_favoritas": [],
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "favorites": {
    "equipos": ["123", "456"],
    "ligas": ["39", "140"],
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "simulator_state": {
    "capital_inicial": 1000,
    "capital_actual": 1250,
    "apuestas": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "partido": "Real Madrid vs Barcelona",
        "cuota": 2.5,
        "stake": 100,
        "resultado": "ganada",
        "ganancia": 150,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Características:**
- Consultas paralelas para mejor rendimiento
- Valores por defecto si no existen favoritos o simulador
- No incluye `password_hash` en la respuesta

**Errores:**
- `401`: Usuario no autenticado
- `404`: Usuario no encontrado
- `500`: Error del servidor

---

## 🎮 Endpoints del Simulador

**Base URL:** `/api/simulator`

Todos los endpoints requieren autenticación mediante token JWT.

### GET /api/simulator

Obtiene el estado del simulador del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "simulator_state": {
    "capital_inicial": 1000,
    "capital_actual": 1250,
    "apuestas": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "partido": "Real Madrid vs Barcelona",
        "cuota": 2.5,
        "stake": 100,
        "resultado": "ganada",
        "ganancia": 150,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Características:**
- Si no existe el estado, crea uno con valores por defecto automáticamente

---

### POST /api/simulator

Crea o actualiza el estado completo del simulador.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "capital_inicial": 1000,
  "capital_actual": 1250,
  "apuestas": [
    {
      "partido": "Real Madrid vs Barcelona",
      "cuota": 2.5,
      "stake": 100,
      "resultado": "ganada",
      "ganancia": 150
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "simulator_state": {
    "capital_inicial": 1000,
    "capital_actual": 1250,
    "apuestas": [...],
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Validaciones:**
- `capital_inicial` y `capital_actual` deben ser números positivos
- `apuestas` debe ser un array (opcional)
- Cada apuesta debe tener `partido`, `cuota` y `stake`

**Errores:**
- `400`: Campos inválidos o faltantes
- `401`: Usuario no autenticado

---

### PUT /api/simulator/apuesta

Agrega una nueva apuesta simulada al estado del simulador.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "partido": "Real Madrid vs Barcelona",
  "cuota": 2.5,
  "stake": 100,
  "resultado": "pendiente",
  "ganancia": 0
}
```

**Response (200):**
```json
{
  "success": true,
  "simulator_state": {
    "capital_inicial": 1000,
    "capital_actual": 1000,
    "apuestas": [...],
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Validaciones:**
- `partido`, `cuota` y `stake` son requeridos
- `cuota` y `stake` deben ser números positivos
- `resultado` debe ser: 'ganada', 'perdida', 'nula' o 'pendiente' (default: 'pendiente')
- Si la apuesta está ganada, actualiza `capital_actual` automáticamente
- Si la apuesta está perdida, resta el stake del `capital_actual`

**Errores:**
- `400`: Campos inválidos o faltantes
- `401`: Usuario no autenticado

---

### DELETE /api/simulator/apuesta/:id

Elimina una apuesta simulada del estado del simulador.

**Headers:**
```
Authorization: Bearer <token>
```

**Params:**
- `id`: ID de la apuesta dentro del array

**Response (200):**
```json
{
  "success": true,
  "simulator_state": {
    "capital_inicial": 1000,
    "capital_actual": 1000,
    "apuestas": [...],
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Características:**
- Ajusta `capital_actual` automáticamente:
  - Si la apuesta estaba ganada: resta la ganancia
  - Si la apuesta estaba perdida: suma el stake de vuelta

**Errores:**
- `401`: Usuario no autenticado
- `404`: Apuesta o estado del simulador no encontrado

---

## ⭐ Endpoints de Favoritos

**Base URL:** `/api/favorites`

Todos los endpoints requieren autenticación mediante token JWT.

### GET /api/favorites

Obtiene los favoritos del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "favorites": {
    "equipos": ["123", "456"],
    "ligas": ["39", "140"],
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Características:**
- Si no existe el documento, crea uno con arrays vacíos automáticamente

---

### POST /api/favorites

Reemplaza los favoritos completos del usuario.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "equipos": ["123", "456"],
  "ligas": ["39", "140"]
}
```

**Response (200):**
```json
{
  "success": true,
  "favorites": {
    "equipos": ["123", "456"],
    "ligas": ["39", "140"],
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Validaciones:**
- `equipos` y `ligas` deben ser arrays (opcionales)

**Errores:**
- `400`: Campos inválidos
- `401`: Usuario no autenticado

---

### PUT /api/favorites/equipos

Agrega o quita un equipo de favoritos.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "equipoId": "123",
  "action": "add"
}
```

**Response (200):**
```json
{
  "success": true,
  "favorites": {
    "equipos": ["123"],
    "ligas": [],
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Validaciones:**
- `equipoId`: String requerido
- `action`: 'add' o 'remove' (requerido)
- Si el equipo ya existe y se intenta agregar, no se duplica

**Errores:**
- `400`: Campos inválidos o faltantes
- `401`: Usuario no autenticado

---

### PUT /api/favorites/ligas

Agrega o quita una liga de favoritos.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "ligaId": "39",
  "action": "add"
}
```

**Response (200):**
```json
{
  "success": true,
  "favorites": {
    "equipos": [],
    "ligas": ["39"],
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Validaciones:**
- `ligaId`: String requerido
- `action`: 'add' o 'remove' (requerido)
- Si la liga ya existe y se intenta agregar, no se duplica

**Errores:**
- `400`: Campos inválidos o faltantes
- `401`: Usuario no autenticado

---

## 🔄 Flujo Completo del Perfil Premium

### 1. Registro de Usuario

```
Usuario → POST /api/auth/register
  ↓
Backend valida: nombre, telefono, email, password
  ↓
Crea usuario en MongoDB (User)
  ↓
Retorna: { success: true, user_id: "..." }
```

### 2. Login

```
Usuario → POST /api/auth/login
  ↓
Backend valida credenciales
  ↓
Genera token JWT (expira en 7 días)
  ↓
Frontend guarda token en localStorage
```

### 3. Obtener Perfil Completo

```
Usuario → GET /api/auth/me (con token)
  ↓
Backend:
  - Valida token
  - Consulta User, Favorites, SimulatorState (paralelo)
  - Retorna perfil completo con valores por defecto si faltan
  ↓
Frontend recibe:
  - Datos personales del usuario
  - Favoritos (equipos y ligas)
  - Estado del simulador (capital y apuestas)
```

### 4. Gestionar Simulador

```
Usuario → GET /api/simulator (obtener estado)
  ↓
Usuario → POST /api/simulator (actualizar estado completo)
  ↓
Usuario → PUT /api/simulator/apuesta (agregar apuesta)
  ↓
Usuario → DELETE /api/simulator/apuesta/:id (eliminar apuesta)
```

### 5. Gestionar Favoritos

```
Usuario → GET /api/favorites (obtener favoritos)
  ↓
Usuario → POST /api/favorites (reemplazar favoritos)
  ↓
Usuario → PUT /api/favorites/equipos (agregar/quitar equipo)
  ↓
Usuario → PUT /api/favorites/ligas (agregar/quitar liga)
```

---

## 🔧 Migración de Usuarios

### Script de Migración

**Archivo:** `scripts/migrateUsers.js`

**Propósito:** Actualiza usuarios antiguos que no tienen los campos obligatorios `nombre` y `telefono` con valores por defecto.

**Valores por defecto:**
- `nombre`: "Usuario"
- `telefono`: "0000000000"

**Ejecución:**
```bash
node scripts/migrateUsers.js
```

**Características:**
- Busca usuarios sin `nombre` o `telefono`
- Asigna valores por defecto
- Muestra reporte de usuarios migrados
- Verifica que todos los usuarios tengan los campos requeridos

**IMPORTANTE:** Este script NO se ejecuta automáticamente. Debe ejecutarse manualmente antes de desplegar la nueva versión del sistema.

---

## 📝 Notas Importantes

### Seguridad

1. **Tokens JWT:** Todos los endpoints protegidos requieren token válido en header `Authorization: Bearer <token>`
2. **Validación de usuario:** El middleware `auth` extrae `user_id` del token y lo coloca en `req.user.id`
3. **Aislamiento de datos:** Cada usuario solo puede acceder a sus propios datos (favoritos, simulador, apuestas)

### Rendimiento

1. **Consultas paralelas:** El endpoint `/api/auth/me` ejecuta consultas en paralelo usando `Promise.all()`
2. **Valores por defecto:** Los endpoints crean documentos automáticamente si no existen
3. **Índices únicos:** `user_id` es único en `SimulatorState` y `Favorites` para garantizar un documento por usuario

### Compatibilidad

1. **Usuarios antiguos:** El script de migración actualiza usuarios sin `nombre` o `telefono`
2. **Valores por defecto:** Si no existen `Favorites` o `SimulatorState`, se devuelven valores por defecto
3. **Campos opcionales:** Los campos opcionales del modelo `User` permiten migración gradual

---

## 🚀 Próximos Pasos

1. **Migración del Frontend:**
   - Actualizar `SimuladorApuestas.jsx` para usar endpoints del backend
   - Actualizar `utils/favoritos.js` para usar endpoints del backend
   - Implementar sincronización automática con el backend

2. **Mejoras Futuras:**
   - Implementar refresh tokens para mejor seguridad
   - Agregar validación de expiración de tokens en frontend
   - Implementar rate limiting en endpoints de autenticación
   - Agregar logging de seguridad para intentos de login fallidos

---

**Última actualización:** 2024-01-01
**Versión:** 1.0.0

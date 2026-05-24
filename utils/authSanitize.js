/**
 * Sanitización de campos de auth/registro.
 * Rechaza caracteres peligrosos y limita longitud.
 */

const DANGEROUS = /[<>{}$]/;
const { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } = require('./passwordPolicy');

const LIMITS = {
  nombre: 80,
  apellido: 80,
  telefono: 30,
  email: 254,
  pais: 80,
  ciudad: 120,
  direccion: 240,
  codigo_postal: 20,
};

function assertNoDanger(str, fieldName) {
  if (DANGEROUS.test(str)) {
    const err = new Error(`Caracteres no permitidos en ${fieldName}`);
    err.statusCode = 400;
    throw err;
  }
}

function clip(str, max) {
  return String(str ?? '')
    .trim()
    .slice(0, max);
}

/**
 * @param {string} email
 */
function sanitizeEmail(email) {
  const e = clip(email, LIMITS.email).toLowerCase();
  assertNoDanger(e, 'email');
  if (!/^\S+@\S+\.\S+$/.test(e)) {
    const err = new Error('Email inválido');
    err.statusCode = 400;
    throw err;
  }
  return e;
}

/**
 * Sanitiza texto genérico (nombre, ciudad, etc.)
 */
function sanitizeText(value, fieldName, maxLen) {
  const s = clip(value, maxLen);
  assertNoDanger(s, fieldName);
  return s;
}

/**
 * Body de registro ya validado parcialmente; devuelve objeto limpio o lanza Error con statusCode 400.
 */
function sanitizeRegisterBody(body) {
  const password = body.password;
  if (
    typeof password !== 'string' ||
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    const err = new Error(
      `Contraseña inválida (${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} caracteres)`
    );
    err.statusCode = 400;
    throw err;
  }
  if (DANGEROUS.test(password)) {
    const err = new Error('La contraseña contiene caracteres no permitidos');
    err.statusCode = 400;
    throw err;
  }

  return {
    nombre: sanitizeText(body.nombre, 'nombre', LIMITS.nombre),
    apellido: sanitizeText(body.apellido, 'apellido', LIMITS.apellido),
    telefono: sanitizeText(body.telefono, 'telefono', LIMITS.telefono),
    email: sanitizeEmail(body.email),
    password,
    pais: sanitizeText(body.pais, 'pais', LIMITS.pais),
    ciudad: sanitizeText(body.ciudad, 'ciudad', LIMITS.ciudad),
    direccion: sanitizeText(body.direccion, 'direccion', LIMITS.direccion),
    codigo_postal: sanitizeText(
      body.codigo_postal,
      'codigo_postal',
      LIMITS.codigo_postal
    ),
  };
}

/**
 * Login: email + password (solo sanea email; contraseña no se recorta).
 */
function sanitizeLoginBody(body) {
  const email = sanitizeEmail(body.email);
  const password = body.password;
  if (typeof password !== 'string' || password.length < 1 || password.length > 128) {
    const err = new Error('Credenciales inválidas');
    err.statusCode = 400;
    throw err;
  }
  return { email, password };
}

module.exports = {
  sanitizeRegisterBody,
  sanitizeLoginBody,
  sanitizeEmail,
  LIMITS,
};

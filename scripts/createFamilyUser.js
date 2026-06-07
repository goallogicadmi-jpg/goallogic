/**
 * Crea o actualiza un usuario del plan familiar (free-family).
 * Uso: node scripts/createFamilyUser.js
 * Variables opcionales: FAMILY_EMAIL, FAMILY_PASSWORD, FAMILY_NOMBRE, FAMILY_APELLIDO, FAMILY_TELEFONO
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { buildFamilyUserFields } = require('../utils/familyUser');

const DEFAULT_USER = {
  email: 'johansebastiancortesgrajales@gmail.com',
  password: 'sebas1234',
  nombre: 'Sebastián',
  apellido: 'Cortes',
  telefono: '3117854240',
};

async function main() {
  const email = (process.env.FAMILY_EMAIL || DEFAULT_USER.email).toLowerCase().trim();
  const password = process.env.FAMILY_PASSWORD || DEFAULT_USER.password;
  const nombre = process.env.FAMILY_NOMBRE || DEFAULT_USER.nombre;
  const apellido = process.env.FAMILY_APELLIDO || DEFAULT_USER.apellido;
  const telefono = process.env.FAMILY_TELEFONO || DEFAULT_USER.telefono;

  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI no definida en .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Conectado a MongoDB');

  const password_hash = await bcrypt.hash(password, 10);
  const familyFields = buildFamilyUserFields();

  let user = await User.findOne({ email });

  if (user) {
    user.nombre = nombre;
    user.apellido = apellido;
    user.telefono = telefono;
    user.password_hash = password_hash;
    Object.assign(user, familyFields);
    user.welcomeShown = false;
    await user.save();
    console.log('✅ Usuario familiar actualizado:', email);
  } else {
    user = new User({
      nombre,
      apellido,
      telefono,
      email,
      password_hash,
      role: 'usuario',
      tokenVersion: 0,
      legalAccepted: false,
      ...familyFields,
    });
    await user.save();
    console.log('✅ Usuario familiar creado:', email);
  }

  console.log({
    id: String(user._id),
    email: user.email,
    tipo: user.tipo,
    plan: user.plan,
    premium: user.premium,
    billingLocked: user.billingLocked,
    welcomeShown: user.welcomeShown,
  });

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

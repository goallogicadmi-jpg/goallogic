const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
require('dotenv').config();

/**
 * Script para crear el administrador principal por defecto
 * Se ejecuta automáticamente al iniciar el servidor
 */
const createMainAdmin = async () => {
  try {
    // Verificar que MongoDB esté conectado
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ Esperando conexión a MongoDB...');
      return;
    }

    const adminEmail = 'goal.logic.admi@gmail.com';
    const adminPassword = 'Goat2026*';

    // Verificar si ya existe el administrador principal
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      // Si existe, asegurar que tenga los campos correctos (incl. premium para no bloquear el acceso)
      if (existingAdmin.role !== 'admin' || !existingAdmin.isMainAdmin || existingAdmin.premium !== true) {
        existingAdmin.role = 'admin';
        existingAdmin.isMainAdmin = true;
        existingAdmin.premium = true;
        if (existingAdmin.tokenVersion === undefined || existingAdmin.tokenVersion === null) {
          existingAdmin.tokenVersion = 0;
        }
        await existingAdmin.save();
        console.log('✅ Administrador principal actualizado correctamente');
      } else {
        console.log('✅ Administrador principal ya existe');
      }
      return;
    }

    // Si no existe, crear el administrador principal
    console.log('🔧 Creando administrador principal por defecto...');

    // Encriptar contraseña
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(adminPassword, saltRounds);

    // Crear usuario administrador
    const mainAdmin = new User({
      nombre: 'Administrador Principal',
      apellido: '',
      email: adminEmail,
      telefono: '0000000000',
      password_hash: password_hash,
      role: 'admin',
      isMainAdmin: true,
      premium: true,
      tokenVersion: 0,
      created_at: new Date(),
      updated_at: new Date()
    });

    await mainAdmin.save();

    console.log('✅ Administrador principal creado exitosamente');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Contraseña:', adminPassword);
    console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer inicio de sesión');

  } catch (error) {
    console.error('❌ Error creando administrador principal:', error);
    // No lanzar error para que el servidor pueda iniciar aunque falle esto
  }
};

module.exports = createMainAdmin;

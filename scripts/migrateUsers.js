/**
 * Script de migración para usuarios existentes
 * 
 * Este script actualiza usuarios antiguos que no tienen los campos
 * obligatorios 'nombre' y 'telefono' con valores por defecto.
 * 
 * IMPORTANTE: Este script NO se ejecuta automáticamente.
 * Para ejecutarlo manualmente:
 *   node scripts/migrateUsers.js
 * 
 * Requisitos:
 * - MongoDB debe estar corriendo
 * - Variables de entorno configuradas (.env con MONGO_URI)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/futbol_analytics';
const DB_NAME = 'futbol_analytics';

async function migrateUsers() {
  try {
    console.log('🔄 Iniciando migración de usuarios...');
    console.log('📡 Conectando a MongoDB...');

    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Conectado a MongoDB');

    // Buscar usuarios sin nombre o telefono
    const usersToMigrate = await User.find({
      $or: [
        { nombre: { $exists: false } },
        { nombre: null },
        { nombre: '' },
        { telefono: { $exists: false } },
        { telefono: null },
        { telefono: '' }
      ]
    });

    console.log(`📊 Usuarios encontrados sin nombre o telefono: ${usersToMigrate.length}`);

    if (usersToMigrate.length === 0) {
      console.log('✅ No hay usuarios que migrar. Todos los usuarios ya tienen nombre y telefono.');
      await mongoose.connection.close();
      return;
    }

    // Mostrar usuarios que se migrarán
    console.log('\n📋 Usuarios que serán migrados:');
    usersToMigrate.forEach((user, index) => {
      console.log(`   ${index + 1}. Email: ${user.email}, Nombre: ${user.nombre || 'N/A'}, Teléfono: ${user.telefono || 'N/A'}`);
    });

    // Actualizar usuarios con valores por defecto
    let updatedCount = 0;
    for (const user of usersToMigrate) {
      const updates = {};
      
      if (!user.nombre || user.nombre.trim() === '') {
        updates.nombre = 'Usuario';
      }
      
      if (!user.telefono || user.telefono.trim() === '') {
        updates.telefono = '0000000000';
      }

      if (Object.keys(updates).length > 0) {
        await User.findByIdAndUpdate(user._id, updates);
        updatedCount++;
        console.log(`   ✅ Usuario ${user.email} actualizado`);
      }
    }

    console.log(`\n✅ Migración completada: ${updatedCount} usuarios actualizados`);

    // Verificar que todos los usuarios ahora tienen nombre y telefono
    const remainingUsers = await User.find({
      $or: [
        { nombre: { $exists: false } },
        { nombre: null },
        { nombre: '' },
        { telefono: { $exists: false } },
        { telefono: null },
        { telefono: '' }
      ]
    });

    if (remainingUsers.length === 0) {
      console.log('✅ Verificación: Todos los usuarios ahora tienen nombre y telefono');
    } else {
      console.log(`⚠️  Advertencia: Aún quedan ${remainingUsers.length} usuarios sin nombre o telefono`);
    }

    await mongoose.connection.close();
    console.log('✅ Conexión cerrada');
    console.log('🎉 Migración finalizada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Ejecutar migración solo si el script se ejecuta directamente
if (require.main === module) {
  migrateUsers()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = migrateUsers;

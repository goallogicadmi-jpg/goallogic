// Script de diagnóstico para verificar la configuración del backend
require('dotenv').config();

console.log('\n========================================');
console.log('🔍 DIAGNÓSTICO DE CONFIGURACIÓN');
console.log('========================================\n');

// 1. Verificar variables de entorno
console.log('1️⃣ VARIABLES DE ENTORNO:');
console.log('   MONGO_URI:', process.env.MONGO_URI ? '✅ Definida' : '❌ NO DEFINIDA');
console.log('   MONGODB_URI:', process.env.MONGODB_URI ? '✅ Definida' : '❌ NO DEFINIDA');
console.log('   API_KEY:', process.env.API_KEY ? '✅ Definida' : '❌ NO DEFINIDA');
console.log('   PORT:', process.env.PORT || '3000 (por defecto)');
console.log('   FRONTEND_URL:', process.env.FRONTEND_URL || '❌ NO DEFINIDA');

// 2. Verificar qué variable usa el servidor
console.log('\n2️⃣ CONFIGURACIÓN DEL SERVIDOR:');
console.log('   server.js usa: process.env.MONGO_URI');
if (process.env.MONGO_URI) {
    console.log('   ✅ La variable MONGO_URI está definida');
} else if (process.env.MONGODB_URI) {
    console.log('   ⚠️  ADVERTENCIA: server.js busca MONGO_URI pero tienes MONGODB_URI');
    console.log('   💡 Solución: Cambia MONGODB_URI a MONGO_URI en tu .env');
} else {
    console.log('   ❌ Ninguna de las dos variables está definida');
}

// 3. Verificar formato de la URI de MongoDB
if (process.env.MONGO_URI || process.env.MONGODB_URI) {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    console.log('\n3️⃣ FORMATO DE MONGODB URI:');
    if (mongoUri.includes('mongodb+srv://')) {
        console.log('   ✅ Formato correcto (MongoDB Atlas)');
    } else if (mongoUri.includes('mongodb://')) {
        console.log('   ⚠️  Formato local (no es Atlas)');
    } else {
        console.log('   ❌ Formato incorrecto');
    }
    if (mongoUri.includes('<password>') || mongoUri.includes('TU_PASSWORD')) {
        console.log('   ⚠️  ADVERTENCIA: Parece que la contraseña no fue reemplazada');
    }
}

// 4. Verificar API_KEY
console.log('\n4️⃣ API KEY:');
if (process.env.API_KEY) {
    if (process.env.API_KEY.length > 20) {
        console.log('   ✅ API_KEY tiene formato válido');
    } else {
        console.log('   ⚠️  API_KEY parece muy corta');
    }
} else {
    console.log('   ❌ API_KEY no está definida');
    console.log('   💡 Necesitas una API key de https://api-sports.io');
}

console.log('\n========================================');
console.log('✅ DIAGNÓSTICO COMPLETADO');
console.log('========================================\n');

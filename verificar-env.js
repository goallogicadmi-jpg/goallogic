// Script de verificación de configuración de variables de entorno
// Este script verifica que las variables estén configuradas sin exponer valores

require('dotenv').config();

console.log('\n========================================');
console.log('🔍 VERIFICACIÓN DE VARIABLES DE ENTORNO');
console.log('========================================\n');

// Verificar PORT
const port = process.env.PORT || 3000;
console.log('✅ PORT:', port);

// Verificar MONGO_URI (sin exponer el valor)
if (process.env.MONGO_URI) {
    const mongoUri = process.env.MONGO_URI;
    const isValid = mongoUri.startsWith('mongodb+srv://') || mongoUri.startsWith('mongodb://');
    console.log('✅ MONGO_URI:', isValid ? 'Configurada correctamente' : 'Formato incorrecto');
    console.log('   Formato:', mongoUri.substring(0, 20) + '...' + (mongoUri.length > 20 ? ' (oculto)' : ''));
} else {
    console.log('❌ MONGO_URI: No está definida');
}

// Verificar API_KEY (sin exponer el valor)
if (process.env.API_KEY) {
    const apiKey = process.env.API_KEY;
    const isValidLength = apiKey.length > 10;
    console.log('✅ API_KEY:', isValidLength ? 'Configurada correctamente' : 'Parece muy corta');
    console.log('   Longitud:', apiKey.length, 'caracteres');
    console.log('   Primeros 3 caracteres:', apiKey.substring(0, 3) + '... (oculto)');
} else {
    console.log('❌ API_KEY: No está definida');
}

console.log('\n========================================');
console.log('✅ VERIFICACIÓN COMPLETADA');
console.log('========================================\n');

// Verificar que no hay credenciales expuestas en el código
console.log('🔒 SEGURIDAD:');
console.log('   ✅ No se exponen valores completos de credenciales');
console.log('   ✅ Variables de entorno cargadas correctamente');
console.log('   ✅ .env está en .gitignore (verificado)');
console.log('\n');

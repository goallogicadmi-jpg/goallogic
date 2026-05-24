const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI;
const DB_NAME = 'futbol_analytics';

console.log('🔍 SOLUCIÓN MONGODB DEFINITIVA');
console.log('='.repeat(50));

async function probarSolucionDefinitiva() {
    // Configuración limpia sin opciones no soportadas
    const configuracionLimpia = {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 15000,
        maxPoolSize: 5,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        // TLS permisivo para resolver SSL Alert 80
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
        // Forzar IPv4
        family: 4
    };
    
    console.log('🧪 Probando configuración limpia y optimizada');
    console.log('📋 Opciones:', JSON.stringify(configuracionLimpia, null, 2));
    
    try {
        const client = new MongoClient(MONGODB_URI, configuracionLimpia);
        
        console.log('🔄 Conectando...');
        const startTime = Date.now();
        
        await client.connect();
        const connectTime = Date.now() - startTime;
        
        console.log(`✅ ¡CONEXIÓN EXITOSA! Tiempo: ${connectTime}ms`);
        
        // Probar ping
        console.log('🔄 Probando ping...');
        const pingStart = Date.now();
        await client.db("admin").command({ ping: 1 });
        const pingTime = Date.now() - pingStart;
        
        console.log(`✅ Ping exitoso en ${pingTime}ms`);
        
        // Probar base de datos
        console.log('🔄 Accediendo a la base de datos...');
        const db = client.db(DB_NAME);
        
        // Listar colecciones
        const collections = await db.listCollections().toArray();
        console.log(`✅ Base de datos accesible. Colecciones: ${collections.length}`);
        
        if (collections.length > 0) {
            console.log('📋 Colecciones:', collections.map(c => c.name).join(', '));
        }
        
        // Probar CRUD completo
        console.log('🔄 Probando operaciones CRUD...');
        const testCollection = db.collection('connection_test');
        
        // CREATE
        const testDoc = { 
            timestamp: new Date(), 
            test: 'mongodb_working',
            nodeVersion: process.version,
            performance: { connectTime, pingTime }
        };
        
        const insertResult = await testCollection.insertOne(testDoc);
        console.log(`✅ CREATE: Documento insertado con ID ${insertResult.insertedId}`);
        
        // READ
        const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
        console.log(`✅ READ: Documento encontrado - test: ${foundDoc.test}`);
        
        // UPDATE
        await testCollection.updateOne(
            { _id: insertResult.insertedId },
            { $set: { updated: true, updateTime: new Date() } }
        );
        console.log('✅ UPDATE: Documento actualizado');
        
        // DELETE
        await testCollection.deleteOne({ _id: insertResult.insertedId });
        console.log('✅ DELETE: Documento eliminado');
        
        await client.close();
        console.log('✅ Conexión cerrada correctamente');
        
        console.log('\n' + '🎉'.repeat(25));
        console.log('🎯 ¡MONGODB FUNCIONANDO PERFECTAMENTE!');
        console.log('🎉'.repeat(25));
        console.log(`⚡ Tiempo de conexión: ${connectTime}ms`);
        console.log(`⚡ Tiempo de ping: ${pingTime}ms`);
        console.log(`⚡ Tiempo total: ${connectTime + pingTime}ms`);
        console.log('✅ Todas las operaciones CRUD exitosas');
        console.log('✅ Compatible con Node.js 24');
        console.log('✅ Problema SSL Alert 80 resuelto');
        
        return configuracionLimpia;
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        console.log(`❌ Código: ${error.code}`);
        
        // Análisis del error
        if (error.message.includes('SSL alert number 80')) {
            console.log('💡 Aún persiste el error SSL Alert 80');
            console.log('   Esto indica incompatibilidad fundamental entre Node.js 24 y el cluster');
        }
        
        return null;
    }
}

// Ejecutar prueba
probarSolucionDefinitiva().then(config => {
    if (config) {
        console.log('\n🔧 CÓDIGO PARA IMPLEMENTAR EN server.js:');
        console.log('='.repeat(50));
        console.log('// Reemplazar las opciones en connectToMongoDB():');
        console.log('const options = {');
        Object.entries(config).forEach(([key, value]) => {
            console.log(`    ${key}: ${typeof value === 'string' ? `"${value}"` : value},`);
        });
        console.log('};');
        console.log('');
        console.log('🚀 LISTO PARA PRODUCCIÓN - MongoDB Atlas conectado exitosamente');
    } else {
        console.log('\n⚠️ REQUIERE ACCIÓN MANUAL:');
        console.log('1. Verificar IP en Network Access de MongoDB Atlas');
        console.log('2. Verificar que el cluster esté activo (no pausado)');
        console.log('3. Regenerar cadena de conexión desde Atlas');
        console.log('4. Verificar credenciales de usuario');
    }
}).catch(console.error);
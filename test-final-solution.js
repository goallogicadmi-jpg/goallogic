const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI;
const DB_NAME = 'futbol_analytics';

console.log('🔍 PRUEBA FINAL DE SOLUCIÓN MONGODB');
console.log('='.repeat(50));

async function probarSolucionFinal() {
    // Configuración que debería funcionar basada en el diagnóstico
    const configuracionFinal = {
        serverSelectionTimeoutMS: 20000, // Timeout más corto
        connectTimeoutMS: 20000,
        socketTimeoutMS: 20000,
        maxPoolSize: 5,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        // TLS permisivo para resolver el SSL Alert 80
        tls: true,
        tlsAllowInvalidCertificates: true,
        tlsAllowInvalidHostnames: true,
        // Forzar IPv4
        family: 4,
        // Configuración adicional
        retryWrites: true,
        w: 'majority',
        // Configuración de heartbeat más frecuente
        heartbeatFrequencyMS: 10000,
        serverSelectionRetryDelayMS: 2000
    };
    
    console.log('🧪 Probando configuración final optimizada');
    console.log('📋 Opciones:', JSON.stringify(configuracionFinal, null, 2));
    
    try {
        const client = new MongoClient(MONGODB_URI, configuracionFinal);
        
        console.log('🔄 Conectando...');
        const startTime = Date.now();
        
        await client.connect();
        const connectTime = Date.now() - startTime;
        
        console.log(`✅ Conexión establecida en ${connectTime}ms`);
        
        // Probar ping
        console.log('🔄 Probando ping...');
        const pingStart = Date.now();
        await client.db("admin").command({ ping: 1 });
        const pingTime = Date.now() - pingStart;
        
        console.log(`✅ Ping exitoso en ${pingTime}ms`);
        
        // Probar acceso a la base de datos
        console.log('🔄 Probando acceso a la base de datos...');
        const db = client.db(DB_NAME);
        
        // Listar colecciones
        const collections = await db.listCollections().toArray();
        console.log(`✅ Base de datos accesible. Colecciones: ${collections.length}`);
        
        if (collections.length > 0) {
            console.log('📋 Colecciones encontradas:', collections.map(c => c.name).join(', '));
        } else {
            console.log('📋 Base de datos vacía - creando colección de prueba...');
        }
        
        // Probar operación de escritura
        console.log('🔄 Probando operación de escritura...');
        const testCollection = db.collection('connection_test');
        const testDoc = { 
            timestamp: new Date(), 
            test: 'mongodb_connection_successful',
            nodeVersion: process.version,
            connectTime: connectTime,
            pingTime: pingTime
        };
        
        const insertResult = await testCollection.insertOne(testDoc);
        console.log(`✅ Escritura exitosa. ID: ${insertResult.insertedId}`);
        
        // Probar operación de lectura
        console.log('🔄 Probando operación de lectura...');
        const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
        console.log('✅ Lectura exitosa');
        
        // Probar operación de actualización
        console.log('🔄 Probando operación de actualización...');
        await testCollection.updateOne(
            { _id: insertResult.insertedId },
            { $set: { updated: true, updateTime: new Date() } }
        );
        console.log('✅ Actualización exitosa');
        
        // Probar operación de eliminación
        console.log('🔄 Probando operación de eliminación...');
        await testCollection.deleteOne({ _id: insertResult.insertedId });
        console.log('✅ Eliminación exitosa');
        
        await client.close();
        console.log('✅ Conexión cerrada correctamente');
        
        console.log('\n' + '='.repeat(50));
        console.log('🎯 ¡SOLUCIÓN EXITOSA ENCONTRADA!');
        console.log('='.repeat(50));
        console.log(`⏱️ Tiempo de conexión: ${connectTime}ms`);
        console.log(`⏱️ Tiempo de ping: ${pingTime}ms`);
        console.log(`⏱️ Tiempo total: ${connectTime + pingTime}ms`);
        console.log('');
        console.log('🔧 CONFIGURACIÓN PARA server.js:');
        console.log('');
        console.log('// Reemplazar la función connectToMongoDB() con:');
        console.log('const options = ' + JSON.stringify(configuracionFinal, null, 2) + ';');
        console.log('const client = new MongoClient(MONGODB_URI, options);');
        console.log('');
        console.log('✅ Esta configuración resuelve el problema SSL Alert 80');
        console.log('✅ Compatible con Node.js 24');
        console.log('✅ Todas las operaciones CRUD funcionan correctamente');
        
        return true;
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        console.log(`❌ Código: ${error.code}`);
        console.log(`❌ Stack: ${error.stack}`);
        
        console.log('\n❌ LA SOLUCIÓN FINAL NO FUNCIONÓ');
        console.log('🔧 PASOS ADICIONALES REQUERIDOS:');
        console.log('1. Verificar que la IP esté autorizada en MongoDB Atlas');
        console.log('2. Verificar que el cluster no esté pausado');
        console.log('3. Regenerar la cadena de conexión desde Atlas');
        console.log('4. Verificar credenciales de usuario');
        console.log('5. Considerar crear un nuevo cluster con MongoDB 6.0+');
        
        return false;
    }
}

// Ejecutar prueba final
probarSolucionFinal().then(exito => {
    if (exito) {
        console.log('\n🚀 LISTO PARA IMPLEMENTAR EN PRODUCCIÓN');
    } else {
        console.log('\n⚠️ REQUIERE INTERVENCIÓN MANUAL');
    }
}).catch(console.error);
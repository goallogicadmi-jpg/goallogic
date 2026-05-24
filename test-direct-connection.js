const { MongoClient } = require('mongodb');
require('dotenv').config();

console.log('🔍 PROBANDO CONEXIÓN DIRECTA A NODOS DEL CLUSTER');
console.log('='.repeat(50));

// Nodos encontrados en el registro SRV
const nodos = [
    'ac-qbqbstf-shard-00-00.qbtoigw.mongodb.net:27017',
    'ac-qbqbstf-shard-00-01.qbtoigw.mongodb.net:27017',
    'ac-qbqbstf-shard-00-02.qbtoigw.mongodb.net:27017'
];

// Credenciales de la URI original
const username = 'brayan98cortes_db_user';
const password = 'SYJkg6rKFmHwl0Um';
const database = 'futbol_analytics';

async function probarConexionDirecta() {
    // Crear URI directa sin SRV
    const uriDirecta = `mongodb://${username}:${password}@${nodos.join(',')}/${database}?replicaSet=atlas-14oa8j-shard-0&ssl=true&authSource=admin`;
    
    console.log('🔗 URI directa generada:');
    console.log(uriDirecta.replace(password, '***'));
    
    const configuraciones = [
        {
            nombre: 'Conexión directa con TLS básico',
            opciones: {
                serverSelectionTimeoutMS: 30000,
                connectTimeoutMS: 30000,
                socketTimeoutMS: 30000,
                tls: true,
                tlsAllowInvalidCertificates: false,
                tlsAllowInvalidHostnames: false
            }
        },
        {
            nombre: 'Conexión directa con TLS permisivo',
            opciones: {
                serverSelectionTimeoutMS: 30000,
                connectTimeoutMS: 30000,
                socketTimeoutMS: 30000,
                tls: true,
                tlsAllowInvalidCertificates: true,
                tlsAllowInvalidHostnames: true
            }
        },
        {
            nombre: 'Conexión directa con SSL legacy',
            opciones: {
                serverSelectionTimeoutMS: 30000,
                connectTimeoutMS: 30000,
                socketTimeoutMS: 30000,
                ssl: true,
                sslValidate: false
            }
        }
    ];
    
    for (const config of configuraciones) {
        console.log(`\n🧪 ${config.nombre}`);
        console.log('-'.repeat(40));
        
        try {
            const client = new MongoClient(uriDirecta, config.opciones);
            
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
            const db = client.db(database);
            const collections = await db.listCollections().toArray();
            
            console.log(`✅ Base de datos accesible. Colecciones: ${collections.length}`);
            if (collections.length > 0) {
                console.log('📋 Colecciones encontradas:', collections.map(c => c.name).join(', '));
            }
            
            // Probar operación de escritura/lectura
            console.log('🔄 Probando operación de prueba...');
            const testCollection = db.collection('connection_test');
            const testDoc = { timestamp: new Date(), test: 'connection_successful', nodeVersion: process.version };
            
            await testCollection.insertOne(testDoc);
            console.log('✅ Escritura exitosa');
            
            const foundDoc = await testCollection.findOne({ test: 'connection_successful' });
            console.log('✅ Lectura exitosa');
            
            // Limpiar documento de prueba
            await testCollection.deleteOne({ _id: testDoc._id });
            console.log('✅ Limpieza exitosa');
            
            await client.close();
            console.log('✅ Conexión cerrada correctamente');
            
            console.log('\n🎯 ¡CONFIGURACIÓN EXITOSA ENCONTRADA!');
            console.log('📋 URI a usar en server.js:');
            console.log(`"${uriDirecta}"`);
            console.log('\n📋 Opciones a usar:');
            console.log(JSON.stringify(config.opciones, null, 2));
            
            return {
                exito: true,
                uri: uriDirecta,
                opciones: config.opciones,
                tiempo: connectTime + pingTime
            };
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
            console.log(`❌ Código: ${error.code}`);
            
            if (error.message.includes('SSL') || error.message.includes('TLS')) {
                console.log('💡 Error TLS/SSL detectado');
            }
            if (error.message.includes('Authentication')) {
                console.log('💡 Error de autenticación - verificar credenciales');
            }
            if (error.message.includes('timeout')) {
                console.log('💡 Error de timeout - conexión lenta');
            }
        }
        
        // Pausa entre pruebas
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return { exito: false };
}

async function probarConexionSRVAlternativa() {
    console.log('\n🔍 PROBANDO CONEXIÓN SRV CON CONFIGURACIÓN ALTERNATIVA');
    console.log('-'.repeat(50));
    
    // URI SRV original pero con configuraciones diferentes
    const uriSRV = `mongodb+srv://${username}:${password}@cluster0.qbtoigw.mongodb.net/${database}?retryWrites=true&w=majority`;
    
    const configuraciones = [
        {
            nombre: 'SRV con TLS 1.2 forzado',
            opciones: {
                serverSelectionTimeoutMS: 45000,
                connectTimeoutMS: 45000,
                socketTimeoutMS: 45000,
                tls: true,
                tlsAllowInvalidCertificates: false,
                tlsAllowInvalidHostnames: false,
                // Forzar TLS 1.2 específicamente
                secureProtocol: 'TLSv1_2_method',
                // Configuración adicional para Node.js 24
                family: 4 // Forzar IPv4
            }
        },
        {
            nombre: 'SRV con configuración mínima',
            opciones: {
                serverSelectionTimeoutMS: 60000,
                connectTimeoutMS: 60000,
                socketTimeoutMS: 60000,
                family: 4 // Solo IPv4
            }
        }
    ];
    
    for (const config of configuraciones) {
        console.log(`\n🧪 ${config.nombre}`);
        console.log('-'.repeat(40));
        
        try {
            const client = new MongoClient(uriSRV, config.opciones);
            
            console.log('🔄 Conectando con SRV...');
            const startTime = Date.now();
            
            await client.connect();
            const connectTime = Date.now() - startTime;
            
            console.log(`✅ Conexión SRV exitosa en ${connectTime}ms`);
            
            await client.db("admin").command({ ping: 1 });
            console.log('✅ Ping SRV exitoso');
            
            await client.close();
            
            console.log('\n🎯 ¡CONEXIÓN SRV EXITOSA!');
            console.log('📋 Usar URI SRV original con estas opciones:');
            console.log(JSON.stringify(config.opciones, null, 2));
            
            return {
                exito: true,
                uri: uriSRV,
                opciones: config.opciones,
                tiempo: connectTime
            };
            
        } catch (error) {
            console.log(`❌ Error SRV: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return { exito: false };
}

async function ejecutarPruebasCompletas() {
    console.log('🚀 Iniciando pruebas de conexión directa...\n');
    
    // 1. Probar conexión directa a nodos
    const resultadoDirecto = await probarConexionDirecta();
    
    // 2. Si la directa no funciona, probar SRV alternativo
    let resultadoSRV = { exito: false };
    if (!resultadoDirecto.exito) {
        resultadoSRV = await probarConexionSRVAlternativa();
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(50));
    
    if (resultadoDirecto.exito) {
        console.log('✅ SOLUCIÓN ENCONTRADA: Conexión directa a nodos');
        console.log(`   Tiempo total: ${resultadoDirecto.tiempo}ms`);
        console.log('\n🔧 ACTUALIZAR server.js:');
        console.log('1. Cambiar MONGODB_URI en .env:');
        console.log(`   MONGO_URI="${resultadoDirecto.uri}"`);
        console.log('2. Usar estas opciones en connectToMongoDB():');
        console.log(JSON.stringify(resultadoDirecto.opciones, null, 2));
        
    } else if (resultadoSRV.exito) {
        console.log('✅ SOLUCIÓN ENCONTRADA: Conexión SRV alternativa');
        console.log(`   Tiempo total: ${resultadoSRV.tiempo}ms`);
        console.log('\n🔧 ACTUALIZAR server.js:');
        console.log('1. Mantener URI SRV original en .env');
        console.log('2. Usar estas opciones en connectToMongoDB():');
        console.log(JSON.stringify(resultadoSRV.opciones, null, 2));
        
    } else {
        console.log('❌ NINGUNA SOLUCIÓN FUNCIONÓ');
        console.log('\n🔧 PASOS ADICIONALES:');
        console.log('1. Verificar IP en MongoDB Atlas Network Access');
        console.log('2. Verificar que el cluster no esté pausado');
        console.log('3. Regenerar credenciales de usuario');
        console.log('4. Contactar soporte de MongoDB Atlas');
    }
}

// Ejecutar pruebas
ejecutarPruebasCompletas().catch(console.error);
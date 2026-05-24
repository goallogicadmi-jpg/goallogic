const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI;
const DB_NAME = 'futbol_analytics';

console.log('🔍 DIAGNÓSTICO COMPLETO DE CONEXIÓN MONGODB');
console.log('='.repeat(50));
console.log('🔍 Node.js version:', process.version);
console.log('🔍 MongoDB URI (sin credenciales):', MONGODB_URI?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
console.log('🔍 Base de datos objetivo:', DB_NAME);
console.log('');

// Configuraciones TLS a probar
const configuraciones = [
    {
        nombre: 'Configuración Actual (TLS 1.2)',
        opciones: {
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 30000,
            maxPoolSize: 10,
            minPoolSize: 5,
            maxIdleTimeMS: 30000,
            tls: true,
            tlsCAFile: undefined,
            tlsAllowInvalidCertificates: false,
            tlsAllowInvalidHostnames: false,
            secureProtocol: 'TLSv1_2_method'
        }
    },
    {
        nombre: 'Configuración TLS 1.3',
        opciones: {
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 30000,
            maxPoolSize: 10,
            minPoolSize: 5,
            maxIdleTimeMS: 30000,
            tls: true,
            tlsCAFile: undefined,
            tlsAllowInvalidCertificates: false,
            tlsAllowInvalidHostnames: false,
            secureProtocol: 'TLSv1_3_method'
        }
    },
    {
        nombre: 'Configuración Simplificada (sin secureProtocol)',
        opciones: {
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 30000,
            maxPoolSize: 10,
            minPoolSize: 5,
            maxIdleTimeMS: 30000,
            tls: true,
            tlsAllowInvalidCertificates: false,
            tlsAllowInvalidHostnames: false
        }
    },
    {
        nombre: 'Configuración Mínima',
        opciones: {
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000,
            socketTimeoutMS: 15000,
            tls: true
        }
    },
    {
        nombre: 'Configuración con SSL Legacy',
        opciones: {
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 30000,
            ssl: true,
            sslValidate: true
        }
    }
];

async function probarConfiguracion(config) {
    console.log(`\n🧪 PROBANDO: ${config.nombre}`);
    console.log('-'.repeat(40));
    console.log('📋 Opciones:', JSON.stringify(config.opciones, null, 2));
    
    try {
        const client = new MongoClient(MONGODB_URI, config.opciones);
        
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
        const collections = await db.listCollections().toArray();
        
        console.log(`✅ Base de datos accesible. Colecciones encontradas: ${collections.length}`);
        if (collections.length > 0) {
            console.log('📋 Colecciones:', collections.map(c => c.name).join(', '));
        }
        
        await client.close();
        console.log('✅ Conexión cerrada correctamente');
        
        return {
            exito: true,
            tiempoConexion: connectTime,
            tiempoPing: pingTime,
            colecciones: collections.length
        };
        
    } catch (error) {
        console.log('❌ Error:', error.message);
        console.log('❌ Código:', error.code);
        console.log('❌ Nombre:', error.name);
        
        // Diagnóstico específico del error
        if (error.message.includes('SSL') || error.message.includes('TLS')) {
            console.log('💡 Error TLS/SSL detectado');
        }
        if (error.message.includes('ENOTFOUND')) {
            console.log('💡 Error DNS - cluster no encontrado');
        }
        if (error.message.includes('ECONNREFUSED')) {
            console.log('💡 Error de conexión - puerto cerrado o firewall');
        }
        if (error.message.includes('Authentication')) {
            console.log('💡 Error de autenticación - credenciales incorrectas');
        }
        if (error.message.includes('timeout')) {
            console.log('💡 Error de timeout - conexión muy lenta o bloqueada');
        }
        
        return {
            exito: false,
            error: error.message,
            codigo: error.code,
            nombre: error.name
        };
    }
}

async function ejecutarDiagnostico() {
    if (!MONGODB_URI) {
        console.log('❌ MONGO_URI no está definida en .env');
        return;
    }
    
    const resultados = [];
    
    for (const config of configuraciones) {
        const resultado = await probarConfiguracion(config);
        resultados.push({
            configuracion: config.nombre,
            ...resultado
        });
        
        // Pausa entre pruebas
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE RESULTADOS');
    console.log('='.repeat(50));
    
    const exitosas = resultados.filter(r => r.exito);
    const fallidas = resultados.filter(r => !r.exito);
    
    console.log(`✅ Configuraciones exitosas: ${exitosas.length}/${resultados.length}`);
    console.log(`❌ Configuraciones fallidas: ${fallidas.length}/${resultados.length}`);
    
    if (exitosas.length > 0) {
        console.log('\n🏆 CONFIGURACIONES EXITOSAS:');
        exitosas.forEach(r => {
            console.log(`  ✅ ${r.configuracion}`);
            console.log(`     - Tiempo conexión: ${r.tiempoConexion}ms`);
            console.log(`     - Tiempo ping: ${r.tiempoPing}ms`);
            console.log(`     - Colecciones: ${r.colecciones}`);
        });
        
        // Recomendar la mejor configuración
        const mejor = exitosas.reduce((prev, current) => 
            (prev.tiempoConexion + prev.tiempoPing) < (current.tiempoConexion + current.tiempoPing) ? prev : current
        );
        
        console.log(`\n🎯 CONFIGURACIÓN RECOMENDADA: ${mejor.configuracion}`);
        console.log(`   Tiempo total: ${mejor.tiempoConexion + mejor.tiempoPing}ms`);
    }
    
    if (fallidas.length > 0) {
        console.log('\n❌ CONFIGURACIONES FALLIDAS:');
        fallidas.forEach(r => {
            console.log(`  ❌ ${r.configuracion}: ${r.error}`);
        });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🔧 RECOMENDACIONES:');
    
    if (exitosas.length === 0) {
        console.log('❌ Ninguna configuración funcionó. Posibles causas:');
        console.log('   1. IP no autorizada en MongoDB Atlas');
        console.log('   2. Credenciales incorrectas');
        console.log('   3. Cluster en mantenimiento');
        console.log('   4. Problema de red/firewall');
        console.log('   5. Incompatibilidad TLS con Node.js 24');
    } else {
        console.log('✅ Se encontraron configuraciones funcionales');
        console.log('   Actualiza server.js con la configuración recomendada');
    }
}

// Ejecutar diagnóstico
ejecutarDiagnostico().catch(console.error);
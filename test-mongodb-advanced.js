const { MongoClient } = require('mongodb');
const https = require('https');
const dns = require('dns');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI;

console.log('🔍 DIAGNÓSTICO AVANZADO DE MONGODB');
console.log('='.repeat(50));

// Extraer información de la URI
function parseMongoURI(uri) {
    const match = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)/);
    if (match) {
        return {
            username: match[1],
            password: match[2],
            host: match[3],
            database: match[4].split('?')[0],
            params: match[4].split('?')[1] || ''
        };
    }
    return null;
}

async function verificarDNS() {
    console.log('\n🔍 VERIFICANDO RESOLUCIÓN DNS');
    console.log('-'.repeat(30));
    
    const uriInfo = parseMongoURI(MONGODB_URI);
    if (!uriInfo) {
        console.log('❌ No se pudo parsear la URI');
        return false;
    }
    
    try {
        const addresses = await new Promise((resolve, reject) => {
            dns.resolve(uriInfo.host, (err, addresses) => {
                if (err) reject(err);
                else resolve(addresses);
            });
        });
        
        console.log(`✅ DNS resuelto para ${uriInfo.host}:`);
        addresses.forEach(addr => console.log(`   - ${addr}`));
        return true;
    } catch (error) {
        console.log(`❌ Error DNS: ${error.message}`);
        return false;
    }
}

async function verificarConectividad() {
    console.log('\n🔍 VERIFICANDO CONECTIVIDAD HTTPS');
    console.log('-'.repeat(30));
    
    return new Promise((resolve) => {
        const req = https.request('https://cloud.mongodb.com', { timeout: 10000 }, (res) => {
            console.log(`✅ Conectividad HTTPS: ${res.statusCode}`);
            resolve(true);
        });
        
        req.on('error', (error) => {
            console.log(`❌ Error HTTPS: ${error.message}`);
            resolve(false);
        });
        
        req.on('timeout', () => {
            console.log('❌ Timeout HTTPS');
            req.destroy();
            resolve(false);
        });
        
        req.end();
    });
}

async function probarConfiguracionesAvanzadas() {
    console.log('\n🔍 PROBANDO CONFIGURACIONES AVANZADAS');
    console.log('-'.repeat(30));
    
    const configuraciones = [
        {
            nombre: 'Sin TLS (inseguro - solo prueba)',
            opciones: {
                serverSelectionTimeoutMS: 15000,
                connectTimeoutMS: 15000,
                socketTimeoutMS: 15000,
                tls: false,
                ssl: false
            }
        },
        {
            nombre: 'TLS con certificados del sistema',
            opciones: {
                serverSelectionTimeoutMS: 30000,
                connectTimeoutMS: 30000,
                socketTimeoutMS: 30000,
                tls: true,
                tlsInsecure: false,
                tlsAllowInvalidCertificates: false,
                tlsAllowInvalidHostnames: false,
                ca: undefined // Usar certificados del sistema
            }
        },
        {
            nombre: 'TLS permisivo (certificados inválidos)',
            opciones: {
                serverSelectionTimeoutMS: 30000,
                connectTimeoutMS: 30000,
                socketTimeoutMS: 30000,
                tls: true,
                tlsInsecure: true,
                tlsAllowInvalidCertificates: true,
                tlsAllowInvalidHostnames: true
            }
        },
        {
            nombre: 'Configuración Node.js 24 específica',
            opciones: {
                serverSelectionTimeoutMS: 30000,
                connectTimeoutMS: 30000,
                socketTimeoutMS: 30000,
                tls: true,
                tlsAllowInvalidCertificates: false,
                tlsAllowInvalidHostnames: false,
                // Configuración específica para Node.js 24
                minVersion: 'TLSv1.2',
                maxVersion: 'TLSv1.3',
                ciphers: 'ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS'
            }
        },
        {
            nombre: 'URI modificada sin SRV',
            uri: MONGODB_URI.replace('mongodb+srv://', 'mongodb://').replace(':27017', ''),
            opciones: {
                serverSelectionTimeoutMS: 30000,
                connectTimeoutMS: 30000,
                socketTimeoutMS: 30000,
                tls: true,
                tlsAllowInvalidCertificates: false,
                tlsAllowInvalidHostnames: false
            }
        }
    ];
    
    for (const config of configuraciones) {
        console.log(`\n🧪 ${config.nombre}`);
        
        try {
            const uri = config.uri || MONGODB_URI;
            const client = new MongoClient(uri, config.opciones);
            
            console.log('🔄 Conectando...');
            const startTime = Date.now();
            
            await client.connect();
            const connectTime = Date.now() - startTime;
            
            console.log(`✅ Conexión exitosa en ${connectTime}ms`);
            
            // Probar ping
            await client.db("admin").command({ ping: 1 });
            console.log('✅ Ping exitoso');
            
            await client.close();
            console.log('✅ Configuración funcional encontrada!');
            
            return {
                exito: true,
                configuracion: config,
                tiempo: connectTime
            };
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
            
            // Análisis específico del error
            if (error.message.includes('SSL alert number 80')) {
                console.log('💡 SSL Alert 80: Error interno del servidor TLS');
                console.log('   Posibles causas:');
                console.log('   - Versión TLS incompatible');
                console.log('   - Cipher suite no soportado');
                console.log('   - Certificado del servidor problemático');
            }
        }
        
        // Pausa entre pruebas
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return { exito: false };
}

async function verificarIPPublica() {
    console.log('\n🔍 VERIFICANDO IP PÚBLICA');
    console.log('-'.repeat(30));
    
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        console.log(`🌐 IP pública actual: ${data.ip}`);
        console.log('💡 Verifica que esta IP esté autorizada en MongoDB Atlas');
        console.log('💡 O agrega 0.0.0.0/0 para permitir todas las IPs (menos seguro)');
        return data.ip;
    } catch (error) {
        console.log(`❌ No se pudo obtener IP pública: ${error.message}`);
        return null;
    }
}

async function ejecutarDiagnosticoCompleto() {
    console.log('🚀 Iniciando diagnóstico completo...\n');
    
    // 1. Verificar DNS
    const dnsOk = await verificarDNS();
    
    // 2. Verificar conectividad general
    const httpsOk = await verificarConectividad();
    
    // 3. Verificar IP pública
    const ip = await verificarIPPublica();
    
    // 4. Probar configuraciones avanzadas
    const resultado = await probarConfiguracionesAvanzadas();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 DIAGNÓSTICO COMPLETO');
    console.log('='.repeat(50));
    console.log(`🔍 DNS: ${dnsOk ? '✅' : '❌'}`);
    console.log(`🔍 HTTPS: ${httpsOk ? '✅' : '❌'}`);
    console.log(`🔍 IP Pública: ${ip || '❌'}`);
    console.log(`🔍 Conexión MongoDB: ${resultado.exito ? '✅' : '❌'}`);
    
    if (resultado.exito) {
        console.log('\n🎯 CONFIGURACIÓN EXITOSA ENCONTRADA:');
        console.log(`   Nombre: ${resultado.configuracion.nombre}`);
        console.log(`   Tiempo: ${resultado.tiempo}ms`);
        console.log('\n📋 Opciones a usar en server.js:');
        console.log(JSON.stringify(resultado.configuracion.opciones, null, 2));
        
        if (resultado.configuracion.uri) {
            console.log('\n📋 URI modificada:');
            console.log(resultado.configuracion.uri);
        }
    } else {
        console.log('\n❌ NINGUNA CONFIGURACIÓN FUNCIONÓ');
        console.log('\n🔧 PASOS RECOMENDADOS:');
        console.log('1. Verificar IP en MongoDB Atlas Network Access');
        console.log('2. Regenerar cadena de conexión desde Atlas');
        console.log('3. Verificar estado del cluster');
        console.log('4. Considerar downgrade temporal de Node.js');
        console.log('5. Contactar soporte de MongoDB Atlas');
    }
}

// Ejecutar diagnóstico completo
ejecutarDiagnosticoCompleto().catch(console.error);
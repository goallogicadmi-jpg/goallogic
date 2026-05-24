const dns = require('dns');
const https = require('https');

console.log('🔍 VERIFICANDO ESTADO DEL CLUSTER MONGODB');
console.log('='.repeat(50));

const clusterHost = 'cluster0.qbtoigw.mongodb.net';

async function verificarDNSDetallado() {
    console.log('\n🔍 VERIFICACIÓN DNS DETALLADA');
    console.log('-'.repeat(30));
    
    // Probar diferentes tipos de registros DNS
    const tiposRegistros = ['A', 'AAAA', 'CNAME', 'TXT', 'SRV'];
    
    for (const tipo of tiposRegistros) {
        try {
            const resultado = await new Promise((resolve, reject) => {
                const metodo = `resolve${tipo === 'A' ? '' : tipo}`;
                dns[metodo](clusterHost, (err, records) => {
                    if (err) reject(err);
                    else resolve(records);
                });
            });
            
            console.log(`✅ ${tipo}: ${JSON.stringify(resultado)}`);
        } catch (error) {
            console.log(`❌ ${tipo}: ${error.code || error.message}`);
        }
    }
}

async function verificarSRVRecord() {
    console.log('\n🔍 VERIFICANDO REGISTRO SRV (MongoDB+SRV)');
    console.log('-'.repeat(30));
    
    const srvHost = `_mongodb._tcp.${clusterHost}`;
    
    try {
        const records = await new Promise((resolve, reject) => {
            dns.resolveSrv(srvHost, (err, records) => {
                if (err) reject(err);
                else resolve(records);
            });
        });
        
        console.log('✅ Registros SRV encontrados:');
        records.forEach(record => {
            console.log(`   - ${record.name}:${record.port} (priority: ${record.priority}, weight: ${record.weight})`);
        });
        
        return records;
    } catch (error) {
        console.log(`❌ Error SRV: ${error.code || error.message}`);
        return null;
    }
}

async function probarServidoresDNSAlternativos() {
    console.log('\n🔍 PROBANDO SERVIDORES DNS ALTERNATIVOS');
    console.log('-'.repeat(30));
    
    const servidoresDNS = [
        '8.8.8.8',      // Google
        '8.8.4.4',      // Google
        '1.1.1.1',      // Cloudflare
        '1.0.0.1',      // Cloudflare
        '208.67.222.222', // OpenDNS
        '208.67.220.220'  // OpenDNS
    ];
    
    for (const servidor of servidoresDNS) {
        try {
            // Configurar resolver personalizado
            const resolver = new dns.Resolver();
            resolver.setServers([servidor]);
            
            const resultado = await new Promise((resolve, reject) => {
                resolver.resolve4(clusterHost, (err, addresses) => {
                    if (err) reject(err);
                    else resolve(addresses);
                });
            });
            
            console.log(`✅ ${servidor}: ${resultado.join(', ')}`);
            return resultado;
        } catch (error) {
            console.log(`❌ ${servidor}: ${error.code || error.message}`);
        }
    }
    
    return null;
}

async function verificarConectividadDirecta() {
    console.log('\n🔍 VERIFICANDO CONECTIVIDAD DIRECTA');
    console.log('-'.repeat(30));
    
    // Intentar conectar directamente a MongoDB Atlas API
    const atlasEndpoints = [
        'https://cloud.mongodb.com',
        'https://account.mongodb.com',
        'https://realm.mongodb.com'
    ];
    
    for (const endpoint of atlasEndpoints) {
        try {
            const resultado = await new Promise((resolve, reject) => {
                const req = https.request(endpoint, { timeout: 10000 }, (res) => {
                    resolve({ status: res.statusCode, headers: res.headers });
                });
                
                req.on('error', reject);
                req.on('timeout', () => {
                    req.destroy();
                    reject(new Error('Timeout'));
                });
                
                req.end();
            });
            
            console.log(`✅ ${endpoint}: ${resultado.status}`);
        } catch (error) {
            console.log(`❌ ${endpoint}: ${error.message}`);
        }
    }
}

async function generarNuevaURI() {
    console.log('\n🔍 GENERANDO NUEVA URI DE CONEXIÓN');
    console.log('-'.repeat(30));
    
    console.log('📋 Para generar una nueva URI de conexión:');
    console.log('1. Ve a https://cloud.mongodb.com');
    console.log('2. Inicia sesión en tu cuenta');
    console.log('3. Selecciona tu proyecto');
    console.log('4. Ve a "Database" > "Connect"');
    console.log('5. Selecciona "Connect your application"');
    console.log('6. Copia la nueva cadena de conexión');
    console.log('');
    console.log('🔧 Verifica también:');
    console.log('- Estado del cluster (puede estar pausado)');
    console.log('- Network Access (IP whitelist)');
    console.log('- Database Access (usuario y contraseña)');
    console.log('');
    console.log('💡 URI actual problemática:');
    console.log('mongodb+srv://brayan98cortes_db_user:***@cluster0.qbtoigw.mongodb.net/futbol_analytics');
    console.log('');
    console.log('🎯 Formato esperado de nueva URI:');
    console.log('mongodb+srv://usuario:password@cluster0.XXXXX.mongodb.net/database');
}

async function ejecutarVerificacionCompleta() {
    console.log('🚀 Iniciando verificación del cluster...\n');
    
    // 1. DNS detallado
    await verificarDNSDetallado();
    
    // 2. Registro SRV
    const srvRecords = await verificarSRVRecord();
    
    // 3. DNS alternativos
    const dnsAlternativo = await probarServidoresDNSAlternativos();
    
    // 4. Conectividad directa
    await verificarConectividadDirecta();
    
    // 5. Instrucciones para nueva URI
    await generarNuevaURI();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 DIAGNÓSTICO DEL CLUSTER');
    console.log('='.repeat(50));
    
    if (srvRecords && srvRecords.length > 0) {
        console.log('✅ El cluster existe y tiene registros SRV');
        console.log('💡 El problema puede ser de conectividad o configuración TLS');
    } else if (dnsAlternativo) {
        console.log('✅ El cluster se resuelve con DNS alternativos');
        console.log('💡 Problema con el DNS local - cambiar configuración DNS');
    } else {
        console.log('❌ El cluster no se puede resolver');
        console.log('💡 Posibles causas:');
        console.log('   - Cluster pausado o eliminado');
        console.log('   - Cambio en la dirección del cluster');
        console.log('   - Problema temporal de MongoDB Atlas');
        console.log('');
        console.log('🔧 ACCIÓN REQUERIDA:');
        console.log('   Generar nueva cadena de conexión desde MongoDB Atlas');
    }
}

// Ejecutar verificación
ejecutarVerificacionCompleta().catch(console.error);
/**
 * Script de prueba para diagnosticar el endpoint de noticias
 * Ejecutar con: node test-news-api.js
 */

const axios = require('axios');
require('dotenv').config();

const apiHeaders = {
    "x-apisports-key": process.env.API_KEY
};

const ligasPrincipales = [39, 140, 135, 78, 61, 2]; // Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, UEFA Champions League

console.log("=".repeat(80));
console.log("🔍 DIAGNÓSTICO DEL ENDPOINT DE NOTICIAS");
console.log("=".repeat(80));
console.log("\n");

// Verificar API_KEY
console.log("1️⃣ VERIFICANDO API_KEY");
console.log("-".repeat(80));
if (!process.env.API_KEY) {
    console.error("❌ ERROR: API_KEY no está definida en process.env");
    console.error("❌ Verifica que el archivo .env existe y contiene: API_KEY=tu_clave_real");
    process.exit(1);
}
console.log("✅ API_KEY encontrada");
console.log(`✅ API_KEY (primeros 10 caracteres): ${process.env.API_KEY.substring(0, 10)}...`);
console.log(`✅ API_KEY length: ${process.env.API_KEY.length}`);
console.log("\n");

// Prueba 1: Endpoint sin parámetros
console.log("2️⃣ PRUEBA 1: Endpoint SIN parámetros");
console.log("-".repeat(80));
console.log("🔄 URL que se solicitará: https://v3.football.api-sports.io/news");
console.log("🔄 Headers:", { "x-apisports-key": `${process.env.API_KEY.substring(0, 10)}...` });
console.log("\n");

(async () => {
    try {
        const response = await axios.get("https://v3.football.api-sports.io/news", { 
            headers: apiHeaders 
        });
        
        console.log("✅ Status Code:", response.status);
        console.log("✅ Status Text:", response.statusText);
        console.log("✅ Headers de respuesta:", JSON.stringify(response.headers, null, 2));
        console.log("\n");
        console.log("✅ Respuesta completa de la API:");
        console.log(JSON.stringify(response.data, null, 2));
        console.log("\n");
        console.log("✅ Análisis de la respuesta:");
        console.log("   - Tiene 'response'?:", !!response.data?.response);
        console.log("   - Tipo de 'response':", typeof response.data?.response);
        console.log("   - Es array?:", Array.isArray(response.data?.response));
        console.log("   - Cantidad de noticias:", response.data?.response?.length || 0);
        console.log("   - Keys del objeto data:", Object.keys(response.data || {}));
        
    } catch (error) {
        console.error("❌ ERROR en Prueba 1:");
        console.error("   - Status Code:", error.response?.status || "N/A");
        console.error("   - Status Text:", error.response?.statusText || "N/A");
        console.error("   - Mensaje de error:", error.message);
        console.error("   - Error completo:", JSON.stringify(error.response?.data || error.message, null, 2));
        console.error("   - Headers de error:", JSON.stringify(error.response?.headers || {}, null, 2));
    }
    
    console.log("\n");
    console.log("=".repeat(80));
    console.log("3️⃣ PRUEBA 2: Endpoint CON parámetros (ligas principales)");
    console.log("=".repeat(80));
    console.log("\n");
    
    // Prueba 2: Endpoint con parámetros de ligas principales
    for (const leagueId of ligasPrincipales) {
        console.log(`\n🔄 Probando liga ${leagueId}...`);
        console.log("-".repeat(80));
        const url = `https://v3.football.api-sports.io/news?league=${leagueId}`;
        console.log(`🔄 URL solicitada: ${url}`);
        
        try {
            const response = await axios.get(url, { headers: apiHeaders });
            
            console.log(`✅ Status Code: ${response.status}`);
            console.log(`✅ Respuesta completa:`);
            console.log(JSON.stringify(response.data, null, 2));
            console.log(`✅ Tiene 'response'?: ${!!response.data?.response}`);
            console.log(`✅ Es array?: ${Array.isArray(response.data?.response)}`);
            console.log(`✅ Cantidad de noticias: ${response.data?.response?.length || 0}`);
            
            if (response.data?.response && Array.isArray(response.data.response) && response.data.response.length > 0) {
                console.log(`✅ ✅ ✅ ÉXITO: Se encontraron ${response.data.response.length} noticias para la liga ${leagueId}`);
                console.log(`✅ Primera noticia:`, JSON.stringify(response.data.response[0], null, 2));
                break; // Si encontramos noticias, podemos parar
            } else {
                console.log(`⚠️ La liga ${leagueId} no devolvió noticias`);
            }
            
        } catch (error) {
            console.error(`❌ ERROR con liga ${leagueId}:`);
            console.error(`   - Status Code: ${error.response?.status || "N/A"}`);
            console.error(`   - Status Text: ${error.response?.statusText || "N/A"}`);
            console.error(`   - Mensaje: ${error.message}`);
            console.error(`   - Error data:`, JSON.stringify(error.response?.data || {}, null, 2));
        }
        
        // Esperar 1 segundo entre solicitudes para no exceder límites
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("\n");
    console.log("=".repeat(80));
    console.log("✅ DIAGNÓSTICO COMPLETADO");
    console.log("=".repeat(80));
    console.log("\n");
    console.log("📋 RESUMEN:");
    console.log("   - Revisa los logs arriba para ver:");
    console.log("     1. Si el endpoint /news existe (status 200 vs 404)");
    console.log("     2. Si requiere parámetros obligatorios (status 400)");
    console.log("     3. Si hay límites de rate (status 429)");
    console.log("     4. Si devuelve datos pero vacíos (status 200 con array vacío)");
    console.log("     5. La estructura exacta de la respuesta");
    console.log("\n");
    console.log("📤 COPIA Y PEGA TODOS LOS LOGS ARRIBA PARA ENVIARLOS AL DESARROLLADOR");
    console.log("=".repeat(80));
})();

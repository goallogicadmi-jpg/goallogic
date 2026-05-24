# 📋 INSTRUCCIONES PARA INSTALAR NODE.JS 20 LTS

## 🔍 PROBLEMA IDENTIFICADO

- **Versión actual:** Node.js v24.12.0
- **Problema:** MongoDB Atlas no es compatible con Node.js 22+ (incluyendo Node 24)
- **Error:** `MongoServerSelectionError: SSL routines: tlsv1 alert internal error`
- **Solución:** Instalar Node.js 20 LTS (versión recomendada por MongoDB)

## 📥 INSTALACIÓN DE NODE.JS 20 LTS

### Opción 1: Usando NVM (Node Version Manager) - RECOMENDADO

**Windows (usando nvm-windows):**

1. **Instalar nvm-windows** (si no lo tienes):
   - Descargar desde: https://github.com/coreybutler/nvm-windows/releases
   - Instalar `nvm-setup.exe`

2. **Instalar Node.js 20 LTS:**
   ```powershell
   nvm install 20.18.0
   nvm use 20.18.0
   ```

3. **Verificar instalación:**
   ```powershell
   node --version
   # Debería mostrar: v20.18.0
   ```

### Opción 2: Instalación directa desde nodejs.org

1. **Descargar Node.js 20 LTS:**
   - Ir a: https://nodejs.org/
   - Descargar la versión LTS (20.x.x) para Windows
   - Ejecutar el instalador

2. **Verificar instalación:**
   ```powershell
   node --version
   # Debería mostrar: v20.x.x
   ```

## 🔄 PASOS DESPUÉS DE INSTALAR NODE 20

1. **Reiniciar el servidor:**
   ```powershell
   node server.js
   ```

2. **Verificar conexión a MongoDB:**
   - Deberías ver: `✅ Conectado a MongoDB Atlas`
   - Si aparece el error SSL, verifica que estés usando Node 20

3. **Ejecutar las pruebas:**
   ```powershell
   node test-debug-backend.js
   ```

4. **Revisar los logs:**
   - Archivo: `logs-equipos-detalle.txt`
   - O consola del servidor

## ⚠️ NOTA IMPORTANTE

El endpoint `/api/equipos/:id/detalle` **NO usa MongoDB directamente**, solo hace llamadas a API-Football. Por lo tanto, **debería funcionar incluso si MongoDB falla**.

Sin embargo, para que el servidor funcione completamente y evitar problemas futuros, es recomendable instalar Node 20 LTS.

## 🔍 VERIFICACIÓN RÁPIDA

Si el servidor ya está corriendo en modo degradado (sin MongoDB), puedes probar el endpoint directamente:

```powershell
# Probar el endpoint
node test-debug-backend.js
```

Si funciona, los logs deberían generarse correctamente.

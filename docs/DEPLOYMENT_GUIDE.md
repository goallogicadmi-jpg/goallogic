# Guía de Despliegue - Motor de Predicciones

## Requisitos Previos

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# API Key de API-Football (requerida)
API_KEY=tu_clave_api_football

# Puerto del servidor (opcional, default: 3000)
PORT=3000

# MongoDB URI (opcional, para funcionalidades adicionales)
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/database

# Redis (opcional, para cache distribuido)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Dependencias

El proyecto requiere Node.js 14+ y npm.

**Dependencias principales:**
- `express` - Framework web
- `axios` - Cliente HTTP
- `compression` - Compresión de respuestas
- `cors` - CORS middleware
- `dotenv` - Variables de entorno
- `mongodb` - Base de datos (opcional)

---

## Instalación

### 1. Clonar o Descargar el Proyecto

```bash
git clone <repository-url>
cd proyecto
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env` (si existe) o crea uno nuevo:

```bash
cp .env.example .env
# Edita .env con tus valores
```

**Variable crítica:**
- `API_KEY`: Debe ser una clave válida de API-Football

---

## Scripts Disponibles

### Desarrollo

```bash
npm run dev
```
Inicia el servidor con nodemon (reinicio automático en cambios).

### Producción

```bash
npm start
```
Inicia el servidor en modo producción.

### Tests

```bash
npm test
```
Ejecuta tests unitarios del motor de predicciones.

### Análisis de Precisión

```bash
npm run analyze:predictions [leagueId] [season] [limit]
```
Ejecuta análisis de precisión del modelo.

**Ejemplo:**
```bash
npm run analyze:predictions 39 2024 20
```

---

## Despliegue

### Opción 1: Servidor Dedicado (VPS/Cloud)

#### 1. Preparar el Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version
npm --version
```

#### 2. Clonar y Configurar

```bash
# Clonar proyecto
git clone <repository-url>
cd proyecto

# Instalar dependencias
npm install --production

# Configurar .env
nano .env
```

#### 3. Usar PM2 (Recomendado)

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar aplicación
pm2 start server.js --name "goallogic-predictions"

# Configurar inicio automático
pm2 startup
pm2 save
```

#### 4. Configurar Nginx (Opcional)

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Opción 2: Docker (Recomendado para Producción)

#### 1. Crear Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

#### 2. Construir y Ejecutar

```bash
# Construir imagen
docker build -t goallogic-predictions .

# Ejecutar contenedor
docker run -d \
  --name goallogic-predictions \
  -p 3000:3000 \
  --env-file .env \
  goallogic-predictions
```

### Opción 3: Plataformas Cloud

#### Heroku

```bash
# Instalar Heroku CLI
# Crear app
heroku create goallogic-predictions

# Configurar variables
heroku config:set API_KEY=tu_clave

# Desplegar
git push heroku main
```

#### Railway

1. Conectar repositorio
2. Configurar variables de entorno
3. Deploy automático

#### Vercel / Netlify

No recomendado para aplicaciones con backend completo. Usar solo para frontend.

---

## Recomendaciones de Rendimiento

### Cache

El sistema incluye cache en memoria por defecto. Para mejor rendimiento:

1. **Activar Redis (Opcional):**
   ```env
   REDIS_ENABLED=true
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

2. **TTL de Cache:**
   - Promedios de liga: 10 minutos
   - Estadísticas de equipos: 5 minutos
   - Fixtures: 5 minutos

### Optimizaciones

1. **Compresión:** Ya activada (gzip)
2. **Límite de Payloads:** Configurado a 10MB
3. **Cache de Matrices Poisson:** Implementado

### Monitoreo

1. **Logs:** Revisar logs del servidor regularmente
2. **Análisis de Precisión:** Ejecutar semanalmente
3. **Métricas de Cache:** Monitorear hit rate

---

## Verificación Post-Despliegue

### 1. Verificar que el Servidor Inicia

```bash
curl http://localhost:3000/api/health
```

### 2. Probar Endpoint de Predicciones

```bash
curl "http://localhost:3000/api/predictions?fixtureId=1035092&profile=balanceado"
```

### 3. Verificar Cache

Hacer dos llamadas al mismo endpoint y verificar que la segunda es más rápida (logs mostrarán uso de cache).

### 4. Ejecutar Tests

```bash
npm test
```

---

## Troubleshooting

### Error: API_KEY no configurada

**Solución:** Verificar que el archivo `.env` existe y contiene `API_KEY=tu_clave`.

### Error: Puerto ya en uso

**Solución:** Cambiar `PORT` en `.env` o detener el proceso que usa el puerto.

### Error: Módulos no encontrados

**Solución:** Ejecutar `npm install` nuevamente.

### Respuestas lentas

**Solución:**
1. Verificar que el cache está funcionando
2. Revisar logs para ver llamadas a API
3. Considerar activar Redis para cache distribuido

### Errores de API Externa

**Solución:**
1. Verificar que `API_KEY` es válida
2. Verificar límites de rate de la API
3. Revisar logs para errores específicos

---

## Seguridad

### Variables de Entorno

- ✅ **NUNCA** commitees el archivo `.env` al repositorio
- ✅ Agrega `.env` al `.gitignore`
- ✅ Usa variables de entorno del sistema en producción

### Endpoints

- ✅ Solo endpoints necesarios están expuestos
- ✅ Validación de parámetros en todos los endpoints
- ✅ Manejo de errores sin exponer información sensible

### API Key

- ✅ La API key nunca se expone en respuestas
- ✅ Solo se usa en headers de requests a API externa

---

## Mantenimiento

### Actualizaciones Regulares

1. **Dependencias:**
   ```bash
   npm update
   ```

2. **Código:**
   ```bash
   git pull
   npm install
   pm2 restart goallogic-predictions
   ```

### Limpieza de Cache

El cache se limpia automáticamente, pero puedes limpiarlo manualmente si es necesario (reiniciar servidor).

### Logs

Los logs se muestran en consola. Para producción, considera usar un servicio de logging (ej: Winston, Morgan).

---

## Escalabilidad

### Horizontal

Para escalar horizontalmente:

1. Usar cache distribuido (Redis)
2. Load balancer frente a múltiples instancias
3. Compartir cache entre instancias

### Vertical

Para mejorar rendimiento en una sola instancia:

1. Aumentar memoria RAM
2. Activar Redis para cache
3. Optimizar consultas a API

---

## Contacto y Soporte

Para problemas o preguntas sobre el despliegue, consulta la documentación o contacta al equipo de desarrollo.

---

**Última actualización:** $(date)

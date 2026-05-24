# ⚽ GoalLogic - Análisis y Predicciones de Fútbol

Sistema completo de análisis de fútbol con integración a MongoDB Atlas.

## 🚀 Instalación y Configuración

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar MongoDB
1. Copia `.env.example` a `.env`
2. Reemplaza `TU_PASSWORD_AQUI` con tu contraseña real de MongoDB
3. El string de conexión ya está configurado para tu cluster

### 3. Iniciar el servidor
```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

### 4. Acceder a la aplicación
Abre tu navegador en: `http://localhost:3000`

## 📊 Funcionalidades

### Frontend
- ✅ Análisis de partidos con gráficas interactivas
- ✅ Tabla de seguimiento de apuestas editable
- ✅ Búsqueda automática de estadísticas
- ✅ Predicciones y análisis de riesgo
- ✅ Guardado automático en tiempo real

### Backend + MongoDB
- ✅ API REST para tabla de apuestas
- ✅ Guardado automático de tablas de apuestas
- ✅ Base de datos de equipos y estadísticas
- ✅ Fallback a localStorage si MongoDB no está disponible

## 🗄️ Estructura de la Base de Datos

### Colecciones en MongoDB:
- `betting_tables` - Tablas de seguimiento de apuestas
- `teams` - Base de datos de equipos
- `team_stats` - Estadísticas de equipos

## 🔧 API Endpoints

### Tabla de Apuestas
- `POST /api/betting-table` - Guardar tabla
- `GET /api/betting-table/latest` - Obtener última tabla

### Equipos
- `GET /api/teams/search?query=nombre` - Buscar equipos
- `POST /api/teams/stats` - Guardar estadísticas
- `GET /api/teams/stats/:teamName` - Obtener estadísticas

## 🔒 Seguridad

- CORS habilitado para desarrollo
- Validación de datos en el servidor
- Manejo de errores robusto
- Fallback a localStorage

## 📱 Características Técnicas

- **Frontend**: HTML5, CSS3, JavaScript ES6+, Chart.js
- **Backend**: Node.js, Express.js
- **Base de Datos**: MongoDB Atlas
- **Almacenamiento Local**: localStorage (fallback)
- **Responsive**: Diseño adaptable a móviles

## 🎯 Uso

1. **Tabla de Apuestas**: Edita directamente las celdas, se guarda automáticamente en MongoDB
2. **Análisis de Partidos**: Completa el formulario y obtén predicciones (solo se muestran, no se guardan)
3. **Búsqueda Automática**: Ingresa nombres de equipos para análisis rápido
4. **Base de Datos**: Solo la tabla de apuestas se sincroniza con MongoDB

## 🛠️ Desarrollo

Para contribuir al proyecto:

1. Fork el repositorio
2. Crea una rama para tu feature
3. Realiza tus cambios
4. Envía un pull request

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles.

---

**Desarrollado por GoalLogic** 🏆
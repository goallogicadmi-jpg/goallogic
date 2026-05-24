# 🎨 Instrucciones para Procesar el Logo de GoalLogic

## 📋 Pasos para Procesar el Logo

### 1. Colocar el Logo Original
Coloca el archivo del logo oficial en:
```
frontend/src/assets/images/goal-logic-logo.png
```
(o como `logoprincipal.jpg` en la raíz del proyecto)

### 2. Ejecutar el Script de Procesamiento
Desde la raíz del proyecto, ejecuta:
```bash
node process-logo.js
```

El script automáticamente:
- ✅ Recortará el emblema (sin el texto "GoalLogic Pro")
- ✅ Creará el logo para navbar (120px de ancho)
- ✅ Creará el logo completo para página principal (400px de ancho)
- ✅ Generará favicons en 16x16 y 32x32
- ✅ Creará favicon.ico

### 3. Archivos Generados
Después de ejecutar el script, se crearán estos archivos en `frontend/public/`:
- `logo.png` - Logo para navbar
- `logo-emblem.png` - Emblema completo (PNG transparente)
- `logo-full.png` - Logo completo para página principal
- `favicon-16x16.png` - Favicon pequeño
- `favicon-32x32.png` - Favicon mediano
- `favicon.ico` - Favicon para navegadores

### 4. Verificación
Una vez procesado el logo:
1. Inicia la aplicación: `cd frontend && npm start`
2. Verifica que el logo aparezca en la navbar
3. Verifica que el logo completo aparezca en la página principal
4. Verifica que el favicon aparezca en la pestaña del navegador
5. Verifica que el título de la pestaña muestre "GoalLogic"

## 🔧 Ajustes Manuales (si es necesario)

Si el recorte automático no es perfecto, puedes ajustar los valores en `process-logo.js`:
- `emblemHeight`: Altura del emblema (porcentaje de la altura total)
- `faviconSize`: Tamaño del área para el favicon

## 📝 Notas
- El script asume que el emblema está en la parte superior de la imagen
- El texto "GoalLogic Pro" debe estar en la parte inferior
- Si necesitas ajustar el recorte, modifica los valores de `extract()` en el script

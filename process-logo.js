const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function processLogo() {
  // Buscar el logo en varios lugares posibles (priorizando logoprincipal.jpg)
  const possiblePaths = [
    path.join(__dirname, 'frontend', 'src', 'assets', 'images', 'goal-logic-logo.png'),
    path.join(__dirname, 'logoprincipal.jpg'),
    path.join(__dirname, 'logo.jpg'),
    path.join(__dirname, 'frontend', 'build', 'logoprincipal.jpg'),
    path.join(__dirname, 'frontend', 'public', 'logoprincipal.jpg'),
  ];
  
  let inputPath = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      inputPath = possiblePath;
      console.log(`✅ Logo encontrado en: ${possiblePath}`);
      break;
    }
  }
  
  const outputDir = path.join(__dirname, 'frontend', 'public');
  
  // Verificar que el logo existe
  if (!inputPath) {
    console.error('❌ No se encontró logoprincipal.jpg o logo.jpg');
    console.log('📝 Por favor, coloca el logo oficial en uno de estos lugares:');
    console.log('   - logoprincipal.jpg (raíz del proyecto)');
    console.log('   - logo.jpg (raíz del proyecto)');
    process.exit(1);
  }

  console.log('🔄 Procesando logo...');
  
  try {
    // Obtener metadata de la imagen original
    const metadata = await sharp(inputPath).metadata();
    console.log(`📐 Dimensiones originales: ${metadata.width}x${metadata.height}`);
    
    // Calcular recorte: asumimos que el emblema está en la parte superior
    // y ocupa aproximadamente el 60-70% de la altura (sin el texto)
    const emblemHeight = Math.floor(metadata.height * 0.65);
    const emblemWidth = metadata.width;
    
    // 1. Logo principal (emblema completo sin texto, PNG transparente)
    console.log('✂️ Creando logo principal (emblema)...');
    await sharp(inputPath)
      .extract({
        left: 0,
        top: 0,
        width: emblemWidth,
        height: emblemHeight
      })
      .png({ quality: 100 })
      .toFile(path.join(outputDir, 'logo-emblem.png'));
    console.log('✅ Logo principal creado: frontend/public/logo-emblem.png');
    
    // 2. Logo para navbar (versión reducida del emblema)
    console.log('📏 Creando logo para navbar...');
    await sharp(inputPath)
      .extract({
        left: 0,
        top: 0,
        width: emblemWidth,
        height: emblemHeight
      })
      .resize(120, null, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 100 })
      .toFile(path.join(outputDir, 'logo.png'));
    console.log('✅ Logo navbar creado: frontend/public/logo.png');
    
    // 3. Logo completo para página principal (emblema completo)
    console.log('🖼️ Creando logo completo para página principal...');
    await sharp(inputPath)
      .extract({
        left: 0,
        top: 0,
        width: emblemWidth,
        height: emblemHeight
      })
      .resize(400, null, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 100 })
      .toFile(path.join(outputDir, 'logo-full.png'));
    console.log('✅ Logo completo creado: frontend/public/logo-full.png');
    
    // 4. Favicon 32x32 (solo balón + corona - recorte más pequeño del centro)
    console.log('🔖 Creando favicon 32x32...');
    const centerX = Math.floor(emblemWidth / 2);
    const centerY = Math.floor(emblemHeight / 2);
    const faviconSize = Math.min(emblemWidth, emblemHeight) * 0.4; // 40% del tamaño para centrar el balón
    
    await sharp(inputPath)
      .extract({
        left: Math.max(0, centerX - Math.floor(faviconSize / 2)),
        top: Math.max(0, centerY - Math.floor(faviconSize / 2)),
        width: Math.floor(faviconSize),
        height: Math.floor(faviconSize)
      })
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 100 })
      .toFile(path.join(outputDir, 'favicon-32x32.png'));
    console.log('✅ Favicon 32x32 creado: frontend/public/favicon-32x32.png');
    
    // 5. Favicon 16x16
    console.log('🔖 Creando favicon 16x16...');
    await sharp(inputPath)
      .extract({
        left: Math.max(0, centerX - Math.floor(faviconSize / 2)),
        top: Math.max(0, centerY - Math.floor(faviconSize / 2)),
        width: Math.floor(faviconSize),
        height: Math.floor(faviconSize)
      })
      .resize(16, 16, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 100 })
      .toFile(path.join(outputDir, 'favicon-16x16.png'));
    console.log('✅ Favicon 16x16 creado: frontend/public/favicon-16x16.png');
    
    // 6. Crear favicon.ico (usando 32x32)
    console.log('🔖 Creando favicon.ico...');
    await sharp(path.join(outputDir, 'favicon-32x32.png'))
      .resize(32, 32)
      .toFile(path.join(outputDir, 'favicon.ico'));
    console.log('✅ Favicon.ico creado: frontend/public/favicon.ico');
    
    console.log('\n✨ ¡Procesamiento completado!');
    console.log('\n📋 Archivos creados:');
    console.log('  - frontend/public/logo.png (navbar)');
    console.log('  - frontend/public/logo-emblem.png (emblema completo)');
    console.log('  - frontend/public/logo-full.png (página principal)');
    console.log('  - frontend/public/favicon-16x16.png');
    console.log('  - frontend/public/favicon-32x32.png');
    console.log('  - frontend/public/favicon.ico');
    
  } catch (error) {
    console.error('❌ Error procesando el logo:', error);
    process.exit(1);
  }
}

processLogo();

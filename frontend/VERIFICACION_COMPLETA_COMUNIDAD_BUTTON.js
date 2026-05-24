/**
 * SCRIPT DE VERIFICACIÓN COMPLETA DEL BOTÓN DE COMUNIDAD
 * 
 * INSTRUCCIONES:
 * 1. Abrir la aplicación en el navegador
 * 2. Abrir la consola del desarrollador (F12)
 * 3. Copiar y pegar este script completo en la consola
 * 4. Presionar Enter
 * 5. Revisar los resultados
 */

(function() {
  console.log('🔍 ============================================');
  console.log('🔍 VERIFICACIÓN COMPLETA DEL BOTÓN DE COMUNIDAD');
  console.log('🔍 ============================================');
  console.log('');

  // ============================================
  // 1. VERIFICAR LOGS EN CONSOLA
  // ============================================
  console.log('1️⃣ VERIFICACIÓN DE LOGS EN CONSOLA');
  console.log('-----------------------------------');
  
  // Buscar logs recientes (últimos 100 mensajes)
  const logs = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  
  // Nota: No podemos capturar logs pasados, pero podemos verificar el estado actual
  console.log('   ℹ️  Revisa manualmente en la consola los siguientes prefijos:');
  console.log('      - 🔵 [Layout]');
  console.log('      - 🟢 [Layout]');
  console.log('      - 🟡 [ComunidadButton]');
  console.log('');

  // ============================================
  // 2. VERIFICAR EXISTENCIA DEL CONTENEDOR
  // ============================================
  console.log('2️⃣ VERIFICAR EXISTENCIA DEL CONTENEDOR');
  console.log('-----------------------------------');
  
  const container = document.getElementById('comunidad-button-container');
  if (container) {
    console.log('   ✅ Contenedor encontrado:', container);
    console.log('   - ID:', container.id);
    console.log('   - En body:', document.body.contains(container));
    console.log('   - Parent:', container.parentElement?.id || container.parentElement?.className);
    console.log('   - Display:', window.getComputedStyle(container).display);
    console.log('   - Visibility:', window.getComputedStyle(container).visibility);
    console.log('   - Opacity:', window.getComputedStyle(container).opacity);
    console.log('   - Children:', container.children.length);
  } else {
    console.log('   ❌ Contenedor NO encontrado');
    console.log('   ⚠️  Esto indica que el useEffect retornó antes de crear el contenedor');
    console.log('   ⚠️  Posible causa: navContainer no estaba disponible cuando se ejecutó el useEffect');
  }
  console.log('');

  // ============================================
  // 3. VERIFICAR TIMING DEL MONTAJE
  // ============================================
  console.log('3️⃣ VERIFICAR TIMING DEL MONTAJE');
  console.log('-----------------------------------');
  
  const header = document.getElementById('main-header-nav');
  if (header) {
    console.log('   ✅ Header encontrado:', header);
    console.log('   - ID:', header.id);
    console.log('   - En body:', document.body.contains(header));
    console.log('   - Children:', header.children.length);
    console.log('   - Tiene ref:', header.hasAttribute('ref') || 'No se puede verificar directamente');
    
    // Verificar si el contenedor está dentro del header
    const containerInHeader = header.querySelector('#comunidad-button-container');
    if (containerInHeader) {
      console.log('   ✅ Contenedor está dentro del header');
    } else {
      console.log('   ❌ Contenedor NO está dentro del header');
    }
  } else {
    console.log('   ❌ Header NO encontrado');
    console.log('   ⚠️  Esto es crítico: el header no existe en el DOM');
  }
  console.log('');

  // ============================================
  // 4. VERIFICAR SI EL COMPONENTE SE MONTA
  // ============================================
  console.log('4️⃣ VERIFICAR SI EL COMPONENTE SE MONTA');
  console.log('-----------------------------------');
  
  if (container) {
    const button = container.querySelector('button, .comunidad-button, .comunidad-button-wrapper');
    if (button) {
      console.log('   ✅ Botón encontrado:', button);
      console.log('   - Tag:', button.tagName);
      console.log('   - Class:', button.className);
      console.log('   - Text:', button.textContent?.trim().substring(0, 50));
      console.log('   - Display:', window.getComputedStyle(button).display);
      console.log('   - Visibility:', window.getComputedStyle(button).visibility);
      console.log('   - Opacity:', window.getComputedStyle(button).opacity);
      console.log('   - Width:', window.getComputedStyle(button).width);
      console.log('   - Height:', window.getComputedStyle(button).height);
      
      // Verificar si tiene React root
      const hasReactRoot = container._reactRootContainer || container.querySelector('[data-reactroot]');
      if (hasReactRoot) {
        console.log('   ✅ React Root detectado');
      } else {
        console.log('   ⚠️  React Root no detectado (puede ser normal si React 18+)');
      }
    } else {
      console.log('   ❌ Botón NO encontrado dentro del contenedor');
      console.log('   ⚠️  El contenedor existe pero el componente React no se renderizó');
      console.log('   - InnerHTML length:', container.innerHTML.length);
      console.log('   - InnerHTML preview:', container.innerHTML.substring(0, 200));
    }
  } else {
    console.log('   ❌ No se puede verificar: el contenedor no existe');
  }
  console.log('');

  // ============================================
  // 5. VERIFICAR EXISTENCIA DEL HEADER
  // ============================================
  console.log('5️⃣ VERIFICAR EXISTENCIA DEL HEADER');
  console.log('-----------------------------------');
  
  if (header) {
    console.log('   ✅ Header existe en el DOM');
    console.log('   - Existe ahora:', true);
    console.log('   - Nota: Con la corrección usando ref, el header debería estar disponible');
    console.log('     cuando el useEffect se ejecuta');
  } else {
    console.log('   ❌ Header NO existe');
    console.log('   ⚠️  Esto es un problema crítico');
  }
  console.log('');

  // ============================================
  // 6. VERIFICAR SI EL BOTÓN ESTÁ INVISIBLE
  // ============================================
  console.log('6️⃣ VERIFICAR SI EL BOTÓN ESTÁ INVISIBLE');
  console.log('-----------------------------------');
  
  if (container) {
    const button = container.querySelector('button');
    if (button) {
      const styles = window.getComputedStyle(button);
      const display = styles.display;
      const visibility = styles.visibility;
      const opacity = styles.opacity;
      const width = styles.width;
      const height = styles.height;
      
      console.log('   Estilos del botón:');
      console.log('   - Display:', display);
      console.log('   - Visibility:', visibility);
      console.log('   - Opacity:', opacity);
      console.log('   - Width:', width);
      console.log('   - Height:', height);
      
      if (display === 'none') {
        console.log('   ❌ Botón está oculto por display: none');
      } else if (visibility === 'hidden') {
        console.log('   ❌ Botón está oculto por visibility: hidden');
      } else if (opacity === '0') {
        console.log('   ❌ Botón está oculto por opacity: 0');
      } else if (width === '0px' || height === '0px') {
        console.log('   ⚠️  Botón tiene dimensiones cero');
      } else {
        console.log('   ✅ Botón debería ser visible');
      }
    } else {
      console.log('   ❌ No se puede verificar: el botón no existe');
    }
  } else {
    console.log('   ❌ No se puede verificar: el contenedor no existe');
  }
  console.log('');

  // ============================================
  // 7. VERIFICAR RE-RENDERIZADO
  // ============================================
  console.log('7️⃣ VERIFICAR RE-RENDERIZADO');
  console.log('-----------------------------------');
  console.log('   ℹ️  Para verificar esto:');
  console.log('   1. Navega a otra página (ej: /ligas)');
  console.log('   2. Vuelve a ejecutar este script');
  console.log('   3. Compara si el contenedor sigue existiendo');
  console.log('');

  // ============================================
  // RESUMEN FINAL
  // ============================================
  console.log('📊 RESUMEN FINAL');
  console.log('============================================');
  
  const allChecks = {
    containerExists: !!container,
    headerExists: !!header,
    buttonExists: container ? !!container.querySelector('button') : false,
    containerInHeader: header ? !!header.querySelector('#comunidad-button-container') : false
  };
  
  const allPassed = Object.values(allChecks).every(v => v === true);
  
  if (allPassed) {
    console.log('   ✅ TODOS LOS CHECKS PASARON');
    console.log('   El botón de Comunidad debería estar funcionando correctamente');
  } else {
    console.log('   ❌ ALGUNOS CHECKS FALLARON');
    console.log('   Detalles:');
    Object.entries(allChecks).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value ? '✅' : '❌'}`);
    });
    
    if (!allChecks.containerExists) {
      console.log('');
      console.log('   🔍 DIAGNÓSTICO: El contenedor no existe');
      console.log('   💡 SOLUCIÓN: Verificar que el useEffect se ejecuta y encuentra el navContainer');
      console.log('   💡 CON LA CORRECCIÓN: El ref debería estar disponible cuando el useEffect se ejecuta');
    } else if (!allChecks.buttonExists) {
      console.log('');
      console.log('   🔍 DIAGNÓSTICO: El botón no se renderiza');
      console.log('   💡 SOLUCIÓN: Verificar que el root de React se crea y renderiza correctamente');
      console.log('   💡 REVISAR: Logs de 🟢 [Layout] requestAnimationFrame y renderizado');
    }
  }
  
  console.log('');
  console.log('🔍 ============================================');
  console.log('🔍 FIN DE LA VERIFICACIÓN');
  console.log('🔍 ============================================');
})();

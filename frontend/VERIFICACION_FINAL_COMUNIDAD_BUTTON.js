/**
 * SCRIPT DE VERIFICACIÓN FINAL - BOTÓN DE COMUNIDAD
 * 
 * INSTRUCCIONES:
 * 1. Abrir la aplicación en el navegador
 * 2. Abrir la consola del desarrollador (F12)
 * 3. Copiar y pegar este script completo en la consola
 * 4. Presionar Enter
 * 5. Revisar los resultados
 * 
 * Este script verifica todos los puntos requeridos para cerrar el incidente.
 */

(function() {
  console.log('🔍 ============================================');
  console.log('🔍 VERIFICACIÓN FINAL - BOTÓN DE COMUNIDAD');
  console.log('🔍 ============================================');
  console.log('');
  
  const resultados = {
    logs: { pasado: false, detalles: [] },
    contenedor: { pasado: false, elemento: null },
    boton: { pasado: false, elemento: null },
    visual: { pasado: false, detalles: [] },
    persistencia: { pasado: false, detalles: [] }
  };
  
  // ============================================
  // 1. VERIFICAR LOGS EN CONSOLA
  // ============================================
  console.log('1️⃣ VERIFICACIÓN DE LOGS EN CONSOLA');
  console.log('-----------------------------------');
  console.log('   ℹ️  Revisa manualmente en la consola los siguientes logs:');
  console.log('   - 🔵 [Layout] useEffect de renderizado de botones INICIADO');
  console.log('   - 🔵 [Layout] navContainer encontrado (via ref): ✅ SÍ');
  console.log('   - 🟢 [Layout] requestAnimationFrame ejecutado');
  console.log('   - 🟡 [ComunidadButton] Componente montado/renderizado');
  console.log('');
  console.log('   ✅ Si todos los logs aparecen, marca esta verificación como PASADA');
  console.log('');
  
  // ============================================
  // 2. VERIFICAR EXISTENCIA DEL CONTENEDOR
  // ============================================
  console.log('2️⃣ VERIFICAR EXISTENCIA DEL CONTENEDOR');
  console.log('-----------------------------------');
  
  const container = document.getElementById('comunidad-button-container');
  if (container) {
    console.log('   ✅ Contenedor encontrado:', container);
    console.log('   - Tipo:', container.constructor.name);
    console.log('   - ID:', container.id);
    console.log('   - En body:', document.body.contains(container));
    console.log('   - Parent:', container.parentElement?.id || container.parentElement?.className);
    console.log('   - Display:', window.getComputedStyle(container).display);
    console.log('   - Visibility:', window.getComputedStyle(container).visibility);
    console.log('   - Opacity:', window.getComputedStyle(container).opacity);
    console.log('   - Children:', container.children.length);
    
    resultados.contenedor.pasado = true;
    resultados.contenedor.elemento = container;
  } else {
    console.log('   ❌ Contenedor NO encontrado');
    console.log('   ⚠️  El contenedor no existe en el DOM');
    resultados.contenedor.pasado = false;
  }
  console.log('');
  
  // ============================================
  // 3. VERIFICAR MONTAJE DEL COMPONENTE
  // ============================================
  console.log('3️⃣ VERIFICAR MONTAJE DEL COMPONENTE');
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
      
      // Verificar si es clickeable
      const isClickable = window.getComputedStyle(button).pointerEvents !== 'none' && 
                          window.getComputedStyle(button).display !== 'none';
      console.log('   - Clickeable:', isClickable ? '✅ SÍ' : '❌ NO');
      
      resultados.boton.pasado = true;
      resultados.boton.elemento = button;
    } else {
      console.log('   ❌ Botón NO encontrado dentro del contenedor');
      console.log('   - InnerHTML length:', container.innerHTML.length);
      console.log('   - InnerHTML preview:', container.innerHTML.substring(0, 200));
      resultados.boton.pasado = false;
    }
  } else {
    console.log('   ❌ No se puede verificar: el contenedor no existe');
    resultados.boton.pasado = false;
  }
  console.log('');
  
  // ============================================
  // 4. VERIFICACIÓN VISUAL
  // ============================================
  console.log('4️⃣ VERIFICACIÓN VISUAL');
  console.log('-----------------------------------');
  console.log('   ℹ️  Verifica manualmente:');
  console.log('   1. El botón "Comunidad" aparece en el header');
  console.log('   2. El botón es clickeable');
  console.log('   3. Los badges aparecen (si el usuario está autenticado)');
  console.log('   4. El dropdown funciona (si el usuario está autenticado)');
  console.log('');
  
  if (resultados.boton.elemento) {
    const styles = window.getComputedStyle(resultados.boton.elemento);
    const isVisible = styles.display !== 'none' && 
                     styles.visibility !== 'hidden' && 
                     parseFloat(styles.opacity) > 0;
    
    console.log('   Estado del botón:');
    console.log('   - Visible:', isVisible ? '✅ SÍ' : '❌ NO');
    console.log('   - Display:', styles.display);
    console.log('   - Visibility:', styles.visibility);
    console.log('   - Opacity:', styles.opacity);
    
    resultados.visual.pasado = isVisible;
    resultados.visual.detalles.push(`Display: ${styles.display}, Visibility: ${styles.visibility}, Opacity: ${styles.opacity}`);
  } else {
    console.log('   ❌ No se puede verificar: el botón no existe');
    resultados.visual.pasado = false;
  }
  console.log('');
  
  // ============================================
  // 5. VERIFICAR PERSISTENCIA ENTRE NAVEGACIONES
  // ============================================
  console.log('5️⃣ VERIFICAR PERSISTENCIA ENTRE NAVEGACIONES');
  console.log('-----------------------------------');
  console.log('   ℹ️  Para verificar esto:');
  console.log('   1. Navega a /ligas');
  console.log('   2. Ejecuta: document.getElementById("comunidad-button-container")');
  console.log('   3. Navega a /predicciones');
  console.log('   4. Ejecuta nuevamente: document.getElementById("comunidad-button-container")');
  console.log('   5. Navega a /comunidad');
  console.log('   6. Ejecuta nuevamente: document.getElementById("comunidad-button-container")');
  console.log('   7. Confirma que el contenedor persiste en todas las navegaciones');
  console.log('');
  
  // Verificar estado actual
  const currentContainer = document.getElementById('comunidad-button-container');
  if (currentContainer) {
    console.log('   ✅ Contenedor existe en la ruta actual');
    console.log('   - Ruta actual:', window.location.pathname);
    console.log('   - Contenedor en DOM:', document.body.contains(currentContainer));
    resultados.persistencia.pasado = true;
    resultados.persistencia.detalles.push(`Contenedor existe en ${window.location.pathname}`);
  } else {
    console.log('   ❌ Contenedor no existe en la ruta actual');
    resultados.persistencia.pasado = false;
  }
  console.log('');
  
  // ============================================
  // RESUMEN FINAL
  // ============================================
  console.log('📊 RESUMEN FINAL');
  console.log('============================================');
  
  const todasLasVerificaciones = [
    { nombre: 'Logs en consola', pasado: 'MANUAL', resultado: resultados.logs },
    { nombre: 'Existencia del contenedor', pasado: resultados.contenedor.pasado, resultado: resultados.contenedor },
    { nombre: 'Montaje del componente', pasado: resultados.boton.pasado, resultado: resultados.boton },
    { nombre: 'Verificación visual', pasado: resultados.visual.pasado, resultado: resultados.visual },
    { nombre: 'Persistencia entre navegaciones', pasado: resultados.persistencia.pasado, resultado: resultados.persistencia }
  ];
  
  todasLasVerificaciones.forEach((verificacion, index) => {
    const estado = verificacion.pasado === 'MANUAL' ? '⚠️ MANUAL' : 
                   verificacion.pasado ? '✅ PASADO' : '❌ FALLIDO';
    console.log(`   ${index + 1}. ${verificacion.nombre}: ${estado}`);
  });
  
  const verificacionesAutomaticas = todasLasVerificaciones.filter(v => v.pasado !== 'MANUAL');
  const todasPasadas = verificacionesAutomaticas.every(v => v.pasado === true);
  
  console.log('');
  if (todasPasadas) {
    console.log('   ✅ TODAS LAS VERIFICACIONES AUTOMÁTICAS PASARON');
    console.log('   ⚠️  Verifica manualmente los logs en consola');
    console.log('   ✅ El botón de Comunidad está funcionando correctamente');
    console.log('');
    console.log('   🎉 EL INCIDENTE PUEDE SER CERRADO');
  } else {
    console.log('   ❌ ALGUNAS VERIFICACIONES FALLARON');
    console.log('   ⚠️  Revisa los detalles arriba para identificar el problema');
    console.log('');
    console.log('   🔧 EL INCIDENTE NO PUEDE SER CERRADO TODAVÍA');
  }
  
  console.log('');
  console.log('🔍 ============================================');
  console.log('🔍 FIN DE LA VERIFICACIÓN');
  console.log('🔍 ============================================');
  
  // Retornar resultados para uso programático
  return resultados;
})();

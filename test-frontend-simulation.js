/**
 * Simula exactamente el procesamiento del frontend CupCompetitionView
 * para diagnosticar por qué solo se muestra 1 grupo
 */

// Simular estructura que envía el backend (basado en el código)
function simulateBackendResponse() {
  // Estructura que el backend envía según controllers/footballController.js líneas 518-530
  return {
    success: true,
    data: {
      competitionId: 13,
      name: "CONMEBOL Libertadores",
      type: "cup",
      hasGroups: true,
      phase: "groups",
      groups: [
        {
          groupName: "CONMEBOL Libertadores 2025, Group A",
          standings: [
            { team: { id: 1, name: "Equipo A1" }, rank: 1 },
            { team: { id: 2, name: "Equipo A2" }, rank: 2 },
            { team: { id: 3, name: "Equipo A3" }, rank: 3 },
            { team: { id: 4, name: "Equipo A4" }, rank: 4 }
          ],
          teams: [
            { id: 1, name: "Equipo A1" },
            { id: 2, name: "Equipo A2" },
            { id: 3, name: "Equipo A3" },
            { id: 4, name: "Equipo A4" }
          ]
        },
        {
          groupName: "CONMEBOL Libertadores 2025, Group B",
          standings: [
            { team: { id: 5, name: "Equipo B1" }, rank: 1 },
            { team: { id: 6, name: "Equipo B2" }, rank: 2 },
            { team: { id: 7, name: "Equipo B3" }, rank: 3 },
            { team: { id: 8, name: "Equipo B4" }, rank: 4 }
          ],
          teams: [
            { id: 5, name: "Equipo B1" },
            { id: 6, name: "Equipo B2" },
            { id: 7, name: "Equipo B3" },
            { id: 8, name: "Equipo B4" }
          ]
        },
        // Simular un grupo con estructura incorrecta (problema potencial)
        {
          groupName: "CONMEBOL Libertadores 2025, Group C",
          standings: null,  // ❌ PROBLEMA: standings es null
          teams: [
            { id: 9, name: "Equipo C1" },
            { id: 10, name: "Equipo C2" }
          ]
        },
        // Simular un grupo con standings vacío
        {
          groupName: "CONMEBOL Libertadores 2025, Group D",
          standings: [],  // ❌ PROBLEMA: standings está vacío
          teams: []
        },
        // Grupos normales
        {
          groupName: "CONMEBOL Libertadores 2025, Group E",
          standings: [
            { team: { id: 13, name: "Equipo E1" }, rank: 1 },
            { team: { id: 14, name: "Equipo E2" }, rank: 2 }
          ],
          teams: [
            { id: 13, name: "Equipo E1" },
            { id: 14, name: "Equipo E2" }
          ]
        },
        {
          groupName: "CONMEBOL Libertadores 2025, Group F",
          standings: [
            { team: { id: 15, name: "Equipo F1" }, rank: 1 },
            { team: { id: 16, name: "Equipo F2" }, rank: 2 }
          ],
          teams: [
            { id: 15, name: "Equipo F1" },
            { id: 16, name: "Equipo F2" }
          ]
        },
        {
          groupName: "CONMEBOL Libertadores 2025, Group G",
          standings: [
            { team: { id: 17, name: "Equipo G1" }, rank: 1 },
            { team: { id: 18, name: "Equipo G2" }, rank: 2 }
          ],
          teams: [
            { id: 17, name: "Equipo G1" },
            { id: 18, name: "Equipo G2" }
          ]
        },
        {
          groupName: "CONMEBOL Libertadores 2025, Group H",
          standings: [
            { team: { id: 19, name: "Equipo H1" }, rank: 1 },
            { team: { id: 20, name: "Equipo H2" }, rank: 2 }
          ],
          teams: [
            { id: 19, name: "Equipo H1" },
            { id: 20, name: "Equipo H2" }
          ]
        }
      ],
      season: 2025
    }
  };
}

// Simular exactamente el código del frontend (CupCompetitionView.jsx líneas 244-283)
function simulateFrontendProcessing(response) {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 SIMULANDO PROCESAMIENTO DEL FRONTEND');
  console.log('='.repeat(80) + '\n');

  const data = response.data;
  const groups = data.groups;
  const selectedGroup = groups[0]?.groupName || null; // Simular que se selecciona el primer grupo
  const groupData = null; // Simular que no hay datos cargados individualmente

  console.log(`📊 Total grupos recibidos: ${groups.length}`);
  console.log(`📊 Grupo seleccionado: ${selectedGroup}\n`);

  let gruposRenderizables = 0;
  let gruposNoRenderizables = 0;

  // Simular groups.map() exactamente como en el frontend
  groups.forEach((group, index) => {
    const groupName = typeof group === 'string' 
      ? group 
      : (group.groupName || group.name || group.group || `Grupo ${String.fromCharCode(65 + index)}`);
    
    console.log(`\n📊 Procesando grupo ${index + 1}/${groups.length}: "${groupName}"`);
    
    let currentGroupData = null;
    
    // CONDICIÓN 1: Verificar si tiene datos del backend
    const tieneStandings = typeof group === 'object' && group.standings && Array.isArray(group.standings) && group.standings.length > 0;
    
    console.log(`   - Es objeto: ${typeof group === 'object'}`);
    console.log(`   - Tiene standings: ${!!group.standings}`);
    console.log(`   - standings es array: ${Array.isArray(group.standings)}`);
    console.log(`   - standings.length: ${Array.isArray(group.standings) ? group.standings.length : 'N/A'}`);
    console.log(`   - ✅ Condición 1 (tiene datos backend): ${tieneStandings}`);
    
    if (tieneStandings) {
      currentGroupData = group;
      console.log(`   ✅ Grupo "${groupName}" tiene datos completos del backend`);
    } 
    // CONDICIÓN 2: Verificar si es el grupo seleccionado y tiene groupData
    else if (selectedGroup === groupName && groupData && groupData.standings && Array.isArray(groupData.standings) && groupData.standings.length > 0) {
      currentGroupData = groupData;
      console.log(`   ✅ Grupo "${groupName}" usando datos cargados individualmente`);
    } 
    else {
      console.log(`   ❌ Grupo "${groupName}" NO tiene datos disponibles`);
      gruposNoRenderizables++;
      return; // Simular return null
    }
    
    // VALIDACIÓN FINAL
    if (!currentGroupData || !currentGroupData.standings || !Array.isArray(currentGroupData.standings) || currentGroupData.standings.length === 0) {
      console.log(`   ❌ Grupo "${groupName}" no pasa validación final`);
      gruposNoRenderizables++;
      return; // Simular return null
    }
    
    console.log(`   ✅ Grupo "${groupName}" SE RENDERIZARÍA con ${currentGroupData.standings.length} equipos`);
    gruposRenderizables++;
  });

  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMEN DEL SIMULADOR');
  console.log('='.repeat(80));
  console.log(`   - Total grupos recibidos: ${groups.length}`);
  console.log(`   - Grupos renderizables: ${gruposRenderizables}`);
  console.log(`   - Grupos NO renderizables: ${gruposNoRenderizables}`);
  console.log(`   - Grupos que se verían en UI: ${gruposRenderizables}`);
  
  if (gruposRenderizables === 1 && groups.length > 1) {
    console.log(`\n   ❌ PROBLEMA DETECTADO: Solo 1 grupo es renderizable de ${groups.length} recibidos`);
    console.log(`   ❌ Esto explicaría por qué solo se ve 1 grupo en la UI`);
  } else if (gruposRenderizables === groups.length) {
    console.log(`\n   ✅ Todos los grupos son renderizables`);
    console.log(`   ⚠️ Si solo se ve 1 en la UI, el problema está en el renderizado o CSS`);
  }
  
  console.log('='.repeat(80) + '\n');
}

// Ejecutar simulación
const backendResponse = simulateBackendResponse();
simulateFrontendProcessing(backendResponse);

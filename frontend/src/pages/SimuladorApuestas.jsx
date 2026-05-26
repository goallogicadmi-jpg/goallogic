import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { getSimulatorState, saveSimulatorState } from "../services/simulatorService";
import { hasToken } from "../services/authService";
import "./SimuladorApuestas.css";

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Ya no usamos localStorage, todo se guarda en el backend

// Función para generar fila inicial (para proyección o fila nueva)
const generarFilaInicial = (index, capitalInicial = 1000, esProyeccion = false) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + index);
  
  const apuesta1 = capitalInicial * 0.20;
  const apuesta2 = capitalInicial * 0.10;
  const multiplicador1 = 1.5;
  const multiplicador2 = 2.0;
  
  // Si es proyección, calcular como si ambas apuestas fueran ganadas
  let ganancia1 = 0;
  let ganancia2 = 0;
  
  if (esProyeccion) {
    // Proyección: ambas apuestas ganadas
    ganancia1 = (apuesta1 * multiplicador1) - apuesta1;
    ganancia2 = (apuesta2 * multiplicador2) - apuesta2;
  }
  
  const gananciaTotal = ganancia1 + ganancia2;
  
  return {
    capital: capitalInicial,
    apuesta_1: apuesta1,
    apuesta_2: apuesta2,
    multiplicador_a1: multiplicador1,
    multiplicador_a2: multiplicador2,
    resultado_a1: null, // null, 'ganada', 'perdida' - siempre null en proyección
    resultado_a2: null,
    ganancia_a1: ganancia1,
    ganancia_a2: ganancia2,
    ganancia_total: gananciaTotal,
    fecha: fecha.toLocaleDateString("es-ES"),
    es_proyeccion: esProyeccion, // Flag para identificar proyección
  };
};

// Función para generar 10 filas iniciales con proyección real
const generarFilasIniciales = () => {
  const filas = [];
  let capitalActual = 1000;
  
  for (let i = 0; i < 10; i++) {
    // Generar fila con proyección (como si ambas apuestas fueran ganadas)
    const fila = generarFilaInicial(i, capitalActual, true);
    
    // Asegurar que las apuestas se calculen correctamente
    fila.apuesta_1 = capitalActual * 0.20;
    fila.apuesta_2 = capitalActual * 0.10;
    fila.apuesta_1_editada = false;
    fila.apuesta_2_editada = false;
    
    // Recalcular ganancias como si fueran ganadas (proyección)
    const multiplicador1 = parseFloat(fila.multiplicador_a1) || 1.5;
    const multiplicador2 = parseFloat(fila.multiplicador_a2) || 2.0;
    fila.ganancia_a1 = (fila.apuesta_1 * multiplicador1) - fila.apuesta_1;
    fila.ganancia_a2 = (fila.apuesta_2 * multiplicador2) - fila.apuesta_2;
    fila.ganancia_total = fila.ganancia_a1 + fila.ganancia_a2;
    
    filas.push(fila);
    
    // El capital de la siguiente fila = capital actual + ganancia total
    capitalActual = capitalActual + fila.ganancia_total;
  }
  
  return filas;
};

// Función para calcular ganancia según resultado
const calcularGanancia = (apuesta, multiplicador, resultado, esProyeccion = false) => {
  // Si la apuesta es 0, la ganancia es 0
  if (apuesta === 0 || !apuesta) {
    return 0;
  }
  
  // Validar multiplicador (debe ser >= 1.0)
  const multValidado = Math.max(1.0, multiplicador);
  
  // Si es proyección y no hay resultado marcado, calcular como ganada
  if (esProyeccion && !resultado) {
    return Math.round(((apuesta * multValidado) - apuesta) * 100) / 100; // Redondear a 2 decimales
  }
  
  // Si hay resultado marcado, calcular según el resultado
  if (resultado === 'ganada') {
    return Math.round(((apuesta * multValidado) - apuesta) * 100) / 100; // Redondear a 2 decimales
  } else if (resultado === 'perdida') {
    return Math.round(-apuesta * 100) / 100; // Redondear a 2 decimales
  }
  
  return 0; // null o sin resultado
};

  // Función para recalcular una fila completa
  const recalcularFila = (fila) => {
    const capital = Math.max(0, parseFloat(fila.capital) || 0); // Prevenir capital negativo
    const multiplicador1 = Math.max(1.0, parseFloat(fila.multiplicador_a1) || 1.5); // Validar multiplicador >= 1.0
    const multiplicador2 = Math.max(1.0, parseFloat(fila.multiplicador_a2) || 2.0); // Validar multiplicador >= 1.0
    const esProyeccion = fila.es_proyeccion === true;
  
    // Si las apuestas no han sido editadas manualmente, calcularlas desde el capital
    let apuesta1 = Math.max(0, parseFloat(fila.apuesta_1) || 0);
    let apuesta2 = Math.max(0, parseFloat(fila.apuesta_2) || 0);
  
    if (!fila.apuesta_1_editada) {
      apuesta1 = Math.round((capital * 0.20) * 100) / 100; // Redondear a 2 decimales
    }
    if (!fila.apuesta_2_editada) {
      apuesta2 = Math.round((capital * 0.10) * 100) / 100; // Redondear a 2 decimales
    }
  
  // Si es proyección y no hay resultado marcado, calcular como ganada
  // Si hay resultado marcado, usar el resultado
  const resultado1 = fila.resultado_a1 !== null && fila.resultado_a1 !== undefined 
    ? fila.resultado_a1 
    : (esProyeccion ? 'ganada' : null);
  const resultado2 = fila.resultado_a2 !== null && fila.resultado_a2 !== undefined 
    ? fila.resultado_a2 
    : (esProyeccion ? 'ganada' : null);
  
  // Para proyección, siempre calcular como ganada si no hay resultado marcado
  const esProyeccionA1 = esProyeccion && (fila.resultado_a1 === null || fila.resultado_a1 === undefined);
  const esProyeccionA2 = esProyeccion && (fila.resultado_a2 === null || fila.resultado_a2 === undefined);
  
  const ganancia1 = calcularGanancia(apuesta1, multiplicador1, resultado1, esProyeccionA1);
  const ganancia2 = calcularGanancia(apuesta2, multiplicador2, resultado2, esProyeccionA2);
  const gananciaTotal = ganancia1 + ganancia2;
  
  return {
    ...fila,
    apuesta_1: apuesta1,
    apuesta_2: apuesta2,
    ganancia_a1: ganancia1,
    ganancia_a2: ganancia2,
    ganancia_total: gananciaTotal,
  };
};

  // Función para recalcular todas las filas desde un índice hacia abajo
  const recalcularFilasDesde = (filas, desdeIndice) => {
    const nuevasFilas = [...filas];
  
    // Recalcular la fila desde donde empezamos
    nuevasFilas[desdeIndice] = recalcularFila(nuevasFilas[desdeIndice]);
  
    // Recalcular todas las filas siguientes
    for (let i = desdeIndice + 1; i < nuevasFilas.length; i++) {
      // El capital de esta fila = capital anterior + ganancia_total anterior
      const capitalAnterior = parseFloat(nuevasFilas[i - 1].capital) || 0;
      const gananciaAnterior = parseFloat(nuevasFilas[i - 1].ganancia_total) || 0;
      // Prevenir capital negativo
      nuevasFilas[i].capital = Math.max(0, capitalAnterior + gananciaAnterior);
  
      // Recalcular la fila completa con el nuevo capital
      // Esto recalculará las apuestas automáticamente si no han sido editadas
      nuevasFilas[i] = recalcularFila(nuevasFilas[i]);
    }
  
    return nuevasFilas;
  };

export default function SimuladorApuestas() {
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Cargar datos desde el backend al montar
  useEffect(() => {
    loadSimulatorData();
  }, []);

  // Función para cargar datos del simulador desde el backend
  const loadSimulatorData = async () => {
    // Verificar si el usuario está autenticado
    if (!hasToken()) {
      // Si no está autenticado, usar datos locales (compatibilidad)
      const filasIniciales = generarFilasIniciales();
      const filasRecalculadas = recalcularFilasDesde(filasIniciales, 0);
      setTableData(filasRecalculadas);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const simulatorState = await getSimulatorState();
      
      console.log("📥 [SIMULADOR] Estado recibido del backend:", simulatorState);
      
      // Si hay datos guardados en el backend, recuperarlos exactamente como están
      if (simulatorState && simulatorState.apuestas && simulatorState.apuestas.length > 0) {
        console.log("📥 [SIMULADOR] Apuestas encontradas:", simulatorState.apuestas.length);
        console.log("📥 [SIMULADOR] Primera apuesta recibida:", simulatorState.apuestas[0]);
        
        // El backend guarda las filas en el campo 'apuestas'
        // Cada apuesta tiene un campo 'table_row' con la fila completa
        const filas = simulatorState.apuestas
          .map((apuesta, index) => {
            // Verificar si tiene table_row
            if (apuesta.table_row && typeof apuesta.table_row === 'object') {
              console.log(`✅ [SIMULADOR] Fila ${index + 1} recuperada con table_row:`, apuesta.table_row);
              // Asegurar que todos los campos necesarios estén presentes
              const filaCompleta = {
                capital: parseFloat(apuesta.table_row.capital) || 0,
                apuesta_1: parseFloat(apuesta.table_row.apuesta_1) || 0,
                apuesta_2: parseFloat(apuesta.table_row.apuesta_2) || 0,
                multiplicador_a1: parseFloat(apuesta.table_row.multiplicador_a1) || 1.5,
                multiplicador_a2: parseFloat(apuesta.table_row.multiplicador_a2) || 2.0,
                resultado_a1: apuesta.table_row.resultado_a1 || null,
                resultado_a2: apuesta.table_row.resultado_a2 || null,
                ganancia_a1: parseFloat(apuesta.table_row.ganancia_a1) || 0,
                ganancia_a2: parseFloat(apuesta.table_row.ganancia_a2) || 0,
                ganancia_total: parseFloat(apuesta.table_row.ganancia_total) || 0,
                fecha: apuesta.table_row.fecha || new Date().toLocaleDateString("es-ES"),
                es_proyeccion: apuesta.table_row.es_proyeccion || false,
                apuesta_1_editada: apuesta.table_row.apuesta_1_editada || false,
                apuesta_2_editada: apuesta.table_row.apuesta_2_editada || false,
                created_at: apuesta.table_row.created_at || new Date()
              };
              return filaCompleta;
            } else {
              console.warn(`⚠️ [SIMULADOR] Apuesta ${index + 1} sin table_row válido, estructura:`, apuesta);
              // Si no tiene table_row, intentar construir la fila desde los datos básicos
              // Esto es un fallback para datos antiguos (no debería pasar con el nuevo sistema)
              return null;
            }
          })
          .filter(fila => fila !== null); // Filtrar filas nulas
        
        console.log("📥 [SIMULADOR] Filas procesadas:", filas.length);
        
        if (filas.length > 0) {
          // Recalcular todas las filas desde el principio para asegurar consistencia matemática
          // pero manteniendo los datos guardados (resultados, apuestas editadas, etc.)
          let filasRecalculadas = recalcularFilasDesde(filas, 0);
          console.log("✅ [SIMULADOR] Filas recalculadas y cargadas:", filasRecalculadas.length);
          console.log("✅ [SIMULADOR] Primera fila cargada:", filasRecalculadas[0]);
          setTableData(filasRecalculadas);
        } else {
          // Si no hay filas válidas, generar datos por defecto
          console.warn("⚠️ [SIMULADOR] No se pudieron procesar las filas, generando datos por defecto");
          const filasIniciales = generarFilasIniciales();
          const filasRecalculadas = recalcularFilasDesde(filasIniciales, 0);
          setTableData(filasRecalculadas);
        }
      } else {
        // Sin datos guardados: tabla inicial local (no es un error de API)
        console.log('ℹ️ [SIMULADOR] No hay datos guardados, generando datos por defecto');
        const filasIniciales = generarFilasIniciales();
        const filasRecalculadas = recalcularFilasDesde(filasIniciales, 0);
        setTableData(filasRecalculadas);
      }
    } catch (error) {
      console.error('Error cargando datos del simulador:', error);
      const msg = String(error?.message || '');
      if (msg.includes('Sesión expirada') || msg.includes('invalidada')) {
        setError('Tu sesión expiró. Inicia sesión de nuevo para sincronizar el simulador.');
      } else if (msg.includes('no disponible')) {
        setError(`${msg} Se muestran datos locales temporales.`);
      } else {
        setError('Error al cargar datos del simulador. Generando datos por defecto.');
      }
      // En caso de error, generar datos por defecto para que la tabla nunca esté vacía
      const filasIniciales = generarFilasIniciales();
      const filasRecalculadas = recalcularFilasDesde(filasIniciales, 0);
      setTableData(filasRecalculadas);
    } finally {
      setLoading(false);
    }
  };

  // ELIMINADA: Función saveInitialData que guardaba automáticamente
  // Ahora solo se guarda cuando el usuario presiona "Guardar"

  // ELIMINADO: Guardado automático que sobrescribía constantemente
  // Ahora solo se guarda cuando el usuario presiona "Guardar"

  // Función para guardar datos del simulador en el backend
  // Esta función guarda el estado COMPLETO actual de la tabla
  const saveSimulatorData = async () => {
    if (!hasToken()) {
      return; // No guardar si no hay token
    }

    try {
      setSaving(true);
      setSaved(false);
      setError(null);
      
      // Calcular capital inicial y actual basado en el estado ACTUAL de la tabla
      const capitalInicial = tableData.length > 0 ? parseFloat(tableData[0].capital) || 1000 : 1000;
      const ultimaFila = tableData[tableData.length - 1];
      const capitalActual = ultimaFila ? parseFloat(ultimaFila.capital) + parseFloat(ultimaFila.ganancia_total || 0) : capitalInicial;
      
      // Convertir filas a formato del backend
      // Guardamos cada fila EXACTAMENTE como está en este momento
      // Usamos un campo 'table_row' para almacenar la fila completa con todos sus datos
      const apuestas = tableData.map((fila, index) => {
        // Asegurarnos de que la fila tenga todos los campos necesarios
        const filaCompleta = {
          capital: parseFloat(fila.capital) || 0,
          apuesta_1: parseFloat(fila.apuesta_1) || 0,
          apuesta_2: parseFloat(fila.apuesta_2) || 0,
          multiplicador_a1: parseFloat(fila.multiplicador_a1) || 1.5,
          multiplicador_a2: parseFloat(fila.multiplicador_a2) || 2.0,
          resultado_a1: fila.resultado_a1 || null,
          resultado_a2: fila.resultado_a2 || null,
          ganancia_a1: parseFloat(fila.ganancia_a1) || 0,
          ganancia_a2: parseFloat(fila.ganancia_a2) || 0,
          ganancia_total: parseFloat(fila.ganancia_total) || 0,
          fecha: fila.fecha || new Date().toLocaleDateString("es-ES"),
          es_proyeccion: fila.es_proyeccion || false,
          apuesta_1_editada: fila.apuesta_1_editada || false,
          apuesta_2_editada: fila.apuesta_2_editada || false,
          created_at: fila.created_at || new Date()
        };
        
        return {
          partido: fila.fecha || `Fila ${index + 1}`,
          cuota: parseFloat(fila.multiplicador_a1) || 1.5,
          stake: parseFloat(fila.apuesta_1) || 0,
          resultado: fila.resultado_a1 || 'pendiente',
          ganancia: parseFloat(fila.ganancia_a1) || 0,
          created_at: fila.created_at || new Date(),
          table_row: filaCompleta // Guardamos la fila completa con TODOS sus campos
        };
      });
      
      console.log("💾 [SIMULADOR] Guardando estado con", apuestas.length, "apuestas");
      console.log("💾 [SIMULADOR] Primera apuesta sample:", apuestas[0]);

      // Guardar el estado completo actual
      await saveSimulatorState({
        capital_inicial: capitalInicial,
        capital_actual: capitalActual,
        apuestas: apuestas
      });
      
      setSaved(true);
      // Ocultar mensaje "Guardado" después de 3 segundos
      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error("Error guardando datos del simulador:", error);
      setError("Error al guardar datos del simulador. Los datos se mantienen en memoria.");
      // Los datos se mantienen en memoria, no se pierden
    } finally {
      setSaving(false);
    }
  };

  // Guardar manualmente
  const handleSave = async () => {
    if (!hasToken()) {
      alert("Debes iniciar sesión para guardar tus datos");
      return;
    }

    try {
      await saveSimulatorData();
      // El mensaje "Guardado" se muestra automáticamente
    } catch (error) {
      // El error se muestra automáticamente en el mensaje de estado
    }
  };

  // Limpiar tabla visualmente (NO guarda automáticamente)
  const handleClear = () => {
    if (window.confirm("¿Estás seguro de que quieres limpiar toda la tabla?\n\nNota: Los cambios no se guardarán hasta que presiones 'Guardar'.")) {
      const filasIniciales = generarFilasIniciales();
      const filasRecalculadas = recalcularFilasDesde(filasIniciales, 0);
      setTableData(filasRecalculadas);
      // NO guardar automáticamente - el usuario debe presionar "Guardar" para persistir
    }
  };

  // Manejar cambio en celda editable
  const handleCellChange = (rowIndex, field, value) => {
    const nuevasFilas = [...tableData];
    nuevasFilas[rowIndex] = {
      ...nuevasFilas[rowIndex],
      [field]: value,
    };

    // Si cambia el capital, recalcular apuestas automáticamente si no han sido editadas
    if (field === "capital") {
      const nuevoCapital = Math.max(0, parseFloat(value) || 0); // Prevenir capital negativo
      nuevasFilas[rowIndex].capital = nuevoCapital;
      
      // Recalcular apuestas automáticamente si no han sido editadas manualmente
      if (!nuevasFilas[rowIndex].apuesta_1_editada) {
        nuevasFilas[rowIndex].apuesta_1 = Math.round((nuevoCapital * 0.20) * 100) / 100; // Redondear a 2 decimales
      }
      if (!nuevasFilas[rowIndex].apuesta_2_editada) {
        nuevasFilas[rowIndex].apuesta_2 = Math.round((nuevoCapital * 0.10) * 100) / 100; // Redondear a 2 decimales
      }
      
      const filasRecalculadas = recalcularFilasDesde(nuevasFilas, rowIndex);
      setTableData(filasRecalculadas);
    }
    // Si cambia una apuesta, marcar como editada y recalcular desde esta fila
    else if (field === "apuesta_1" || field === "apuesta_2") {
      nuevasFilas[rowIndex][field] = Math.max(0, parseFloat(value) || 0); // Prevenir apuestas negativas
      nuevasFilas[rowIndex][`${field}_editada`] = true;
      const filasRecalculadas = recalcularFilasDesde(nuevasFilas, rowIndex);
      setTableData(filasRecalculadas);
    }
    // Si cambia un multiplicador, validar y recalcular desde esta fila
    else if (field === "multiplicador_a1" || field === "multiplicador_a2") {
      const multiplicador = parseFloat(value);
      
      // Validar que el multiplicador sea >= 1.0
      if (isNaN(multiplicador) || multiplicador < 1.0) {
        alert(`El multiplicador debe ser mayor o igual a 1.0. Valor ingresado: ${value}`);
        // Restaurar valor anterior o usar default
        const valorAnterior = nuevasFilas[rowIndex][field] || (field === "multiplicador_a1" ? 1.5 : 2.0);
        nuevasFilas[rowIndex][field] = valorAnterior;
        setTableData(nuevasFilas);
        return;
      }
      
      nuevasFilas[rowIndex][field] = multiplicador;
      const filasRecalculadas = recalcularFilasDesde(nuevasFilas, rowIndex);
      setTableData(filasRecalculadas);
    }
    // Si cambia la fecha, solo actualizar
    else if (field === "fecha") {
      nuevasFilas[rowIndex].fecha = value;
      setTableData(nuevasFilas);
    }
  };

  // Manejar resultado de apuesta (ganada/perdida)
  const handleResultadoApuesta = (rowIndex, apuestaNum, resultado) => {
    const nuevasFilas = [...tableData];
    const campoResultado = apuestaNum === 1 ? "resultado_a1" : "resultado_a2";
    
    // Si se hace clic en el mismo resultado, desmarcar (toggle)
    if (nuevasFilas[rowIndex][campoResultado] === resultado) {
      nuevasFilas[rowIndex][campoResultado] = null;
    } else {
      nuevasFilas[rowIndex][campoResultado] = resultado;
      // Si se marca un resultado, ya no es proyección pura
      // (pero mantenemos el flag para que siga calculando correctamente)
    }

    // Recalcular desde esta fila hacia abajo
    const filasRecalculadas = recalcularFilasDesde(nuevasFilas, rowIndex);
    setTableData(filasRecalculadas);
  };

  // Eliminar fila (solo si no es una de las 10 filas iniciales)
  const deleteRow = (rowIndex) => {
    // Las primeras 10 filas no se pueden borrar
    if (rowIndex < 10) {
      alert("No se pueden eliminar las 10 filas iniciales");
      return;
    }
    
    if (tableData.length <= 11) {
      alert("Debe haber al menos 10 filas iniciales");
      return;
    }
    
    const nuevasFilas = tableData.filter((_, index) => index !== rowIndex);
    // Recalcular desde la primera fila después de eliminar
    const filasRecalculadas = recalcularFilasDesde(nuevasFilas, 0);
    setTableData(filasRecalculadas);
  };

  // Agregar nueva fila
  const addRow = () => {
    if (tableData.length === 0) {
      // Si la tabla está vacía, generar 10 filas iniciales
      const filasIniciales = generarFilasIniciales();
      const filasRecalculadas = recalcularFilasDesde(filasIniciales, 0);
      setTableData(filasRecalculadas);
    } else {
      const ultimaFila = tableData[tableData.length - 1];
      const capitalSiguiente = ultimaFila.capital + ultimaFila.ganancia_total;
      const nuevaFila = generarFilaInicial(tableData.length, capitalSiguiente);
      const nuevasFilas = [...tableData, nuevaFila];
      setTableData(nuevasFilas);
    }
  };

  // Preparar datos para gráficas
  const chartData = {
    labels: tableData.map((row) => row.fecha || "").filter(Boolean),
    gananciasTotales: tableData.map((row) => parseFloat(row.ganancia_total) || 0),
    capitales: tableData.map((row) => parseFloat(row.capital) || 0),
  };

  // Configuración gráfica de línea (Ganancia Total)
  const lineChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: "Ganancia Total por día",
        data: chartData.gananciasTotales,
        borderColor: "#1F6FEB",
        backgroundColor: "rgba(31, 111, 235, 0.1)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Configuración gráfica de barras (Capital)
  const barChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: "Capital por día",
        data: chartData.capitales,
        backgroundColor: "rgba(31, 111, 235, 0.6)",
        borderColor: "#1F6FEB",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: "#b0b0b0",
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#b0b0b0",
        },
        grid: {
          color: "rgba(31, 111, 235, 0.1)",
        },
      },
      y: {
        ticks: {
          color: "#b0b0b0",
        },
        grid: {
          color: "rgba(31, 111, 235, 0.1)",
        },
      },
    },
  };

  // Mostrar loading mientras se cargan los datos
  if (loading) {
    return (
      <div className="simulador-apuestas-container">
        <div className="simulador-loading">
          <p>Cargando simulador...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="simulador-apuestas-container">
      <h1 className="simulador-title">Simulador de Apuestas Deportivas</h1>

      {/* Mensajes de estado */}
      {error && (
        <div className="simulador-error" style={{ 
          padding: '10px', 
          margin: '10px', 
          background: '#ffebee', 
          color: '#c62828', 
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {saving && (
        <div className="simulador-saving" style={{ 
          padding: '10px', 
          margin: '10px', 
          background: '#e3f2fd', 
          color: '#1976d2', 
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ 
            display: 'inline-block',
            width: '16px',
            height: '16px',
            border: '2px solid #1976d2',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}></span>
          <span>Guardando...</span>
        </div>
      )}
      {saved && !saving && (
        <div className="simulador-saved" style={{ 
          padding: '10px', 
          margin: '10px', 
          background: '#e8f5e9', 
          color: '#2e7d32', 
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>✅</span>
          <span>Guardado</span>
        </div>
      )}

      {/* Botones de acción */}
      <div className="simulador-buttons">
        <button className="btn-guardar" onClick={handleSave}>
          Guardar
        </button>
        <button className="btn-limpiar" onClick={handleClear}>
          Limpiar tabla
        </button>
        <button className="btn-agregar" onClick={addRow}>
          {tableData.length === 0 ? "Generar tabla inicial" : "Agregar fila"}
        </button>
      </div>

      {/* Tabla editable */}
      <div className="simulador-table-container table-responsive">
        <table className="simulador-table">
          <thead>
            <tr>
              <th>CAPITAL</th>
              <th>APUESTA 1 (20%)</th>
              <th>APUESTA 2 (10%)</th>
              <th className="col-multiplicador">Mult. A1</th>
              <th className="col-multiplicador">Mult. A2</th>
              <th>RESULTADOS</th>
              <th>GANANCIA A1</th>
              <th>GANANCIA A2</th>
              <th>GANANCIA TOTAL</th>
              <th>FECHA</th>
              <th>LOG</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => {
              const apuesta1Ganada = row.resultado_a1 === 'ganada';
              const apuesta1Perdida = row.resultado_a1 === 'perdida';
              const apuesta2Ganada = row.resultado_a2 === 'ganada';
              const apuesta2Perdida = row.resultado_a2 === 'perdida';

              return (
                <tr key={rowIndex}>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={row.capital || ""}
                      onChange={(e) =>
                        handleCellChange(rowIndex, "capital", e.target.value)
                      }
                      placeholder="0"
                      className="table-input"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={row.apuesta_1?.toFixed(2) || ""}
                      onChange={(e) =>
                        handleCellChange(rowIndex, "apuesta_1", e.target.value)
                      }
                      placeholder="0"
                      className={`table-input ${apuesta1Ganada ? 'ganada' : ''} ${apuesta1Perdida ? 'perdida' : ''}`}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={row.apuesta_2?.toFixed(2) || ""}
                      onChange={(e) =>
                        handleCellChange(rowIndex, "apuesta_2", e.target.value)
                      }
                      placeholder="0"
                      className={`table-input ${apuesta2Ganada ? 'ganada' : ''} ${apuesta2Perdida ? 'perdida' : ''}`}
                    />
                  </td>
                  <td className="col-multiplicador">
                    <input
                      type="number"
                      step="0.1"
                      value={row.multiplicador_a1 || ""}
                      onChange={(e) =>
                        handleCellChange(rowIndex, "multiplicador_a1", e.target.value)
                      }
                      placeholder="1.5"
                      className="table-input"
                    />
                  </td>
                  <td className="col-multiplicador">
                    <input
                      type="number"
                      step="0.1"
                      value={row.multiplicador_a2 || ""}
                      onChange={(e) =>
                        handleCellChange(rowIndex, "multiplicador_a2", e.target.value)
                      }
                      placeholder="2.0"
                      className="table-input"
                    />
                  </td>
                  <td className="botones-resultado">
                    <div className="resultado-seccion">
                      <div className="resultado-label">A1:</div>
                      <button
                        className={`btn-resultado ${apuesta1Ganada ? 'activo-ganada' : ''}`}
                        onClick={() => handleResultadoApuesta(rowIndex, 1, 'ganada')}
                        title="Marcar A1 como ganada"
                      >
                        Ganada
                      </button>
                      <button
                        className={`btn-resultado ${apuesta1Perdida ? 'activo-perdida' : ''}`}
                        onClick={() => handleResultadoApuesta(rowIndex, 1, 'perdida')}
                        title="Marcar A1 como perdida"
                      >
                        Perdida
                      </button>
                    </div>
                    <div className="resultado-seccion">
                      <div className="resultado-label">A2:</div>
                      <button
                        className={`btn-resultado ${apuesta2Ganada ? 'activo-ganada' : ''}`}
                        onClick={() => handleResultadoApuesta(rowIndex, 2, 'ganada')}
                        title="Marcar A2 como ganada"
                      >
                        Ganada
                      </button>
                      <button
                        className={`btn-resultado ${apuesta2Perdida ? 'activo-perdida' : ''}`}
                        onClick={() => handleResultadoApuesta(rowIndex, 2, 'perdida')}
                        title="Marcar A2 como perdida"
                      >
                        Perdida
                      </button>
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={row.ganancia_a1?.toFixed(2) || ""}
                      readOnly
                      className={`table-input readonly ${row.ganancia_a1 > 0 ? 'ganada' : row.ganancia_a1 < 0 ? 'perdida' : ''}`}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={row.ganancia_a2?.toFixed(2) || ""}
                      readOnly
                      className={`table-input readonly ${row.ganancia_a2 > 0 ? 'ganada' : row.ganancia_a2 < 0 ? 'perdida' : ''}`}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={row.ganancia_total?.toFixed(2) || ""}
                      readOnly
                      className={`table-input readonly ${row.ganancia_total > 0 ? 'ganada' : row.ganancia_total < 0 ? 'perdida' : ''}`}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.fecha || ""}
                      onChange={(e) =>
                        handleCellChange(rowIndex, "fecha", e.target.value)
                      }
                      placeholder="DD/MM/YYYY"
                      className="table-input"
                    />
                  </td>
                  <td>
                    {rowIndex >= 10 && (
                      <button
                        className="btn-delete"
                        onClick={() => deleteRow(rowIndex)}
                        title="Eliminar fila"
                      >
                        ×
                      </button>
                    )}
                    {rowIndex < 10 && (
                      <span className="fila-fija-indicator" title="Fila inicial fija">🔒</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Gráficas */}
      {!loading && tableData.length > 0 && (
        <div className="simulador-charts">
          <div className="simulador-chart-box">
            <h3 className="simulador-chart-title">Ganancia Total por día</h3>
            <div className="simulador-chart-canvas">
              <Line data={lineChartData} options={chartOptions} />
            </div>
          </div>
          <div className="simulador-chart-box">
            <h3 className="simulador-chart-title">Capital por día</h3>
            <div className="simulador-chart-canvas">
              <Bar data={barChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* Texto explicativo */}
      <div className="simulador-explanation">
        <h3>📘 ¿Qué representa esta tabla?</h3>
        <ul>
          <li>
            <strong>Gestión del capital:</strong> Las apuestas se calculan como
            porcentajes del capital (20% y 10%), permitiendo escalar de forma
            controlada.
          </li>
          <li>
            <strong>Proyección matemática:</strong> Se muestran los posibles
            resultados usando multiplicadores para visualizar escenarios de
            ganancia.
          </li>
          <li>
            <strong>Crecimiento compuesto:</strong> El capital aumenta día a día
            según las ganancias, mostrando cómo la reinversión acelera el
            crecimiento.
          </li>
        </ul>
      </div>
    </div>
  );
}

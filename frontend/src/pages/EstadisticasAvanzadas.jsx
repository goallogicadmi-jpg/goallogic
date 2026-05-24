import React, { useState, useEffect, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import "./EstadisticasAvanzadas.css";

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const STORAGE_KEY = "simulador_apuestas_data";

export default function EstadisticasAvanzadas() {
  const [tableData, setTableData] = useState([]);

  // Cargar datos desde localStorage
  useEffect(() => {
    const loadData = () => {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTableData(parsed);
          }
        } catch (error) {
          console.error("Error cargando datos:", error);
        }
      }
    };

    loadData();
    
    // Escuchar cambios en localStorage
    const handleStorageChange = () => {
      loadData();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Polling para detectar cambios (ya que storage event solo funciona entre tabs)
    // Actualizar cada 500ms para respuesta rápida
    const interval = setInterval(loadData, 500);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Calcular todas las estadísticas
  const estadisticas = useMemo(() => {
    if (!tableData || tableData.length === 0) {
      return null;
    }

    const capitalInicial = tableData[0]?.capital || 1000;
    const capitalActual = tableData[tableData.length - 1]?.capital || capitalInicial;
    
    // 1. ROI Diario (último día)
    const ultimaFila = tableData[tableData.length - 1];
    const gananciaUltimoDia = ultimaFila?.ganancia_total || 0;
    const capitalInicialUltimoDia = ultimaFila?.capital || capitalInicial;
    const roiDiario = capitalInicialUltimoDia !== 0 
      ? (gananciaUltimoDia / capitalInicialUltimoDia) * 100 
      : 0;

    // 2. ROI Acumulado
    const roiAcumulado = capitalInicial !== 0 
      ? ((capitalActual - capitalInicial) / capitalInicial) * 100 
      : 0;

    // 3. Curva del Capital (Equity Curve)
    const equityCurve = tableData.map((row, index) => ({
      fecha: row.fecha || `Día ${index + 1}`,
      capital: parseFloat(row.capital) || 0,
    }));

    // 4. Tasa de Acierto (Win Rate)
    let apuestasGanadas = 0;
    let apuestasPerdidas = 0;
    tableData.forEach((row) => {
      if (row.resultado_a1 === 'ganada') apuestasGanadas++;
      if (row.resultado_a1 === 'perdida') apuestasPerdidas++;
      if (row.resultado_a2 === 'ganada') apuestasGanadas++;
      if (row.resultado_a2 === 'perdida') apuestasPerdidas++;
    });
    const apuestasTotales = apuestasGanadas + apuestasPerdidas;
    const winRate = apuestasTotales > 0 ? (apuestasGanadas / apuestasTotales) * 100 : 0;

    // 5. Riesgo Promedio (Risk Exposure)
    const riesgos = tableData.map((row) => {
      const capital = parseFloat(row.capital) || 1;
      const apuesta1 = parseFloat(row.apuesta_1) || 0;
      const apuesta2 = parseFloat(row.apuesta_2) || 0;
      return capital !== 0 ? ((apuesta1 + apuesta2) / capital) * 100 : 0;
    });
    const riesgoPromedio = riesgos.length > 0 
      ? riesgos.reduce((sum, r) => sum + r, 0) / riesgos.length 
      : 0;

    // 6. Ganancia Real por Apuesta
    const gananciasA1 = tableData
      .map((row) => parseFloat(row.ganancia_a1) || 0)
      .filter((g) => g !== 0);
    const gananciasA2 = tableData
      .map((row) => parseFloat(row.ganancia_a2) || 0)
      .filter((g) => g !== 0);
    const promedioA1 = gananciasA1.length > 0 
      ? gananciasA1.reduce((sum, g) => sum + g, 0) / gananciasA1.length 
      : 0;
    const promedioA2 = gananciasA2.length > 0 
      ? gananciasA2.reduce((sum, g) => sum + g, 0) / gananciasA2.length 
      : 0;

    // 7. Drawdown Máximo
    let capitalMaximo = capitalInicial;
    let drawdownMaximo = 0;
    tableData.forEach((row) => {
      const capital = parseFloat(row.capital) || 0;
      if (capital > capitalMaximo) {
        capitalMaximo = capital;
      }
      const drawdown = capitalMaximo - capital;
      if (drawdown > drawdownMaximo) {
        drawdownMaximo = drawdown;
      }
    });

    // 8. Consistencia del Usuario
    let diasConsecutivosGanando = 0;
    let diasConsecutivosPerdiendo = 0;
    let rachaActualGanando = 0;
    let rachaActualPerdiendo = 0;
    
    tableData.forEach((row) => {
      const gananciaTotal = parseFloat(row.ganancia_total) || 0;
      if (gananciaTotal > 0) {
        rachaActualGanando++;
        rachaActualPerdiendo = 0;
        if (rachaActualGanando > diasConsecutivosGanando) {
          diasConsecutivosGanando = rachaActualGanando;
        }
      } else if (gananciaTotal < 0) {
        rachaActualPerdiendo++;
        rachaActualGanando = 0;
        if (rachaActualPerdiendo > diasConsecutivosPerdiendo) {
          diasConsecutivosPerdiendo = rachaActualPerdiendo;
        }
      } else {
        rachaActualGanando = 0;
        rachaActualPerdiendo = 0;
      }
    });

    // 9. Eficiencia de Multiplicadores
    const eficienciaMultiplicadores = {
      a1: { ganancias: [], multiplicador: 1.5 },
      a2: { ganancias: [], multiplicador: 2.0 },
    };
    
    tableData.forEach((row) => {
      const mult1 = parseFloat(row.multiplicador_a1) || 1.5;
      const mult2 = parseFloat(row.multiplicador_a2) || 2.0;
      const gan1 = parseFloat(row.ganancia_a1) || 0;
      const gan2 = parseFloat(row.ganancia_a2) || 0;
      
      if (gan1 !== 0) {
        eficienciaMultiplicadores.a1.ganancias.push(gan1);
        eficienciaMultiplicadores.a1.multiplicador = mult1;
      }
      if (gan2 !== 0) {
        eficienciaMultiplicadores.a2.ganancias.push(gan2);
        eficienciaMultiplicadores.a2.multiplicador = mult2;
      }
    });
    
    const eficienciaPromedioA1 = eficienciaMultiplicadores.a1.ganancias.length > 0
      ? eficienciaMultiplicadores.a1.ganancias.reduce((sum, g) => sum + g, 0) / eficienciaMultiplicadores.a1.ganancias.length
      : 0;
    const eficienciaPromedioA2 = eficienciaMultiplicadores.a2.ganancias.length > 0
      ? eficienciaMultiplicadores.a2.ganancias.reduce((sum, g) => sum + g, 0) / eficienciaMultiplicadores.a2.ganancias.length
      : 0;

    // 10. Proyección Futura (usar las 10 filas automáticas)
    const filasProyeccion = tableData.filter((row) => row.es_proyeccion === true).slice(0, 10);
    const capitalProyectado = filasProyeccion.length > 0
      ? filasProyeccion[filasProyeccion.length - 1]?.capital || capitalActual
      : capitalActual;

    return {
      roiDiario,
      roiAcumulado,
      equityCurve,
      winRate,
      riesgoPromedio,
      promedioA1,
      promedioA2,
      drawdownMaximo,
      diasConsecutivosGanando,
      diasConsecutivosPerdiendo,
      eficienciaPromedioA1,
      eficienciaPromedioA2,
      capitalProyectado,
      capitalInicial,
      capitalActual,
    };
  }, [tableData]);

  // Opciones comunes para mini-gráficas
  const miniChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  if (!estadisticas) {
    return (
      <div className="estadisticas-avanzadas-container">
        <div className="estadisticas-empty">
          <p>No hay datos del simulador disponibles.</p>
          <p>Completa algunas filas en el simulador para ver las estadísticas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="estadisticas-avanzadas-container">
      <h1 className="estadisticas-title">Estadísticas Avanzadas</h1>
      
      <div className="estadisticas-grid">
        {/* 1. ROI Diario */}
        <div className="estadistica-card">
          <h3 className="card-title">ROI Diario</h3>
          <div className="card-value">{estadisticas.roiDiario.toFixed(2)}%</div>
          <div className="card-chart">
            <Line
              data={{
                labels: estadisticas.equityCurve.slice(-7).map((e) => e.fecha),
                datasets: [{
                  data: estadisticas.equityCurve.slice(-7).map((e) => e.capital),
                  borderColor: "#1F6FEB",
                  backgroundColor: "rgba(31, 111, 235, 0.1)",
                  borderWidth: 2,
                  tension: 0.4,
                }],
              }}
              options={miniChartOptions}
            />
          </div>
          <p className="card-description">Retorno sobre inversión del último día</p>
        </div>

        {/* 2. ROI Acumulado */}
        <div className="estadistica-card">
          <h3 className="card-title">ROI Acumulado</h3>
          <div className="card-value large">{estadisticas.roiAcumulado.toFixed(2)}%</div>
          <div className="card-chart">
            <Line
              data={{
                labels: estadisticas.equityCurve.map((e) => e.fecha),
                datasets: [{
                  data: estadisticas.equityCurve.map((e) => e.capital),
                  borderColor: estadisticas.roiAcumulado >= 0 ? "#28a745" : "#dc3545",
                  backgroundColor: estadisticas.roiAcumulado >= 0 
                    ? "rgba(40, 167, 69, 0.1)" 
                    : "rgba(220, 53, 69, 0.1)",
                  borderWidth: 2,
                  tension: 0.4,
                }],
              }}
              options={miniChartOptions}
            />
          </div>
          <p className="card-description">Retorno total desde el inicio</p>
        </div>

        {/* 3. Curva del Capital */}
        <div className="estadistica-card wide">
          <h3 className="card-title">Curva del Capital (Equity Curve)</h3>
          <div className="card-chart large">
            <Line
              data={{
                labels: estadisticas.equityCurve.map((e) => e.fecha),
                datasets: [{
                  label: "Capital",
                  data: estadisticas.equityCurve.map((e) => e.capital),
                  borderColor: "#1F6FEB",
                  backgroundColor: "rgba(31, 111, 235, 0.1)",
                  borderWidth: 2,
                  fill: true,
                  tension: 0.4,
                }],
              }}
              options={{
                ...miniChartOptions,
                scales: {
                  x: { display: true, ticks: { color: "#b0b0b0", maxRotation: 45 } },
                  y: { display: true, ticks: { color: "#b0b0b0" } },
                },
              }}
            />
          </div>
          <p className="card-description">Evolución del capital a lo largo del tiempo</p>
        </div>

        {/* 4. Tasa de Acierto */}
        <div className="estadistica-card">
          <h3 className="card-title">Tasa de Acierto</h3>
          <div className="card-value">{estadisticas.winRate.toFixed(1)}%</div>
          <div className="card-chart">
            <Doughnut
              data={{
                labels: ["Ganadas", "Perdidas"],
                datasets: [{
                  data: [estadisticas.winRate, Math.max(0, 100 - estadisticas.winRate)],
                  backgroundColor: ["#28a745", "#dc3545"],
                  borderWidth: 0,
                }],
              }}
              options={miniChartOptions}
            />
          </div>
          <p className="card-description">Porcentaje de apuestas ganadas</p>
        </div>

        {/* 5. Riesgo Promedio */}
        <div className="estadistica-card">
          <h3 className="card-title">Riesgo Promedio</h3>
          <div className="card-value">{estadisticas.riesgoPromedio.toFixed(1)}%</div>
          <div className="card-chart">
            <Bar
              data={{
                labels: ["Riesgo"],
                datasets: [{
                  data: [estadisticas.riesgoPromedio],
                  backgroundColor: estadisticas.riesgoPromedio > 30 
                    ? "#dc3545" 
                    : estadisticas.riesgoPromedio > 20 
                    ? "#ffc107" 
                    : "#28a745",
                  borderWidth: 0,
                }],
              }}
              options={miniChartOptions}
            />
          </div>
          <p className="card-description">Exposición promedio al riesgo</p>
        </div>

        {/* 6. Ganancia Real por Apuesta */}
        <div className="estadistica-card">
          <h3 className="card-title">Ganancia Promedio</h3>
          <div className="card-value">A1: {estadisticas.promedioA1.toFixed(2)}</div>
          <div className="card-value">A2: {estadisticas.promedioA2.toFixed(2)}</div>
          <div className="card-chart">
            <Bar
              data={{
                labels: ["A1", "A2"],
                datasets: [{
                  data: [estadisticas.promedioA1, estadisticas.promedioA2],
                  backgroundColor: ["#1F6FEB", "#28a745"],
                  borderWidth: 0,
                }],
              }}
              options={miniChartOptions}
            />
          </div>
          <p className="card-description">Ganancia promedio por tipo de apuesta</p>
        </div>

        {/* 7. Drawdown Máximo */}
        <div className="estadistica-card">
          <h3 className="card-title">Drawdown Máximo</h3>
          <div className="card-value">{estadisticas.drawdownMaximo.toFixed(2)}</div>
          <div className="card-chart">
            <Line
              data={{
                labels: estadisticas.equityCurve.map((e) => e.fecha),
                datasets: [{
                  data: estadisticas.equityCurve.map((e) => e.capital),
                  borderColor: "#dc3545",
                  backgroundColor: "rgba(220, 53, 69, 0.1)",
                  borderWidth: 2,
                  tension: 0.4,
                }],
              }}
              options={miniChartOptions}
            />
          </div>
          <p className="card-description">Mayor caída desde el máximo</p>
        </div>

        {/* 8. Consistencia del Usuario */}
        <div className="estadistica-card">
          <h3 className="card-title">Consistencia</h3>
          <div className="card-value">Ganando: {estadisticas.diasConsecutivosGanando}</div>
          <div className="card-value">Perdiendo: {estadisticas.diasConsecutivosPerdiendo}</div>
          <div className="card-chart">
            <Bar
              data={{
                labels: ["Ganando", "Perdiendo"],
                datasets: [{
                  data: [estadisticas.diasConsecutivosGanando, estadisticas.diasConsecutivosPerdiendo],
                  backgroundColor: ["#28a745", "#dc3545"],
                  borderWidth: 0,
                }],
              }}
              options={miniChartOptions}
            />
          </div>
          <p className="card-description">Rachas consecutivas</p>
        </div>

        {/* 9. Eficiencia de Multiplicadores */}
        <div className="estadistica-card">
          <h3 className="card-title">Eficiencia Multiplicadores</h3>
          <div className="card-value">A1: {estadisticas.eficienciaPromedioA1.toFixed(2)}</div>
          <div className="card-value">A2: {estadisticas.eficienciaPromedioA2.toFixed(2)}</div>
          <div className="card-chart">
            <Bar
              data={{
                labels: ["A1", "A2"],
                datasets: [{
                  data: [estadisticas.eficienciaPromedioA1, estadisticas.eficienciaPromedioA2],
                  backgroundColor: ["#1F6FEB", "#ffc107"],
                  borderWidth: 0,
                }],
              }}
              options={miniChartOptions}
            />
          </div>
          <p className="card-description">Ganancia promedio por multiplicador</p>
        </div>

        {/* 10. Proyección Futura */}
        <div className="estadistica-card">
          <h3 className="card-title">Proyección 10 Días</h3>
          <div className="card-value large">{estadisticas.capitalProyectado.toFixed(2)}</div>
          <div className="card-chart">
            <Line
              data={{
                labels: estadisticas.equityCurve.slice(0, 10).map((e) => e.fecha),
                datasets: [{
                  data: estadisticas.equityCurve.slice(0, 10).map((e) => e.capital),
                  borderColor: "#28a745",
                  backgroundColor: "rgba(40, 167, 69, 0.1)",
                  borderWidth: 2,
                  tension: 0.4,
                }],
              }}
              options={miniChartOptions}
            />
          </div>
          <p className="card-description">Capital proyectado según proyección automática</p>
        </div>
      </div>
    </div>
  );
}

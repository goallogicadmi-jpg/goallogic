import { useMemo } from "react";
import { calculateAdvancedStats } from "../utils/calculateAdvancedStats";
import {
  ADVANCED_METRIC_LABELS as ML,
  ADVANCED_METRIC_LABEL_CLASS,
} from "../constants/advancedMetricLabels";

/**
 * Componente para mostrar estadísticas avanzadas de un equipo
 * @param {Object} props
 * @param {Array} props.ultimosPartidos - Array de últimos partidos con estructura {golesFavor, golesContra}
 * @param {Array} props.fixtures - Array de fixtures completos (opcional, alternativa a ultimosPartidos)
 * @param {number|string} props.teamId - ID del equipo (opcional, solo necesario si se usan fixtures completos)
 * @param {string} props.tipo - Tipo de equipo ("A" o "B") para aplicar colores diferenciados
 */
export default function EstadisticasAvanzadasEquipo({ ultimosPartidos, fixtures, teamId, tipo = "A" }) {
  // Calcular estadísticas avanzadas
  const stats = useMemo(() => {
    // Priorizar fixtures si están disponibles, sino usar ultimosPartidos
    const dataSource = fixtures && fixtures.length > 0 ? fixtures : ultimosPartidos;
    
    if (!dataSource || dataSource.length === 0) {
      return null;
    }

    return calculateAdvancedStats(dataSource, teamId);
  }, [ultimosPartidos, fixtures, teamId]);

  // Si no hay estadísticas, no renderizar nada
  if (!stats) {
    return null;
  }

  // Color según el tipo de equipo
  const colorEquipo = tipo === "A" ? "#4da3ff" : "#ff9f43";

  return (
    <div className="estadisticas-avanzadas-equipo">
      <h4 className="estadisticas-avanzadas-titulo">Estadísticas Avanzadas</h4>
      
      {/* Promedios de Goles */}
      <div className="estadisticas-seccion-avanzada">
        <h5 className="estadisticas-subtitulo">Promedios de Goles</h5>
        <div className="estadisticas-grid-avanzadas">
          <div className="estadistica-card-avanzada">
            <span className="estadistica-label-avanzada">Goles por Partido</span>
            <span className="estadistica-valor-avanzada" style={{ color: colorEquipo }}>
              {stats.avgGoalsPerMatch}
            </span>
          </div>
          <div className="estadistica-card-avanzada">
            <span className="estadistica-label-avanzada">Goles Recibidos/Partido</span>
            <span className="estadistica-valor-avanzada" style={{ color: colorEquipo }}>
              {stats.avgGoalsAgainstPerMatch}
            </span>
          </div>
          <div className="estadistica-card-avanzada">
            <span className="estadistica-label-avanzada">Total Goles/Partido</span>
            <span className="estadistica-valor-avanzada" style={{ color: colorEquipo }}>
              {stats.avgTotalGoalsPerMatch}
            </span>
          </div>
        </div>
      </div>

      {/* Defensa y Ataque */}
      <div className="estadisticas-seccion-avanzada">
        <h5 className="estadisticas-subtitulo">Defensa y Ataque</h5>
        <div className="estadisticas-grid-avanzadas">
          <div className="estadistica-card-avanzada">
            <span className={`estadistica-label-avanzada ${ADVANCED_METRIC_LABEL_CLASS}`}>{ML.cleanSheets}</span>
            <span className="estadistica-valor-avanzada" style={{ color: colorEquipo }}>
              {stats.cleanSheets} ({stats.cleanSheetsPercentage}%)
            </span>
          </div>
          <div className="estadistica-card-avanzada">
            <span className="estadistica-label-avanzada">Sin Anotar</span>
            <span className="estadistica-valor-avanzada" style={{ color: colorEquipo }}>
              {stats.failedToScore} ({stats.failedToScorePercentage}%)
            </span>
          </div>
        </div>
      </div>

      {/* Over/Under */}
      <div className="estadisticas-seccion-avanzada">
        <h5 className="estadisticas-subtitulo">
          Over/Under (Basado en {stats.totalMatches} partidos)
        </h5>
        <div className="estadisticas-grid-avanzadas over-under-grid">
          <div className="estadistica-card-avanzada">
            <span className="estadistica-label-avanzada">Over 0.5</span>
            <span className="estadistica-valor-avanzada" style={{ color: colorEquipo }}>
              {stats.overUnder.over05}%
            </span>
          </div>
          <div className="estadistica-card-avanzada">
            <span className="estadistica-label-avanzada">Over 1.5</span>
            <span className="estadistica-valor-avanzada" style={{ color: colorEquipo }}>
              {stats.overUnder.over15}%
            </span>
          </div>
          <div className="estadistica-card-avanzada">
            <span className={`estadistica-label-avanzada ${ADVANCED_METRIC_LABEL_CLASS}`}>{ML.over25}</span>
            <span className="estadistica-valor-avanzada" style={{ color: colorEquipo }}>
              {stats.overUnder.over25}%
            </span>
          </div>
          <div className="estadistica-card-avanzada">
            <span className="estadistica-label-avanzada">Over 3.5</span>
            <span className="estadistica-valor-avanzada" style={{ color: colorEquipo }}>
              {stats.overUnder.over35}%
            </span>
          </div>
          <div className="estadistica-card-avanzada">
            <span className="estadistica-label-avanzada">Under 0.5</span>
            <span className="estadistica-valor-avanzada" style={{ color: colorEquipo }}>
              {stats.overUnder.under05}%
            </span>
          </div>
          <div className="estadistica-card-avanzada">
            <span className="estadistica-label-avanzada">Under 1.5</span>
            <span className="estadistica-valor-avanzada" style={{ color: colorEquipo }}>
              {stats.overUnder.under15}%
            </span>
          </div>
          <div className="estadistica-card-avanzada">
            <span className="estadistica-label-avanzada">Under 2.5</span>
            <span className="estadistica-valor-avanzada" style={{ color: colorEquipo }}>
              {stats.overUnder.under25}%
            </span>
          </div>
          <div className="estadistica-card-avanzada">
            <span className="estadistica-label-avanzada">Under 3.5</span>
            <span className="estadistica-valor-avanzada" style={{ color: colorEquipo }}>
              {stats.overUnder.under35}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { tokens } from '../../styles/tokens';
import { generateInsights } from '../../utils/generateInsights';
import { CONCLUSIONES_CID_MENSAJE_BASE } from '../../utils/conclusionesCopy';

/**
 * Componente profesional para mostrar insights del partido
 * 
 * @param {Object} props
 * @param {Object} props.prediccion - Objeto con probabilidades y goles esperados
 * @param {Object} props.metricas_avanzadas - Métricas avanzadas del partido
 */
export default function InsightsCard({ prediccion, metricas_avanzadas }) {
  const resultado = generateInsights(prediccion, metricas_avanzadas);
  
  // Compatibilidad: si retorna array (formato legacy), usar directamente
  const insightsRaw = Array.isArray(resultado) ? resultado : (resultado?.conclusiones || []);
  const insights =
    insightsRaw && insightsRaw.length > 0 ? insightsRaw : [CONCLUSIONES_CID_MENSAJE_BASE];
  const resumenEjecutivo = resultado?.resumenEjecutivo || [];
  const conclusionFinal = resultado?.conclusionFinal || null;

  // Estilos del componente
  const cardStyle = {
    backgroundColor: tokens.colors.bgSecondary,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    marginTop: tokens.spacing.lg,
    marginBottom: tokens.spacing.lg,
    border: `1px solid ${tokens.colors.borderDefault}`,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  };

  const tituloStyle = {
    fontSize: tokens.typography.fontSizeXl,
    fontWeight: tokens.typography.fontWeightBold,
    color: tokens.colors.textPrimary,
    marginBottom: tokens.spacing.md,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  };

  const insightsListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
  };

  const insightItemStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.bgTertiary,
    borderRadius: tokens.radius.md,
    borderLeft: `4px solid ${getBorderColorByType}`,
    transition: 'all 0.2s ease',
  };

  const iconStyle = {
    fontSize: tokens.typography.fontSizeLg,
    flexShrink: 0,
    marginTop: '2px',
  };

  const textStyle = {
    fontSize: tokens.typography.fontSizeBase,
    lineHeight: tokens.typography.lineHeightRelaxed,
    color: tokens.colors.textSecondary,
    flex: 1,
  };

  const resumenStyle = {
    marginTop: tokens.spacing.lg,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.bgPrimary,
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.borderDefault}`,
  };

  const resumenTituloStyle = {
    fontSize: tokens.typography.fontSizeLg,
    fontWeight: tokens.typography.fontWeightSemibold,
    color: tokens.colors.textPrimary,
    marginBottom: tokens.spacing.sm,
  };

  const resumenItemStyle = {
    fontSize: tokens.typography.fontSizeBase,
    lineHeight: tokens.typography.lineHeightRelaxed,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.xs,
    paddingLeft: tokens.spacing.sm,
    borderLeft: `3px solid ${tokens.colors.accentOrange}`,
  };

  const conclusionFinalStyle = {
    marginTop: tokens.spacing.lg,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.bgTertiary,
    borderRadius: tokens.radius.md,
    border: `2px solid ${tokens.colors.accentOrange}`,
    fontStyle: 'italic',
  };

  const conclusionFinalTextStyle = {
    fontSize: tokens.typography.fontSizeBase,
    lineHeight: tokens.typography.lineHeightRelaxed,
    color: tokens.colors.textPrimary,
  };

  // Función para obtener color según tipo
  function getBorderColorByType(tipo) {
    switch (tipo) {
      case 'ventaja':
        return tokens.colors.accentPositive || '#27ae60';
      case 'riesgo':
        return tokens.colors.accentWarning || '#f39c12';
      case 'tendencia':
        return tokens.colors.accentInfo || '#3498db';
      case 'alerta':
        return tokens.colors.accentDanger || '#e74c3c';
      case 'dato clave':
        return tokens.colors.accentGold || '#f1c40f';
      default:
        return tokens.colors.borderDefault;
    }
  }

  return (
    <div style={cardStyle}>
      <h3 style={tituloStyle}>
        📊 Conclusiones de análisis
      </h3>
      
      {/* Resumen Ejecutivo Premium */}
      {resumenEjecutivo && resumenEjecutivo.length > 0 && (
        <div style={resumenStyle}>
          <h4 style={resumenTituloStyle}>⭐ Resumen Ejecutivo</h4>
          {resumenEjecutivo.map((item, index) => (
            <div key={index} style={resumenItemStyle}>
              {item}
            </div>
          ))}
        </div>
      )}

      {/* Conclusiones Principales */}
      <div style={insightsListStyle}>
        {insights.map((insight, index) => (
          <div
            key={index}
            style={{
              ...insightItemStyle,
              borderLeft: `4px solid ${getBorderColorByType(insight.tipo)}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = tokens.colors.bgPrimary;
              e.currentTarget.style.transform = 'translateX(4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = tokens.colors.bgTertiary;
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <span style={iconStyle}>{insight.icono}</span>
            <p style={textStyle}>{insight.texto}</p>
          </div>
        ))}
      </div>

      {/* Conclusión Final Tipo Analista */}
      {conclusionFinal && (
        <div style={conclusionFinalStyle}>
          <p style={conclusionFinalTextStyle}>
            <strong>Conclusión:</strong> {conclusionFinal}
          </p>
        </div>
      )}
    </div>
  );
}

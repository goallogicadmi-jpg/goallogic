import React from 'react';
import { tokens } from '../../styles/tokens';
import { generateGroupAnalysis } from '../../utils/cidGroupAnalysis';

/**
 * Componente para mostrar análisis del grupo usando Sistema CID
 */
export default function GroupAnalysisView({ standings, matches, groupName }) {
  const analysis = generateGroupAnalysis(standings, matches, groupName);

  if (!analysis || analysis.conclusiones.length === 0) {
    return null;
  }

  const containerStyle = {
    marginTop: tokens.spacing.xl,
  };

  const titleStyle = {
    fontSize: tokens.typography.fontSizeXl,
    fontWeight: tokens.typography.fontWeightBold,
    color: tokens.colors.textPrimary,
    marginBottom: tokens.spacing.md,
  };

  const resumenStyle = {
    marginBottom: tokens.spacing.lg,
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

  const conclusionItemStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.bgTertiary,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.spacing.md,
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
    <div style={containerStyle}>
      <h3 style={titleStyle}>📊 Análisis del {groupName}</h3>

      {/* Resumen Ejecutivo */}
      {analysis.resumenEjecutivo && analysis.resumenEjecutivo.length > 0 && (
        <div style={resumenStyle}>
          <h4 style={resumenTituloStyle}>⭐ Resumen Ejecutivo</h4>
          {analysis.resumenEjecutivo.map((item, index) => (
            <div key={index} style={resumenItemStyle}>
              {item}
            </div>
          ))}
        </div>
      )}

      {/* Conclusiones Principales */}
      <div>
        {analysis.conclusiones.map((conclusion, index) => (
          <div
            key={index}
            style={{
              ...conclusionItemStyle,
              borderLeft: `4px solid ${getBorderColorByType(conclusion.tipo)}`,
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
            <span style={iconStyle}>{conclusion.icono}</span>
            <p style={textStyle}>{conclusion.texto}</p>
          </div>
        ))}
      </div>

      {/* Conclusión Final */}
      {analysis.conclusionFinal && (
        <div style={conclusionFinalStyle}>
          <p style={conclusionFinalTextStyle}>
            <strong>Conclusión:</strong> {analysis.conclusionFinal}
          </p>
        </div>
      )}
    </div>
  );
}

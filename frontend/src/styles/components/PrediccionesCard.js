/**
 * Estilos para el componente PrediccionesCard
 * Centralizados para mantener consistencia y facilitar mantenimiento
 */

import { tokens } from '../tokens';
import { getAdvancedMetricLabelStyle } from '../../constants/advancedMetricLabels';

export const prediccionesCardStyles = {
  // Contenedor principal
  card: (variant = 'extended') => ({
    backgroundColor: tokens.colors.bgCard,
    borderRadius: tokens.radius.xl,
    padding: variant === 'compact' ? tokens.spacing.md : tokens.spacing.lg,
    marginTop: tokens.spacing.md,
    border: `1px solid ${tokens.colors.borderDefault}`,
    boxShadow: tokens.shadows.lg,
    opacity: 1,
    maxHeight: '1000px',
    overflow: 'hidden',
    transition: `opacity ${tokens.transitions.smooth}, max-height ${tokens.transitions.slow}, margin-top ${tokens.transitions.smooth}, transform ${tokens.transitions.smooth}, box-shadow ${tokens.transitions.normal}`,
    transform: 'translateY(0)',
    position: 'relative',
    
    // Animación de entrada
    '@keyframes slideIn': {
      from: {
        opacity: 0,
        transform: 'translateY(-10px)',
      },
      to: {
        opacity: 1,
        transform: 'translateY(0)',
      },
    },
    
    animation: 'slideIn 250ms ease-out',
  }),
  
  // Título
  title: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.typography.fontSizeSm,
    fontWeight: tokens.typography.fontWeightSemibold,
    marginBottom: tokens.spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    opacity: 0.9,
    textAlign: 'center',
  },
  
  // Contenedor de probabilidades
  probabilidadesContainer: (variant = 'extended') => ({
    display: 'grid',
    gridTemplateColumns: variant === 'compact' ? '1fr' : 'repeat(3, 1fr)',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  }),
  
  // Tarjeta de probabilidad individual
  probabilidadCard: {
    backgroundColor: tokens.colors.bgTertiary,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    textAlign: 'center',
    border: `1px solid ${tokens.colors.borderDefault}`,
    transition: `border-color ${tokens.transitions.normal}, transform ${tokens.transitions.fast}, box-shadow ${tokens.transitions.normal}, background-color ${tokens.transitions.normal}`,
    cursor: 'default',
    position: 'relative',
  },
  
  // Label de probabilidad
  probabilidadLabel: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.typography.fontSizeXs,
    fontWeight: tokens.typography.fontWeightMedium,
    marginBottom: tokens.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    opacity: 0.8,
  },
  
  // Valor de probabilidad
  probabilidadValor: {
    color: tokens.colors.accentInfo,
    fontSize: tokens.typography.fontSize2xl,
    fontWeight: tokens.typography.fontWeightBold,
    display: 'block',
    lineHeight: tokens.typography.lineHeightTight,
  },
  
  // Contenedor de goles
  golesContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.bgTertiary,
    borderRadius: tokens.radius.md,
    marginBottom: tokens.spacing.lg,
    border: `1px solid ${tokens.colors.borderDefault}`,
    position: 'relative',
    
    // Separador visual
    '::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '40px',
      height: '2px',
      backgroundColor: tokens.colors.accentOrange,
      borderRadius: tokens.radius.full,
    },
  },
  
  // Label de goles
  golesLabel: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.typography.fontSizeBase,
    fontWeight: tokens.typography.fontWeightMedium,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  
  // Valor de goles
  golesValor: {
    color: tokens.colors.textPrimary,
    fontSize: tokens.typography.fontSizeXl,
    fontWeight: tokens.typography.fontWeightBold,
    fontFamily: tokens.typography.fontFamilyMono,
    letterSpacing: '1px',
  },
  
  // Badge de recomendación
  recomendacionBadge: {
    backgroundColor: tokens.colors.accentPositive,
    color: tokens.colors.textPrimary,
    padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
    borderRadius: tokens.radius.md,
    fontSize: tokens.typography.fontSizeMd,
    fontWeight: tokens.typography.fontWeightBold,
    textAlign: 'center',
    display: 'block',
    width: '100%',
    boxShadow: tokens.shadows.glowGreen,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    position: 'relative',
    transition: `box-shadow ${tokens.transitions.normal}, transform ${tokens.transitions.fast}`,
  },
  
  // Separador visual
  separator: {
    height: '1px',
    backgroundColor: tokens.colors.borderDefault,
    margin: `${tokens.spacing.lg} 0`,
    opacity: 0.5,
  },
  
  // Sección de métricas avanzadas (preparada)
  metricasAvanzadas: {
    marginTop: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    borderTop: `1px solid ${tokens.colors.borderDefault}`,
  },
  
  metricasTitulo: {
    color: tokens.colors.textSecondary,
    fontSize: tokens.typography.fontSizeSm,
    marginBottom: tokens.spacing.md,
    textTransform: 'uppercase',
    fontWeight: tokens.typography.fontWeightSemibold,
  },
  
  metricasGrid: (variant = 'extended') => ({
    display: 'grid',
    gridTemplateColumns: variant === 'compact' ? '1fr' : 'repeat(2, 1fr)',
    gap: tokens.spacing.md,
  }),
  
  metricaCard: {
    backgroundColor: tokens.colors.bgTertiary,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.borderDefault}`,
  },
  
  metricaLabel: getAdvancedMetricLabelStyle(),
  
  metricaValor: {
    color: tokens.colors.accentInfo,
    fontSize: tokens.typography.fontSizeLg,
    fontWeight: tokens.typography.fontWeightSemibold,
  },
};

export default prediccionesCardStyles;

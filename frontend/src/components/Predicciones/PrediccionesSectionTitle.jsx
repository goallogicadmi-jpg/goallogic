import React from 'react';
import { tokens } from '../../styles/tokens';

const SIZE_MAP = {
  xl: tokens.typography.fontSize2xl,
  lg: tokens.typography.fontSizeXl,
  md: tokens.typography.fontSizeLg,
  base: tokens.typography.fontSizeBase,
  sm: tokens.typography.fontSizeSm,
};

/**
 * Título de sección con ícono SVG (módulo Predicciones).
 */
export default function PrediccionesSectionTitle({
  icon: Icon,
  children,
  as: Tag = 'h2',
  size = 'lg',
  align = 'left',
  className = '',
  style = {},
  iconColor,
  iconSize = 20,
}) {
  const titleStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: align === 'center' ? 'center' : 'flex-start',
    gap: tokens.spacing.sm,
    margin: 0,
    fontSize: SIZE_MAP[size] || SIZE_MAP.lg,
    fontWeight:
      size === 'xl' || Tag === 'h2' || Tag === 'h3'
        ? tokens.typography.fontWeightBold
        : tokens.typography.fontWeightSemibold,
    color: tokens.colors.textPrimary,
    lineHeight: tokens.typography.lineHeightTight,
    ...style,
  };

  return (
    <Tag className={`predicciones-section-title ${className}`.trim()} style={titleStyle}>
      {Icon ? (
        <span className="predicciones-section-title__icon" aria-hidden="true">
          <Icon size={iconSize} color={iconColor || tokens.colors.accentOrange} />
        </span>
      ) : null}
      <span>{children}</span>
    </Tag>
  );
}

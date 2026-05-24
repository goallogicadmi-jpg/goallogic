import React from 'react';
import { tokens } from '../../styles/tokens';

const SIZE_MAP = {
  lg: tokens.typography.fontSizeLg,
  md: tokens.typography.fontSizeMd,
  base: tokens.typography.fontSizeBase,
  sm: tokens.typography.fontSizeSm,
};

/**
 * Título de sección con ícono SVG (módulo Mi Cuenta, alineado con Predicciones).
 */
export default function CuentaSectionTitle({
  icon: Icon,
  children,
  as: Tag = 'h2',
  size = 'md',
  className = '',
  style = {},
  iconColor,
  iconSize = 18,
}) {
  const titleStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    margin: 0,
    fontSize: SIZE_MAP[size] || SIZE_MAP.md,
    fontWeight: tokens.typography.fontWeightSemibold,
    color: tokens.colors.textPrimary,
    lineHeight: tokens.typography.lineHeightTight,
    letterSpacing: '0.01em',
    ...style,
  };

  return (
    <Tag className={`cuenta-section-title ${className}`.trim()} style={titleStyle}>
      {Icon ? (
        <span className="cuenta-section-title__icon" aria-hidden="true">
          <Icon size={iconSize} color={iconColor || tokens.colors.accentOrange} />
        </span>
      ) : null}
      <span>{children}</span>
    </Tag>
  );
}

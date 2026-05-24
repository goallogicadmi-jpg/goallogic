import React, { useState } from 'react';
import { tokens } from '../../styles/tokens';
import { IconChevronDown } from './PrediccionesIcons';

/**
 * SeccionColapsable - Componente visual para secciones colapsables
 * Solo presentación, no modifica datos
 */
export default function SeccionColapsable({ titulo, icono, children, defaultAbierto = false }) {
  const [isAbierto, setIsAbierto] = useState(defaultAbierto);

  const containerStyle = {
    backgroundColor: tokens.colors.bgCard,
    border: `1px solid ${tokens.colors.borderDefault}`,
    borderRadius: tokens.radius.lg,
    marginTop: tokens.spacing.md,
    overflow: 'hidden',
    transition: tokens.transitions.normal,
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.bgSecondary,
    cursor: 'pointer',
    borderBottom: isAbierto ? `1px solid ${tokens.colors.borderDefault}` : 'none',
    transition: tokens.transitions.normal,
  };

  const tituloStyle = {
    fontSize: tokens.typography.fontSizeLg,
    fontWeight: tokens.typography.fontWeightSemibold,
    color: tokens.colors.textPrimary,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  };

  const chevronWrapStyle = {
    display: 'inline-flex',
    transition: tokens.transitions.normal,
    transform: isAbierto ? 'rotate(180deg)' : 'rotate(0deg)',
  };

  const contenidoStyle = {
    maxHeight: isAbierto ? '5000px' : '0',
    opacity: isAbierto ? 1 : 0,
    overflow: 'hidden',
    transition: `max-height ${tokens.transitions.slow}, opacity ${tokens.transitions.normal}`,
    padding: isAbierto ? tokens.spacing.lg : '0',
  };

  const toggle = () => setIsAbierto((open) => !open);

  return (
    <div style={containerStyle}>
      <div
        style={headerStyle}
        onClick={toggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <div style={tituloStyle}>
          {icono ? (
            <span className="predicciones-section-title__icon" aria-hidden="true">
              {icono}
            </span>
          ) : null}
          <span>{titulo}</span>
        </div>
        <span style={chevronWrapStyle} aria-hidden="true">
          <IconChevronDown />
        </span>
      </div>
      <div style={contenidoStyle}>{children}</div>
    </div>
  );
}



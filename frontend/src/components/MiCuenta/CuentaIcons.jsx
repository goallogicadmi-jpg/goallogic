import React from 'react';
import { tokens } from '../../styles/tokens';

const defaultProps = {
  size: 18,
  strokeWidth: 2,
  color: tokens.colors.accentOrange,
};

function IconBase({ size, strokeWidth, color, children }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconRendimiento(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </IconBase>
  );
}

export function IconEvolucionProfit(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </IconBase>
  );
}

export function IconPanelApuestas(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="7" y1="9" x2="17" y2="9" />
      <line x1="7" y1="13" x2="13" y2="13" />
    </IconBase>
  );
}

export function IconHistorial(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </IconBase>
  );
}

export function IconDashboard(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </IconBase>
  );
}

export function IconFavoritos(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </IconBase>
  );
}

export function IconSimulador(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </IconBase>
  );
}

export function IconApuestas(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </IconBase>
  );
}

export function IconMensajes(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </IconBase>
  );
}

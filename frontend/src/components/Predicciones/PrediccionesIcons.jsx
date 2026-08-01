import React from 'react';
import { tokens } from '../../styles/tokens';

const defaultProps = {
  size: 18,
  strokeWidth: 2,
  color: tokens.colors.accentOrange,
};

function IconBase({ size, strokeWidth, color, children, className }) {
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
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconInformeGeneral(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </IconBase>
  );
}

export function IconCuotasMercado(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </IconBase>
  );
}

export function IconVisionEstrategica(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </IconBase>
  );
}

export function IconAnalisisGlobal(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </IconBase>
  );
}

export function IconPanelRendimiento(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </IconBase>
  );
}

export function IconPanelOfensivo(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    </IconBase>
  );
}

export function IconPanelDefensivo(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </IconBase>
  );
}

export function IconMercadosEspeciales(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </IconBase>
  );
}

export function IconProyeccionCorners(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <polyline points="15 3 21 3 21 9" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <path d="M10 21H3v-7" />
    </IconBase>
  );
}

export function IconProyeccionDisciplinaria(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </IconBase>
  );
}

export function IconConclusiones(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </IconBase>
  );
}

export function IconPanoramaEquipo(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

export function IconHistorialDirecto(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M12 18v-6" />
      <path d="M9 15h6" />
    </IconBase>
  );
}

export function IconEstadoPlantel(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </IconBase>
  );
}

export function IconReferentesOfensivos(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </IconBase>
  );
}

export function IconJugadoresImportantes(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

export function IconDatosComplementarios(props) {
  const p = { ...defaultProps, ...props };
  return (
    <IconBase {...p}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </IconBase>
  );
}

export function IconChevronDown({ size = 16, color = tokens.colors.textMuted, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

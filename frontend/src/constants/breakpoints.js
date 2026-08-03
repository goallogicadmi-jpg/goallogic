/**
 * Breakpoints unificados — alineados con CSS (@media max-width).
 * ≤768px móvil · ≤480px compacto · ≤360px ultra compacto
 */
export const BREAKPOINTS = {
  MOBILE: 768,
  COMPACT: 480,
  ULTRA_COMPACT: 360,
};

export const MEDIA_QUERIES = {
  MOBILE: `(max-width: ${BREAKPOINTS.MOBILE}px)`,
  COMPACT: `(max-width: ${BREAKPOINTS.COMPACT}px)`,
  ULTRA_COMPACT: `(max-width: ${BREAKPOINTS.ULTRA_COMPACT}px)`,
  DESKTOP: `(min-width: ${BREAKPOINTS.MOBILE + 1}px)`,
};

/**
 * Design Tokens - GoalLogic Design System
 * Tokens centralizados para mantener consistencia visual en toda la aplicación
 */

export const tokens = {
  // Colores
  colors: {
    // Fondos
    bgMain: '#0D0D0D',
    bgSecondary: '#181b20',
    bgCard: '#181b20',
    bgPremium: '#181b20',
    bgTertiary: '#0D0D0D',
    bgElevated: '#242424',
    
    // Bordes
    borderDefault: 'rgba(255, 255, 255, 0.06)',
    borderHover: 'rgba(255, 255, 255, 0.12)',
    borderLight: 'rgba(255, 255, 255, 0.08)',
    
    // Textos
    textPrimary: '#FFFFFF',
    textSecondary: '#9aa4b2',
    textMuted: '#7A8190',
    textDisabled: '#7A8190',
    
    // Acentos GoalLogic
    accentOrange: '#F28A00',
    accentOrangeDark: '#D47900',
    accentGold: '#D4A017',
    accentMetallic: '#C0C0C0',
    
    // Estados
    accentPositive: '#22C55E',
    accentNegative: '#EF4444',
    accentNeutral: '#6B7280',
    accentInfo: '#2196F3',
    
    // Hover y overlays
    accentHover: 'rgba(242, 138, 0, 0.15)',
    overlayDark: 'rgba(0, 0, 0, 0.3)',
    overlayLight: 'rgba(255, 255, 255, 0.05)',
  },
  
  // Tipografía
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontFamilyMono: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
    
    // Tamaños
    fontSizeXs: '11px',
    fontSizeSm: '12px',
    fontSizeBase: '13px',
    fontSizeMd: '14px',
    fontSizeLg: '16px',
    fontSizeXl: '18px',
    fontSize2xl: '20px',
    fontSize3xl: '24px',
    
    // Pesos
    fontWeightNormal: 400,
    fontWeightMedium: 500,
    fontWeightSemibold: 600,
    fontWeightBold: 700,
    
    // Alturas de línea
    lineHeightTight: 1.2,
    lineHeightNormal: 1.5,
    lineHeightRelaxed: 1.75,
  },
  
  // Espaciado
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  
  // Border Radius
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '14px',
    container: '14px',
    card: '12px',
    '2xl': '16px',
    full: '9999px',
  },
  
  // Sombras
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px rgba(0, 0, 0, 0.15)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.2)',
    xl: '0 12px 24px rgba(0, 0, 0, 0.25)',
    glow: '0 0 20px rgba(242, 138, 0, 0.3)',
    glowGreen: '0 0 20px rgba(76, 175, 80, 0.3)',
    glowBlue: '0 0 20px rgba(33, 150, 243, 0.3)',
  },
  
  // Transiciones
  transitions: {
    fast: '150ms ease-in-out',
    normal: '200ms ease-in-out',
    slow: '300ms ease-in-out',
    smooth: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  // Breakpoints (para detección de viewport)
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1280,
  },
  
  // Z-index layers
  zIndex: {
    base: 1,
    elevated: 10,
    dropdown: 100,
    modal: 1000,
    tooltip: 2000,
  },
};

export default tokens;

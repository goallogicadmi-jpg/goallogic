import React, { useState, useMemo } from 'react';
import { tokens } from '../../styles/tokens';
import useMediaQuery from '../../hooks/useMediaQuery';
import { MEDIA_QUERIES } from '../../constants/breakpoints';
import {
  ADVANCED_METRIC_LABELS as ML,
  ADVANCED_METRIC_LABEL_CLASS,
  getAdvancedMetricLabelStyle,
} from '../../constants/advancedMetricLabels';
import {
  resolveDisplayXg,
  resolveDisplayXga,
  formatXgPromedioLabel,
  formatXgaPromedioLabel,
} from '../../utils/xgDisplayUtils';
import { buildConclusionesComparativaEquipos } from '../../utils/conclusionesCopy';
import { PREDICCIONES_TITLES } from '../../constants/prediccionesSectionTitles';
import PrediccionesSectionTitle from './PrediccionesSectionTitle';
import {
  IconAnalisisGlobal,
  IconMercadosEspeciales,
  IconPanelOfensivo,
  IconPanelDefensivo,
  IconPanelRendimiento,
  IconProyeccionCorners,
  IconProyeccionDisciplinaria,
  IconConclusiones,
} from './PrediccionesIcons';
import PremiumTabs from '../ui/PremiumTabs';

const COMPARACION_TABS = [
  { id: 'especiales', label: PREDICCIONES_TITLES.mercadosEspeciales, Icon: IconMercadosEspeciales },
  { id: 'ataque', label: PREDICCIONES_TITLES.panelOfensivo, Icon: IconPanelOfensivo },
  { id: 'defensa', label: PREDICCIONES_TITLES.panelDefensivo, Icon: IconPanelDefensivo },
  { id: 'rendimiento', label: PREDICCIONES_TITLES.panelRendimiento, Icon: IconPanelRendimiento },
];

/**
 * ComparacionConTabs - Reorganización visual de ComparacionDatosReales con tabs
 * Solo reorganización visual, no modifica lógica de datos
 */
export default function ComparacionConTabs({ predicciones, equipoA, equipoB, datosAdicionales, loadingDatosAdicionales = false }) {
  const [activeTab, setActiveTab] = useState('especiales');
  const isMobile = useMediaQuery(MEDIA_QUERIES.MOBILE);

  const xgDisplayA = useMemo(() => resolveDisplayXg(equipoA), [equipoA]);
  const xgDisplayB = useMemo(() => resolveDisplayXg(equipoB), [equipoB]);
  const xgaDisplayA = useMemo(() => resolveDisplayXga(equipoA), [equipoA]);
  const xgaDisplayB = useMemo(() => resolveDisplayXga(equipoB), [equipoB]);

  const eficienciaOfensivaA = useMemo(() => {
    const xG = xgDisplayA.value || 0;
    const goles = equipoA?.promedioGolesFavor || 0;
    if (xG === 0) return null;
    return ((goles / xG) * 100).toFixed(1);
  }, [equipoA, xgDisplayA]);

  const eficienciaOfensivaB = useMemo(() => {
    const xG = xgDisplayB.value || 0;
    const goles = equipoB?.promedioGolesFavor || 0;
    if (xG === 0) return null;
    return ((goles / xG) * 100).toFixed(1);
  }, [equipoB, xgDisplayB]);

  const eficienciaDefensivaA = useMemo(() => {
    const xGA = xgaDisplayA.value || 0;
    const golesRecibidos = equipoA?.promedioGolesContra || 0;
    if (xGA === 0) return null;
    return ((golesRecibidos / xGA) * 100).toFixed(1);
  }, [equipoA, xgaDisplayA]);

  const eficienciaDefensivaB = useMemo(() => {
    const xGA = xgaDisplayB.value || 0;
    const golesRecibidos = equipoB?.promedioGolesContra || 0;
    if (xGA === 0) return null;
    return ((golesRecibidos / xGA) * 100).toFixed(1);
  }, [equipoB, xgaDisplayB]);

  const insights = useMemo(
    () => buildConclusionesComparativaEquipos(predicciones, equipoA, equipoB),
    [predicciones, equipoA, equipoB]
  );

  const cornersEsperados = datosAdicionales?.cornersYFaltas?.cornersEsperados;
  const tarjetasEsperadas = datosAdicionales?.cornersYFaltas?.tarjetasEsperadas;
  const hasCornersData = Boolean(cornersEsperados);
  const hasTarjetasData = Boolean(tarjetasEsperadas);

  const mercadoEspecialPlaceholderStyle = {
    padding: tokens.spacing.md,
    color: tokens.colors.textSecondary,
    fontSize: tokens.typography.fontSizeSm,
    textAlign: 'center',
    backgroundColor: tokens.colors.bgSecondary,
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.borderDefault}`,
  };

  const comparacionGridClassName = `predicciones-comparacion-grid${
    isMobile ? ' predicciones-comparacion-grid--stacked' : ''
  }`;

  const columnaTituloStyle = {
    fontSize: tokens.typography.fontSizeBase,
    fontWeight: tokens.typography.fontWeightSemibold,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.sm,
    textAlign: 'center',
  };

  const metricaStyle = {
    marginBottom: tokens.spacing.md,
  };

  const metricaLabelStyle = getAdvancedMetricLabelStyle({}, 'dark', 'compact');

  const metricaValorStyle = {
    fontSize: tokens.typography.fontSize2xl,
    fontWeight: tokens.typography.fontWeightBold,
    color: tokens.colors.textPrimary,
  };

  /**
   * Función helper para determinar el color de una métrica según su tipo y comparación
   * @param {number|string} valorA - Valor del equipo A
   * @param {number|string} valorB - Valor del equipo B
   * @param {boolean} masEsMejor - true si "más es mejor", false si "más es peor"
   * @param {boolean} esEquipoA - true si estamos evaluando el equipo A, false para equipo B
   * @param {string} nombreMetrica - Nombre de la métrica para logging (opcional)
   * @returns {string} - Color a aplicar (accentPositive para verde, accentNegative para rojo, o textPrimary para neutro)
   */
  const obtenerColorMetrica = (valorA, valorB, masEsMejor, esEquipoA, nombreMetrica = '') => {
    // Normalizar tipos de datos: convertir a número
    const numA = parseFloat(valorA) || 0;
    const numB = parseFloat(valorB) || 0;
    
    // Tolerancia para comparaciones de igualdad (evitar problemas de precisión de punto flotante)
    const TOLERANCIA = 0.001;
    
    // Logging detallado para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development' && nombreMetrica) {
      console.log(`[Comparación ${nombreMetrica}]`, {
        equipo: esEquipoA ? 'A' : 'B',
        valorA_original: valorA,
        valorB_original: valorB,
        valorA_normalizado: numA,
        valorB_normalizado: numB,
        tipoA_original: typeof valorA,
        tipoB_original: typeof valorB,
        masEsMejor,
        diferencia: Math.abs(numA - numB)
      });
    }
    
    // Si los valores son iguales (dentro de la tolerancia), color neutro
    if (Math.abs(numA - numB) < TOLERANCIA) {
      return tokens.colors.textPrimary;
    }

    let esMejor;
    if (masEsMejor) {
      // Para métricas donde "más es mejor": el equipo con mayor valor es mejor
      esMejor = esEquipoA ? numA > numB : numB > numA;
    } else {
      // Para métricas donde "más es peor": el equipo con menor valor es mejor
      esMejor = esEquipoA ? numA < numB : numB < numA;
    }

    const color = esMejor ? tokens.colors.accentPositive : tokens.colors.accentNegative;
    
    // Logging del resultado (solo en desarrollo)
    if (process.env.NODE_ENV === 'development' && nombreMetrica) {
      console.log(`[Resultado ${nombreMetrica}]`, {
        equipo: esEquipoA ? 'A' : 'B',
        esMejor,
        color: esMejor ? 'VERDE' : 'ROJO',
        razon: masEsMejor 
          ? (esMejor ? 'Mayor valor' : 'Menor valor')
          : (esMejor ? 'Menor valor' : 'Mayor valor')
      });
    }
    
    return color;
  };

  /**
   * Función para obtener el color de la eficiencia defensiva basado en rangos fijos
   * @param {number|null} value - Valor de la eficiencia defensiva (porcentaje)
   * @returns {string} - Color a aplicar según el rango
   * Nota: Valores menores indican mejor defensa (recibe menos goles de los esperados)
   * 
   * Rangos:
   * - < 80%: Verde (defensa muy eficiente - recibe mucho menos de lo esperado)
   * - 80-95%: Amarillo (defensa normal - recibe cerca de lo esperado)
   * - ≥ 95%: Rojo (defensa ineficiente - recibe más de lo esperado)
   */
  const getDefensiveEfficiencyColor = (value) => {
    // Normalizar a número si viene como string
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (numValue === null || numValue === undefined || isNaN(numValue)) {
      return tokens.colors.textPrimary; // Color neutro si no hay valor
    }
    
    // Logging para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      const rango = numValue < 80 ? '< 80% (Verde)' : numValue < 95 ? '80-95% (Amarillo)' : '≥ 95% (Rojo)';
      const color = numValue < 80 ? 'VERDE' : numValue < 95 ? 'AMARILLO' : 'ROJO';
      console.log('[Eficiencia Defensiva]', {
        valor_original: value,
        valor_normalizado: numValue,
        tipo_original: typeof value,
        rango,
        color_aplicado: color
      });
    }
    
    if (numValue < 80) return tokens.colors.accentPositive; // Verde - defensa muy eficiente
    if (numValue < 95) return tokens.colors.accentGold; // Amarillo - defensa dentro de lo esperado
    return tokens.colors.accentNegative; // Rojo - defensa ineficiente
  };

  /**
   * Función para obtener el color de la eficiencia ofensiva basado en rangos fijos
   * @param {number|null} value - Valor de la eficiencia ofensiva (porcentaje)
   * @returns {string} - Color a aplicar según el rango
   */
  const getOffensiveEfficiencyColor = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return tokens.colors.textPrimary; // Color neutro si no hay valor
    }
    if (value < 90) return tokens.colors.accentNegative; // Rojo
    if (value < 110) return tokens.colors.accentGold; // Amarillo
    return tokens.colors.accentPositive; // Verde
  };

  // Renderizar contenido según tab activo
  const renderTabContent = () => {
    switch (activeTab) {
      case 'rendimiento':
        return (
          <div className={comparacionGridClassName}>
            <div className="predicciones-comparacion-column">
              <div style={columnaTituloStyle}>{equipoA?.nombre || 'Equipo A'}</div>
              <div style={metricaStyle}>
                <span style={metricaLabelStyle}>G / E / P</span>
                <div style={metricaValorStyle}>
                  {predicciones.formaA.ganados} / {predicciones.formaA.empatados} / {predicciones.formaA.perdidos}
                </div>
              </div>
              <div style={metricaStyle}>
                <span style={metricaLabelStyle}>Puntos</span>
                <div style={metricaValorStyle}>{predicciones.puntosFormaA} pts</div>
              </div>
            </div>
            <div className="predicciones-comparacion-column">
              <div style={columnaTituloStyle}>{equipoB?.nombre || 'Equipo B'}</div>
              <div style={metricaStyle}>
                <span style={metricaLabelStyle}>G / E / P</span>
                <div style={metricaValorStyle}>
                  {predicciones.formaB.ganados} / {predicciones.formaB.empatados} / {predicciones.formaB.perdidos}
                </div>
              </div>
              <div style={metricaStyle}>
                <span style={metricaLabelStyle}>Puntos</span>
                <div style={metricaValorStyle}>{predicciones.puntosFormaB} pts</div>
              </div>
            </div>
          </div>
        );

      case 'ataque':
        return (
          <div className={comparacionGridClassName}>
            <div className="predicciones-comparacion-column">
              <div style={columnaTituloStyle}>{equipoA?.nombre || 'Equipo A'}</div>
              <div style={metricaStyle}>
                <span style={metricaLabelStyle}>Promedio Goles</span>
                <div style={metricaValorStyle}>
                  {(equipoA?.promedioGolesFavor || 0).toFixed(2)}
                </div>
              </div>
              <div style={metricaStyle}>
                <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>
                  {formatXgPromedioLabel(xgDisplayA.source)}
                </span>
                <div style={metricaValorStyle}>
                  {xgDisplayA.value != null ? xgDisplayA.value.toFixed(2) : 'N/D'}
                </div>
              </div>
              <div style={metricaStyle}>
                <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>{ML.over25}</span>
                <div style={metricaValorStyle}>{predicciones.over25A}%</div>
              </div>
              {eficienciaOfensivaA && (
                <div style={metricaStyle}>
                  <span style={metricaLabelStyle}>Eficiencia Ofensiva</span>
                  <div style={{ 
                    ...metricaValorStyle, 
                    color: getOffensiveEfficiencyColor(parseFloat(eficienciaOfensivaA))
                  }}>
                    {eficienciaOfensivaA}%
                  </div>
                </div>
              )}
            </div>
            <div className="predicciones-comparacion-column">
              <div style={columnaTituloStyle}>{equipoB?.nombre || 'Equipo B'}</div>
              <div style={metricaStyle}>
                <span style={metricaLabelStyle}>Promedio Goles</span>
                <div style={metricaValorStyle}>
                  {(equipoB?.promedioGolesFavor || 0).toFixed(2)}
                </div>
              </div>
              <div style={metricaStyle}>
                <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>
                  {formatXgPromedioLabel(xgDisplayB.source)}
                </span>
                <div style={metricaValorStyle}>
                  {xgDisplayB.value != null ? xgDisplayB.value.toFixed(2) : 'N/D'}
                </div>
              </div>
              <div style={metricaStyle}>
                <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>{ML.over25}</span>
                <div style={metricaValorStyle}>{predicciones.over25B}%</div>
              </div>
              {eficienciaOfensivaB && (
                <div style={metricaStyle}>
                  <span style={metricaLabelStyle}>Eficiencia Ofensiva</span>
                  <div style={{ 
                    ...metricaValorStyle, 
                    color: getOffensiveEfficiencyColor(parseFloat(eficienciaOfensivaB))
                  }}>
                    {eficienciaOfensivaB}%
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'defensa':
        // Calcular valores para comparación - NORMALIZAR TIPOS
        const golesRecibidosA = parseFloat(equipoA?.promedioGolesContra) || 0;
        const golesRecibidosB = parseFloat(equipoB?.promedioGolesContra) || 0;
        const xGAA = xgaDisplayA.value != null ? parseFloat(xgaDisplayA.value) : 0;
        const xGAB = xgaDisplayB.value != null ? parseFloat(xgaDisplayB.value) : 0;
        const cleanSheetsA = parseFloat(predicciones.cleanSheetsA) || 0;
        const cleanSheetsB = parseFloat(predicciones.cleanSheetsB) || 0;
        const eficienciaDefA = eficienciaDefensivaA ? parseFloat(eficienciaDefensivaA) : null;
        const eficienciaDefB = eficienciaDefensivaB ? parseFloat(eficienciaDefensivaB) : null;
        
        // Logging para debugging del caso específico (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
          const nombreEquipoA = equipoA?.nombre || 'Equipo A';
          const nombreEquipoB = equipoB?.nombre || 'Equipo B';
          console.log('🛡️ [DEFENSA] Valores normalizados:', {
            [nombreEquipoA]: {
              golesRecibidos: golesRecibidosA,
              xGA: xGAA,
              cleanSheets: cleanSheetsA,
              eficienciaDef: eficienciaDefA
            },
            [nombreEquipoB]: {
              golesRecibidos: golesRecibidosB,
              xGA: xGAB,
              cleanSheets: cleanSheetsB,
              eficienciaDef: eficienciaDefB
            },
            valoresOriginales: {
              golesRecibidosA_orig: equipoA?.promedioGolesContra,
              golesRecibidosB_orig: equipoB?.promedioGolesContra,
              xGAA_orig: equipoA?.estadisticasDefensivas?.xGA,
              xGAB_orig: equipoB?.estadisticasDefensivas?.xGA,
              cleanSheetsA_orig: predicciones.cleanSheetsA,
              cleanSheetsB_orig: predicciones.cleanSheetsB
            }
          });
        }

        return (
          <div className={comparacionGridClassName}>
            <div className="predicciones-comparacion-column">
              <div style={columnaTituloStyle}>{equipoA?.nombre || 'Equipo A'}</div>
              <div style={metricaStyle}>
                <span style={metricaLabelStyle}>Promedio Goles Recibidos</span>
                <div style={{ 
                  ...metricaValorStyle, 
                  color: obtenerColorMetrica(golesRecibidosA, golesRecibidosB, false, true, 'Goles Recibidos - Equipo A')
                }}>
                  {golesRecibidosA.toFixed(2)}
                </div>
              </div>
              <div style={metricaStyle}>
                <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>
                  {formatXgaPromedioLabel(xgaDisplayA.source)}
                </span>
                <div style={{ 
                  ...metricaValorStyle, 
                  color: xGAA > 0 ? obtenerColorMetrica(xGAA, xGAB, false, true, 'xGA - Equipo A') : metricaValorStyle.color
                }}>
                  {xGAA > 0 ? xGAA.toFixed(2) : 'N/D'}
                </div>
              </div>
              <div style={metricaStyle}>
                <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>{ML.cleanSheets}</span>
                <div style={{ 
                  ...metricaValorStyle, 
                  color: obtenerColorMetrica(cleanSheetsA, cleanSheetsB, true, true, 'Clean Sheets - Equipo A')
                }}>
                  {cleanSheetsA.toFixed(1)}%
                </div>
              </div>
              {eficienciaDefensivaA && (() => {
                const colorAplicado = getDefensiveEfficiencyColor(eficienciaDefA);
                const estiloFinal = { 
                  ...metricaValorStyle, 
                  color: colorAplicado
                };
                
                // Logging detallado del estilo final (solo en desarrollo)
                if (process.env.NODE_ENV === 'development') {
                  console.log('[Eficiencia Defensiva - Equipo A] Estilo Final Aplicado:', {
                    valor: eficienciaDefensivaA,
                    valor_parseado: eficienciaDefA,
                    color_devuelto: colorAplicado,
                    estilo_final: estiloFinal,
                    color_en_estilo: estiloFinal.color
                  });
                }
                
                return (
                  <div style={metricaStyle}>
                    <span style={metricaLabelStyle}>Eficiencia Defensiva</span>
                    <div style={estiloFinal}>
                      {eficienciaDefensivaA}%
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="predicciones-comparacion-column">
              <div style={columnaTituloStyle}>{equipoB?.nombre || 'Equipo B'}</div>
              <div style={metricaStyle}>
                <span style={metricaLabelStyle}>Promedio Goles Recibidos</span>
                <div style={{ 
                  ...metricaValorStyle, 
                  color: obtenerColorMetrica(golesRecibidosA, golesRecibidosB, false, false, 'Goles Recibidos - Equipo B')
                }}>
                  {golesRecibidosB.toFixed(2)}
                </div>
              </div>
              <div style={metricaStyle}>
                <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>
                  {formatXgaPromedioLabel(xgaDisplayB.source)}
                </span>
                <div style={{ 
                  ...metricaValorStyle, 
                  color: xGAB > 0 ? obtenerColorMetrica(xGAA, xGAB, false, false, 'xGA - Equipo B') : metricaValorStyle.color
                }}>
                  {xGAB > 0 ? xGAB.toFixed(2) : 'N/D'}
                </div>
              </div>
              <div style={metricaStyle}>
                <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>{ML.cleanSheets}</span>
                <div style={{ 
                  ...metricaValorStyle, 
                  color: obtenerColorMetrica(cleanSheetsA, cleanSheetsB, true, false, 'Clean Sheets - Equipo B')
                }}>
                  {cleanSheetsB.toFixed(1)}%
                </div>
              </div>
              {eficienciaDefensivaB && (() => {
                const colorAplicado = getDefensiveEfficiencyColor(eficienciaDefB);
                const estiloFinal = { 
                  ...metricaValorStyle, 
                  color: colorAplicado
                };
                
                // Logging detallado del estilo final (solo en desarrollo)
                if (process.env.NODE_ENV === 'development') {
                  console.log('[Eficiencia Defensiva - Equipo B] Estilo Final Aplicado:', {
                    valor: eficienciaDefensivaB,
                    valor_parseado: eficienciaDefB,
                    color_devuelto: colorAplicado,
                    estilo_final: estiloFinal,
                    color_en_estilo: estiloFinal.color
                  });
                }
                
                return (
                  <div style={metricaStyle}>
                    <span style={metricaLabelStyle}>Eficiencia Defensiva</span>
                    <div style={estiloFinal}>
                      {eficienciaDefensivaB}%
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        );

      case 'especiales':
        return (
          <div>
            {(loadingDatosAdicionales || hasCornersData) && (
              <div style={{ marginBottom: tokens.spacing.xl }}>
                <PrediccionesSectionTitle
                  as="h4"
                  size="md"
                  icon={IconProyeccionCorners}
                  style={{ marginBottom: tokens.spacing.md }}
                >
                  {PREDICCIONES_TITLES.proyeccionCorners}
                </PrediccionesSectionTitle>
                {loadingDatosAdicionales && !hasCornersData ? (
                  <div style={mercadoEspecialPlaceholderStyle} role="status">
                    Calculando tiros de esquina esperados…
                  </div>
                ) : (
                  <>
                    <div className={comparacionGridClassName}>
                      <div className="predicciones-comparacion-column">
                        <div style={columnaTituloStyle}>{equipoA?.nombre || 'Equipo A'}</div>
                        <div style={metricaStyle}>
                          <span style={metricaLabelStyle}>Corners Esperados</span>
                          <div style={{ ...metricaValorStyle, color: tokens.colors.accentOrange }}>
                            {cornersEsperados.expectedA}
                          </div>
                        </div>
                      </div>
                      <div className="predicciones-comparacion-column">
                        <div style={columnaTituloStyle}>{equipoB?.nombre || 'Equipo B'}</div>
                        <div style={metricaStyle}>
                          <span style={metricaLabelStyle}>Corners Esperados</span>
                          <div style={{ ...metricaValorStyle, color: tokens.colors.accentOrange }}>
                            {cornersEsperados.expectedB}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="predicciones-comparacion-column predicciones-comparacion-column--centered">
                      <span style={metricaLabelStyle}>Corners Totales Esperados</span>
                      <div style={{ ...metricaValorStyle, fontSize: tokens.typography.fontSize3xl, color: tokens.colors.accentOrange }}>
                        {cornersEsperados.total}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {(loadingDatosAdicionales || hasTarjetasData) && (
              <div style={{ marginBottom: tokens.spacing.xl }}>
                <PrediccionesSectionTitle
                  as="h4"
                  size="md"
                  icon={IconProyeccionDisciplinaria}
                  style={{ marginBottom: tokens.spacing.md }}
                >
                  {PREDICCIONES_TITLES.proyeccionDisciplinaria}
                </PrediccionesSectionTitle>
                {loadingDatosAdicionales && !hasTarjetasData ? (
                  <div style={mercadoEspecialPlaceholderStyle} role="status">
                    Calculando tarjetas esperadas…
                  </div>
                ) : (
                  <>
                    <div className={comparacionGridClassName}>
                      <div className="predicciones-comparacion-column">
                        <div style={columnaTituloStyle}>{equipoA?.nombre || 'Equipo A'}</div>
                        <div style={metricaStyle}>
                          <span style={metricaLabelStyle}>Tarjetas Esperadas</span>
                          <div style={{ ...metricaValorStyle, color: tokens.colors.accentGold }}>
                            {tarjetasEsperadas.expectedA}
                          </div>
                        </div>
                      </div>
                      <div className="predicciones-comparacion-column">
                        <div style={columnaTituloStyle}>{equipoB?.nombre || 'Equipo B'}</div>
                        <div style={metricaStyle}>
                          <span style={metricaLabelStyle}>Tarjetas Esperadas</span>
                          <div style={{ ...metricaValorStyle, color: tokens.colors.accentGold }}>
                            {tarjetasEsperadas.expectedB}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="predicciones-comparacion-column predicciones-comparacion-column--centered">
                      <span style={metricaLabelStyle}>Tarjetas Totales Esperadas</span>
                      <div style={{ ...metricaValorStyle, fontSize: tokens.typography.fontSize3xl, color: tokens.colors.accentGold }}>
                        {tarjetasEsperadas.total}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Conclusiones (siempre visibles; mensaje base si no hay diferencias claras) */}
            <div style={{ marginTop: tokens.spacing.xl, padding: tokens.spacing.md, backgroundColor: tokens.colors.bgSecondary, borderRadius: tokens.radius.md, border: `1px solid ${tokens.colors.borderDefault}` }}>
                <PrediccionesSectionTitle
                  as="h4"
                  size="base"
                  icon={IconConclusiones}
                  style={{ marginBottom: tokens.spacing.sm }}
                >
                  {PREDICCIONES_TITLES.conclusionesEstrategicas}
                </PrediccionesSectionTitle>
                {insights.map((insight, index) => (
                  <div key={index} style={{ fontSize: tokens.typography.fontSizeSm, color: tokens.colors.textSecondary, lineHeight: tokens.typography.lineHeightRelaxed, marginBottom: tokens.spacing.xs, paddingLeft: tokens.spacing.md, borderLeft: `3px solid ${tokens.colors.accentOrange}` }}>
                    {insight}
                  </div>
                ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="predicciones-comparacion-panel">
      <PrediccionesSectionTitle
        as="h3"
        size="xl"
        icon={IconAnalisisGlobal}
        style={{ marginBottom: tokens.spacing.lg }}
      >
        {PREDICCIONES_TITLES.analisisGlobal}
      </PrediccionesSectionTitle>
      
      <PremiumTabs
        tabs={COMPARACION_TABS.map(({ id, label }) => ({ id, label }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ariaLabel="Análisis comparativo"
        renderTab={(tab) => {
          const tabDef = COMPARACION_TABS.find((item) => item.id === tab.id);
          const Icon = tabDef?.Icon;
          const isActive = activeTab === tab.id;
          return (
            <span className="gl-tab__content">
              {Icon ? (
                <Icon
                  size={16}
                  color={isActive ? '#4fc3f7' : tokens.colors.textSecondary}
                />
              ) : null}
              {tab.label}
            </span>
          );
        }}
      />

      <div>
        {renderTabContent()}
      </div>
    </div>
  );
}

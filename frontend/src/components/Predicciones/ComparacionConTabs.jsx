import React, { useState, useEffect, useMemo } from 'react';
import { tokens } from '../../styles/tokens';
import {
  ADVANCED_METRIC_LABELS as ML,
  ADVANCED_METRIC_LABEL_CLASS,
  getAdvancedMetricLabelStyle,
} from '../../constants/advancedMetricLabels';
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
export default function ComparacionConTabs({ predicciones, equipoA, equipoB, datosAdicionales }) {
  const [activeTab, setActiveTab] = useState('especiales');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calcular eficiencias (misma lógica, solo visual)
  const eficienciaOfensivaA = useMemo(() => {
    const xG = equipoA?.estadisticasOfensivas?.xG || 0;
    const goles = equipoA?.promedioGolesFavor || 0;
    if (xG === 0) return null;
    return ((goles / xG) * 100).toFixed(1);
  }, [equipoA]);

  const eficienciaOfensivaB = useMemo(() => {
    const xG = equipoB?.estadisticasOfensivas?.xG || 0;
    const goles = equipoB?.promedioGolesFavor || 0;
    if (xG === 0) return null;
    return ((goles / xG) * 100).toFixed(1);
  }, [equipoB]);

  const eficienciaDefensivaA = useMemo(() => {
    const xGA = equipoA?.estadisticasDefensivas?.xGA || 0;
    const golesRecibidos = equipoA?.promedioGolesContra || 0;
    if (xGA === 0) return null;
    return ((golesRecibidos / xGA) * 100).toFixed(1);
  }, [equipoA]);

  const eficienciaDefensivaB = useMemo(() => {
    const xGA = equipoB?.estadisticasDefensivas?.xGA || 0;
    const golesRecibidos = equipoB?.promedioGolesContra || 0;
    if (xGA === 0) return null;
    return ((golesRecibidos / xGA) * 100).toFixed(1);
  }, [equipoB]);

  const insights = useMemo(
    () => buildConclusionesComparativaEquipos(predicciones, equipoA, equipoB),
    [predicciones, equipoA, equipoB]
  );

  const containerStyle = {
    backgroundColor: tokens.colors.bgCard,
    border: `1px solid ${tokens.colors.borderDefault}`,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    marginTop: tokens.spacing.xl,
  };

  const tabsContainerStyle = {
    display: 'flex',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
    borderBottom: `2px solid ${tokens.colors.borderDefault}`,
    paddingBottom: tokens.spacing.sm,
    flexWrap: 'wrap',
  };

  const tabStyle = (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    backgroundColor: active ? tokens.colors.accentOrange : 'transparent',
    color: active ? tokens.colors.textPrimary : tokens.colors.textSecondary,
    border: 'none',
    borderRadius: tokens.radius.md,
    cursor: 'pointer',
    fontSize: tokens.typography.fontSizeBase,
    fontWeight: active ? tokens.typography.fontWeightSemibold : tokens.typography.fontWeightNormal,
    transition: tokens.transitions.normal,
  });

  const comparacionGridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: tokens.spacing.md,
  };

  const columnaStyle = {
    backgroundColor: tokens.colors.bgSecondary,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.borderDefault}`,
  };

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
          <div style={comparacionGridStyle}>
            <div style={columnaStyle}>
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
            <div style={columnaStyle}>
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
          <div style={comparacionGridStyle}>
            <div style={columnaStyle}>
              <div style={columnaTituloStyle}>{equipoA?.nombre || 'Equipo A'}</div>
              <div style={metricaStyle}>
                <span style={metricaLabelStyle}>Promedio Goles</span>
                <div style={metricaValorStyle}>
                  {(equipoA?.promedioGolesFavor || 0).toFixed(2)}
                </div>
              </div>
              {equipoA?.estadisticasOfensivas?.xG !== null && equipoA?.estadisticasOfensivas?.xG !== undefined && (
                <div style={metricaStyle}>
                  <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>{ML.xGPromedio}</span>
                  <div style={metricaValorStyle}>
                    {equipoA.estadisticasOfensivas.xG.toFixed(2)}
                  </div>
                </div>
              )}
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
            <div style={columnaStyle}>
              <div style={columnaTituloStyle}>{equipoB?.nombre || 'Equipo B'}</div>
              <div style={metricaStyle}>
                <span style={metricaLabelStyle}>Promedio Goles</span>
                <div style={metricaValorStyle}>
                  {(equipoB?.promedioGolesFavor || 0).toFixed(2)}
                </div>
              </div>
              {equipoB?.estadisticasOfensivas?.xG !== null && equipoB?.estadisticasOfensivas?.xG !== undefined && (
                <div style={metricaStyle}>
                  <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>{ML.xGPromedio}</span>
                  <div style={metricaValorStyle}>
                    {equipoB.estadisticasOfensivas.xG.toFixed(2)}
                  </div>
                </div>
              )}
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
        const xGAA = parseFloat(equipoA?.estadisticasDefensivas?.xGA) || 0;
        const xGAB = parseFloat(equipoB?.estadisticasDefensivas?.xGA) || 0;
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
          <div style={comparacionGridStyle}>
            <div style={columnaStyle}>
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
              {equipoA?.estadisticasDefensivas?.xGA !== null && equipoA?.estadisticasDefensivas?.xGA !== undefined && (
                <div style={metricaStyle}>
                  <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>{ML.xGAPromedio}</span>
                  <div style={{ 
                    ...metricaValorStyle, 
                    color: obtenerColorMetrica(xGAA, xGAB, false, true, 'xGA - Equipo A')
                  }}>
                    {xGAA.toFixed(2)}
                  </div>
                </div>
              )}
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
            <div style={columnaStyle}>
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
              {equipoB?.estadisticasDefensivas?.xGA !== null && equipoB?.estadisticasDefensivas?.xGA !== undefined && (
                <div style={metricaStyle}>
                  <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>{ML.xGAPromedio}</span>
                  <div style={{ 
                    ...metricaValorStyle, 
                    color: obtenerColorMetrica(xGAA, xGAB, false, false, 'xGA - Equipo B')
                  }}>
                    {xGAB.toFixed(2)}
                  </div>
                </div>
              )}
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
            {datosAdicionales?.cornersYFaltas?.cornersEsperados && (
              <div style={{ marginBottom: tokens.spacing.xl }}>
                <PrediccionesSectionTitle
                  as="h4"
                  size="md"
                  icon={IconProyeccionCorners}
                  style={{ marginBottom: tokens.spacing.md }}
                >
                  {PREDICCIONES_TITLES.proyeccionCorners}
                </PrediccionesSectionTitle>
                <div style={comparacionGridStyle}>
                  <div style={columnaStyle}>
                    <div style={columnaTituloStyle}>{equipoA?.nombre || 'Equipo A'}</div>
                    <div style={metricaStyle}>
                      <span style={metricaLabelStyle}>Corners Esperados</span>
                      <div style={{ ...metricaValorStyle, color: tokens.colors.accentOrange }}>
                        {datosAdicionales.cornersYFaltas.cornersEsperados.expectedA}
                      </div>
                    </div>
                  </div>
                  <div style={columnaStyle}>
                    <div style={columnaTituloStyle}>{equipoB?.nombre || 'Equipo B'}</div>
                    <div style={metricaStyle}>
                      <span style={metricaLabelStyle}>Corners Esperados</span>
                      <div style={{ ...metricaValorStyle, color: tokens.colors.accentOrange }}>
                        {datosAdicionales.cornersYFaltas.cornersEsperados.expectedB}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ ...columnaStyle, marginTop: tokens.spacing.md, textAlign: 'center' }}>
                  <span style={metricaLabelStyle}>Corners Totales Esperados</span>
                  <div style={{ ...metricaValorStyle, fontSize: tokens.typography.fontSize3xl, color: tokens.colors.accentOrange }}>
                    {datosAdicionales.cornersYFaltas.cornersEsperados.total}
                  </div>
                </div>
              </div>
            )}

            {datosAdicionales?.cornersYFaltas?.tarjetasEsperadas && (
              <div style={{ marginBottom: tokens.spacing.xl }}>
                <PrediccionesSectionTitle
                  as="h4"
                  size="md"
                  icon={IconProyeccionDisciplinaria}
                  style={{ marginBottom: tokens.spacing.md }}
                >
                  {PREDICCIONES_TITLES.proyeccionDisciplinaria}
                </PrediccionesSectionTitle>
                <div style={comparacionGridStyle}>
                  <div style={columnaStyle}>
                    <div style={columnaTituloStyle}>{equipoA?.nombre || 'Equipo A'}</div>
                    <div style={metricaStyle}>
                      <span style={metricaLabelStyle}>Tarjetas Esperadas</span>
                      <div style={{ ...metricaValorStyle, color: tokens.colors.accentGold }}>
                        {datosAdicionales.cornersYFaltas.tarjetasEsperadas.expectedA}
                      </div>
                    </div>
                  </div>
                  <div style={columnaStyle}>
                    <div style={columnaTituloStyle}>{equipoB?.nombre || 'Equipo B'}</div>
                    <div style={metricaStyle}>
                      <span style={metricaLabelStyle}>Tarjetas Esperadas</span>
                      <div style={{ ...metricaValorStyle, color: tokens.colors.accentGold }}>
                        {datosAdicionales.cornersYFaltas.tarjetasEsperadas.expectedB}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ ...columnaStyle, marginTop: tokens.spacing.md, textAlign: 'center' }}>
                  <span style={metricaLabelStyle}>Tarjetas Totales Esperadas</span>
                  <div style={{ ...metricaValorStyle, fontSize: tokens.typography.fontSize3xl, color: tokens.colors.accentGold }}>
                    {datosAdicionales.cornersYFaltas.tarjetasEsperadas.total}
                  </div>
                </div>
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
    <div style={containerStyle}>
      <PrediccionesSectionTitle
        as="h3"
        size="xl"
        icon={IconAnalisisGlobal}
        style={{ marginBottom: tokens.spacing.lg }}
      >
        {PREDICCIONES_TITLES.analisisGlobal}
      </PrediccionesSectionTitle>
      
      <div style={tabsContainerStyle}>
        {COMPARACION_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className="predicciones-tab-btn"
            style={tabStyle(activeTab === id)}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={16} color={activeTab === id ? tokens.colors.textPrimary : tokens.colors.accentOrange} />
            {label}
          </button>
        ))}
      </div>

      <div>
        {renderTabContent()}
      </div>
    </div>
  );
}

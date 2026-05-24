import React, { useState, useEffect } from 'react';
import { createBet } from '../../services/betService';
import CuentaSectionTitle from './CuentaSectionTitle';
import { IconPanelApuestas } from './CuentaIcons';
import './cuentaSections.css';
import './PanelApuestas.css';

/**
 * Componente principal del Panel de Apuestas
 * Incluye formulario dinámico, resumen en tiempo real y acciones
 */
const PanelApuestas = ({ onBetCreated }) => {
  // Estados del formulario
  const [partido, setPartido] = useState('');
  const [mercado, setMercado] = useState('');
  const [seleccion, setSeleccion] = useState('');
  const [cuota, setCuota] = useState('');
  const [stake, setStake] = useState('');
  const [modeloAnalisis, setModeloAnalisis] = useState('');
  const [confianza, setConfianza] = useState(3);

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Opciones dinámicas según mercado
  const opcionesPorMercado = {
    'Resultado': ['Local', 'Empate', 'Visitante'],
    'Over/Under': ['Over 0.5', 'Under 0.5', 'Over 1.5', 'Under 1.5', 'Over 2.5', 'Under 2.5'],
    'BTTS': ['Sí', 'No'],
    'Corners': ['Over 8.5', 'Under 8.5', 'Over 9.5', 'Under 9.5'],
    'Combinado': []
  };

  // Cuando cambia el mercado, reiniciar selección
  useEffect(() => {
    setSeleccion('');
  }, [mercado]);

  // Calcular posible retorno
  const posibleRetorno = cuota && stake ? (parseFloat(cuota) * parseFloat(stake)).toFixed(2) : '0.00';

  // Validar formulario
  const validarFormulario = () => {
    if (!partido.trim()) {
      setError('El partido es requerido');
      return false;
    }
    if (!mercado) {
      setError('El mercado es requerido');
      return false;
    }
    if (!seleccion) {
      setError('La selección es requerida');
      return false;
    }
    if (!cuota || parseFloat(cuota) <= 0) {
      setError('La cuota debe ser mayor a 0');
      return false;
    }
    if (!stake || parseFloat(stake) <= 0) {
      setError('El stake debe ser mayor a 0');
      return false;
    }
    if (!modeloAnalisis) {
      setError('El modelo de análisis es requerido');
      return false;
    }
    if (confianza < 1 || confianza > 5) {
      setError('La confianza debe estar entre 1 y 5');
      return false;
    }
    return true;
  };

  // Limpiar formulario
  const limpiarFormulario = () => {
    setPartido('');
    setMercado('');
    setSeleccion('');
    setCuota('');
    setStake('');
    setModeloAnalisis('');
    setConfianza(3);
    setError('');
    setSuccess('');
  };

  // Guardar apuesta
  const handleGuardar = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validar formulario
      if (!validarFormulario()) {
        setLoading(false);
        return;
      }

      // Preparar datos
      const betData = {
        partido: partido.trim(),
        mercado: mercado,
        seleccion: seleccion,
        cuota: parseFloat(cuota),
        stake: parseFloat(stake),
        modelo_analisis: modeloAnalisis,
        confianza: confianza
      };

      // Crear apuesta
      const response = await createBet(betData);

      if (response.success) {
        setSuccess('¡Apuesta guardada exitosamente!');
        limpiarFormulario();
        
        // Notificar al componente padre para actualizar historial
        if (onBetCreated) {
          onBetCreated();
        }
      } else {
        setError(response.message || 'Error al guardar la apuesta');
      }
    } catch (err) {
      setError(err.message || 'Error al guardar la apuesta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel-apuestas">
      <div className="cuenta-section-header cuenta-section-header--stacked">
        <CuentaSectionTitle icon={IconPanelApuestas} size="md">
          Panel de Apuestas
        </CuentaSectionTitle>
        <p className="cuenta-section-desc">Registra y gestiona tus apuestas</p>
      </div>

      {error && (
        <div className="panel-message panel-error">
          <span>⚠️</span> {error}
        </div>
      )}

      {success && (
        <div className="panel-message panel-success">
          <span>✅</span> {success}
        </div>
      )}

      <div className="panel-content">
        {/* ZONA 1: FORMULARIO DINÁMICO */}
        <div className="panel-section panel-form">
          <CuentaSectionTitle as="h3" size="sm" className="section-title">
            Nueva Apuesta
          </CuentaSectionTitle>
          
          <form onSubmit={handleGuardar}>
            <div className="form-row">
              <div className="form-group form-group-full">
                <label htmlFor="partido">Partido *</label>
                <input
                  id="partido"
                  type="text"
                  value={partido}
                  onChange={(e) => setPartido(e.target.value)}
                  placeholder="Ej: Real Madrid vs Barcelona"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="mercado">Mercado *</label>
                <select
                  id="mercado"
                  value={mercado}
                  onChange={(e) => setMercado(e.target.value)}
                  disabled={loading}
                  required
                >
                  <option value="">Selecciona un mercado</option>
                  <option value="Resultado">Resultado</option>
                  <option value="Over/Under">Over/Under</option>
                  <option value="BTTS">BTTS</option>
                  <option value="Corners">Corners</option>
                  <option value="Combinado">Combinado</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="seleccion">Selección *</label>
                <select
                  id="seleccion"
                  value={seleccion}
                  onChange={(e) => setSeleccion(e.target.value)}
                  disabled={loading || !mercado || (opcionesPorMercado[mercado]?.length === 0)}
                  required
                >
                  <option value="">
                    {!mercado 
                      ? 'Selecciona primero un mercado' 
                      : opcionesPorMercado[mercado]?.length === 0
                      ? 'No disponible'
                      : 'Selecciona una opción'}
                  </option>
                  {opcionesPorMercado[mercado]?.map((opcion, index) => (
                    <option key={index} value={opcion}>
                      {opcion}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cuota">Cuota *</label>
                <input
                  id="cuota"
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={cuota}
                  onChange={(e) => setCuota(e.target.value)}
                  placeholder="Ej: 2.50"
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="stake">Stake *</label>
                <input
                  id="stake"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  placeholder="Ej: 100"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="modelo-analisis">Modelo de Análisis *</label>
                <select
                  id="modelo-analisis"
                  value={modeloAnalisis}
                  onChange={(e) => setModeloAnalisis(e.target.value)}
                  disabled={loading}
                  required
                >
                  <option value="">Selecciona un modelo</option>
                  <option value="xG">xG</option>
                  <option value="Poisson">Poisson</option>
                  <option value="Mixto">Mixto</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="confianza">Confianza: {confianza}/5 *</label>
                <input
                  id="confianza"
                  type="range"
                  min="1"
                  max="5"
                  value={confianza}
                  onChange={(e) => setConfianza(parseInt(e.target.value))}
                  disabled={loading}
                  className="confianza-slider"
                />
                <div className="confianza-labels">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>
            </div>

            {/* ZONA 3: ACCIONES */}
            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar Apuesta'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={limpiarFormulario}
                disabled={loading}
              >
                Limpiar Formulario
              </button>
            </div>
          </form>
        </div>

        {/* ZONA 2: RESUMEN EN TIEMPO REAL */}
        <div className="panel-section panel-resumen">
          <CuentaSectionTitle as="h3" size="sm" className="section-title">
            Resumen
          </CuentaSectionTitle>
          
          <div className="resumen-content">
            <div className="resumen-item">
              <span className="resumen-label">Partido:</span>
              <span className="resumen-value">{partido || '—'}</span>
            </div>
            
            <div className="resumen-item">
              <span className="resumen-label">Mercado:</span>
              <span className="resumen-value">{mercado || '—'}</span>
            </div>
            
            <div className="resumen-item">
              <span className="resumen-label">Selección:</span>
              <span className="resumen-value">{seleccion || '—'}</span>
            </div>
            
            <div className="resumen-item">
              <span className="resumen-label">Cuota:</span>
              <span className="resumen-value">{cuota || '—'}</span>
            </div>
            
            <div className="resumen-item">
              <span className="resumen-label">Stake:</span>
              <span className="resumen-value">{stake ? `$${parseFloat(stake).toFixed(2)}` : '—'}</span>
            </div>
            
            <div className="resumen-item resumen-highlight">
              <span className="resumen-label">Posible Retorno:</span>
              <span className="resumen-value resumen-retorno">
                ${posibleRetorno}
              </span>
            </div>
            
            <div className="resumen-item">
              <span className="resumen-label">Modelo:</span>
              <span className="resumen-value">{modeloAnalisis || '—'}</span>
            </div>
            
            <div className="resumen-item">
              <span className="resumen-label">Confianza:</span>
              <span className="resumen-value">
                {confianza}/5
                <span className="confianza-stars">
                  {'★'.repeat(confianza)}{'☆'.repeat(5 - confianza)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PanelApuestas;

import React, { useState, useEffect } from 'react';
import { getBets, updateBet, deleteBet } from '../../services/betService';
import CuentaSectionTitle from './CuentaSectionTitle';
import { IconHistorial } from './CuentaIcons';
import './cuentaSections.css';
import './PanelApuestas.css';

function HistorialHeader({ countLabel }) {
  return (
    <div className="cuenta-section-header">
      <CuentaSectionTitle icon={IconHistorial} size="md">
        Historial de Apuestas
      </CuentaSectionTitle>
      {countLabel ? <span className="cuenta-section-subtitle">{countLabel}</span> : null}
    </div>
  );
}

/**
 * Componente de Historial de Apuestas
 * Muestra una tabla con todas las apuestas del usuario
 */
const HistorialApuestas = ({ refreshTrigger }) => {
  const [apuestas, setApuestas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20); // Límite fijo por ahora
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Estados de filtros
  const [filtroResultado, setFiltroResultado] = useState('');
  const [filtroMercado, setFiltroMercado] = useState('');
  const [filtroPartido, setFiltroPartido] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  // Estados para edición
  const [apuestaEditando, setApuestaEditando] = useState(null);
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false);
  const [editandoLoading, setEditandoLoading] = useState(false);
  const [editandoError, setEditandoError] = useState('');

  // Estados del formulario de edición
  const [editPartido, setEditPartido] = useState('');
  const [editMercado, setEditMercado] = useState('');
  const [editSeleccion, setEditSeleccion] = useState('');
  const [editCuota, setEditCuota] = useState('');
  const [editStake, setEditStake] = useState('');
  const [editModeloAnalisis, setEditModeloAnalisis] = useState('');
  const [editConfianza, setEditConfianza] = useState(3);
  const [editResultado, setEditResultado] = useState('pendiente');

  // Construir objeto de filtros
  const construirFiltros = () => {
    const filters = {};
    if (filtroResultado) filters.resultado = filtroResultado;
    if (filtroMercado) filters.mercado = filtroMercado;
    if (filtroPartido) filters.partido = filtroPartido;
    if (filtroFechaDesde) filters.fechaDesde = filtroFechaDesde;
    if (filtroFechaHasta) filters.fechaHasta = filtroFechaHasta;
    return filters;
  };

  // Cargar apuestas
  const cargarApuestas = async (pageNum) => {
    setLoading(true);
    setError('');
    
    try {
      const filters = construirFiltros();
      const data = await getBets(pageNum, limit, filters);
      setApuestas(data.bets || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Error al cargar las apuestas');
      setApuestas([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltroResultado('');
    setFiltroMercado('');
    setFiltroPartido('');
    setFiltroFechaDesde('');
    setFiltroFechaHasta('');
    setPage(1);
  };

  // Verificar si hay filtros activos
  const hayFiltrosActivos = () => {
    return filtroResultado || filtroMercado || filtroPartido || filtroFechaDesde || filtroFechaHasta;
  };

  // Opciones dinámicas según mercado (para modal de edición)
  const opcionesPorMercado = {
    'Resultado': ['Local', 'Empate', 'Visitante'],
    'Over/Under': ['Over 0.5', 'Under 0.5', 'Over 1.5', 'Under 1.5', 'Over 2.5', 'Under 2.5'],
    'BTTS': ['Sí', 'No'],
    'Corners': ['Over 8.5', 'Under 8.5', 'Over 9.5', 'Under 9.5'],
    'Combinado': []
  };

  // Cuando cambia el mercado en edición, reiniciar selección
  useEffect(() => {
    if (mostrarModalEdicion && editMercado) {
      setEditSeleccion('');
    }
  }, [editMercado, mostrarModalEdicion]);

  // Abrir modal de edición
  const abrirModalEdicion = (apuesta) => {
    setApuestaEditando(apuesta);
    setEditPartido(apuesta.partido || '');
    setEditMercado(apuesta.mercado || '');
    setEditSeleccion(apuesta.seleccion || '');
    setEditCuota(apuesta.cuota?.toString() || '');
    setEditStake(apuesta.stake?.toString() || '');
    setEditModeloAnalisis(apuesta.modelo_analisis || '');
    setEditConfianza(apuesta.confianza || 3);
    setEditResultado(apuesta.resultado || 'pendiente');
    setEditandoError('');
    setMostrarModalEdicion(true);
  };

  // Cerrar modal de edición
  const cerrarModalEdicion = () => {
    setMostrarModalEdicion(false);
    setApuestaEditando(null);
    setEditandoError('');
    setEditPartido('');
    setEditMercado('');
    setEditSeleccion('');
    setEditCuota('');
    setEditStake('');
    setEditModeloAnalisis('');
    setEditConfianza(3);
    setEditResultado('pendiente');
  };

  // Guardar cambios de edición
  const guardarEdicion = async () => {
    setEditandoError('');
    setEditandoLoading(true);

    try {
      // Validar campos
      if (!editPartido.trim()) {
        setEditandoError('El partido es requerido');
        setEditandoLoading(false);
        return;
      }
      if (!editMercado) {
        setEditandoError('El mercado es requerido');
        setEditandoLoading(false);
        return;
      }
      if (!editSeleccion) {
        setEditandoError('La selección es requerida');
        setEditandoLoading(false);
        return;
      }
      if (!editCuota || parseFloat(editCuota) <= 0) {
        setEditandoError('La cuota debe ser mayor a 0');
        setEditandoLoading(false);
        return;
      }
      if (!editStake || parseFloat(editStake) <= 0) {
        setEditandoError('El stake debe ser mayor a 0');
        setEditandoLoading(false);
        return;
      }
      if (!editModeloAnalisis) {
        setEditandoError('El modelo de análisis es requerido');
        setEditandoLoading(false);
        return;
      }
      if (editConfianza < 1 || editConfianza > 5) {
        setEditandoError('La confianza debe estar entre 1 y 5');
        setEditandoLoading(false);
        return;
      }

      // Preparar datos
      const betData = {
        partido: editPartido.trim(),
        mercado: editMercado,
        seleccion: editSeleccion,
        cuota: parseFloat(editCuota),
        stake: parseFloat(editStake),
        modelo_analisis: editModeloAnalisis,
        confianza: editConfianza,
        resultado: editResultado
      };

      // Actualizar apuesta
      await updateBet(apuestaEditando._id, betData);

      // Cerrar modal y refrescar historial
      cerrarModalEdicion();
      cargarApuestas(page); // Mantener página y filtros actuales
    } catch (err) {
      setEditandoError(err.message || 'Error al actualizar la apuesta');
    } finally {
      setEditandoLoading(false);
    }
  };

  // Eliminar apuesta
  const handleEliminar = async (apuestaId) => {
    // Confirmación
    const confirmar = window.confirm('¿Estás seguro de que deseas eliminar esta apuesta? Esta acción no se puede deshacer.');
    if (!confirmar) return;

    try {
      await deleteBet(apuestaId);
      // Refrescar historial manteniendo filtros y paginación
      cargarApuestas(page);
    } catch (err) {
      alert(err.message || 'Error al eliminar la apuesta');
    }
  };

  // Cargar al montar y cuando cambia refreshTrigger (resetear a página 1 y filtros)
  useEffect(() => {
    limpiarFiltros();
    cargarApuestas(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Cargar cuando cambian los filtros (resetear a página 1)
  useEffect(() => {
    setPage(1);
    cargarApuestas(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroResultado, filtroMercado, filtroPartido, filtroFechaDesde, filtroFechaHasta]);

  // Cambiar de página
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      cargarApuestas(newPage);
      // Scroll al inicio de la tabla
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Formatear fecha
  const formatearFecha = (fecha) => {
    if (!fecha) return '—';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calcular Profit/Loss
  const calcularProfitLoss = (apuesta) => {
    if (apuesta.resultado === 'pendiente' || apuesta.resultado === 'nula') {
      return 0;
    }
    if (apuesta.resultado === 'ganada') {
      return (apuesta.cuota - 1) * apuesta.stake;
    }
    if (apuesta.resultado === 'perdida') {
      return -apuesta.stake;
    }
    return 0;
  };

  // Obtener clase CSS según resultado
  const getResultadoClass = (resultado) => {
    switch (resultado) {
      case 'ganada':
        return 'resultado-ganada';
      case 'perdida':
        return 'resultado-perdida';
      case 'nula':
        return 'resultado-nula';
      default:
        return 'resultado-pendiente';
    }
  };

  // Obtener texto del resultado
  const getResultadoText = (resultado) => {
    switch (resultado) {
      case 'ganada':
        return 'Ganada';
      case 'perdida':
        return 'Perdida';
      case 'nula':
        return 'Nula';
      default:
        return 'Pendiente';
    }
  };

  if (loading) {
    return (
      <div className="historial-apuestas">
        <HistorialHeader />
        <div className="historial-loading">
          <p>Cargando apuestas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="historial-apuestas">
        <HistorialHeader />
        <div className="historial-error">
          <span>⚠️</span> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="historial-apuestas">
      <HistorialHeader
        countLabel={`(${total} apuestas ${hayFiltrosActivos() ? 'filtradas' : 'totales'})`}
      />

      {/* Barra de Filtros */}
      <div className="historial-filters">
        <div className="filters-row">
          <div className="filter-group">
            <label htmlFor="filtro-resultado">Resultado</label>
            <select
              id="filtro-resultado"
              value={filtroResultado}
              onChange={(e) => setFiltroResultado(e.target.value)}
              disabled={loading}
            >
              <option value="">Todas</option>
              <option value="pendiente">Pendientes</option>
              <option value="ganada">Ganadas</option>
              <option value="perdida">Perdidas</option>
              <option value="nula">Nulas</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filtro-mercado">Mercado</label>
            <select
              id="filtro-mercado"
              value={filtroMercado}
              onChange={(e) => setFiltroMercado(e.target.value)}
              disabled={loading}
            >
              <option value="">Todos</option>
              <option value="Resultado">Resultado</option>
              <option value="Over/Under">Over/Under</option>
              <option value="BTTS">BTTS</option>
              <option value="Corners">Corners</option>
              <option value="Combinado">Combinado</option>
            </select>
          </div>

          <div className="filter-group filter-group-full">
            <label htmlFor="filtro-partido">Buscar Partido</label>
            <input
              id="filtro-partido"
              type="text"
              value={filtroPartido}
              onChange={(e) => setFiltroPartido(e.target.value)}
              placeholder="Ej: Barcelona, Real Madrid..."
              disabled={loading}
            />
          </div>
        </div>

        <div className="filters-row">
          <div className="filter-group">
            <label htmlFor="filtro-fecha-desde">Fecha Desde</label>
            <input
              id="filtro-fecha-desde"
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              max={filtroFechaHasta || undefined}
              disabled={loading}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="filtro-fecha-hasta">Fecha Hasta</label>
            <input
              id="filtro-fecha-hasta"
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              min={filtroFechaDesde || undefined}
              disabled={loading}
            />
          </div>

          <div className="filter-group filter-group-actions">
            {hayFiltrosActivos() && (
              <button
                className="btn-limpiar-filtros"
                onClick={limpiarFiltros}
                disabled={loading}
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {apuestas.length === 0 ? (
        <div className="historial-empty">
          <p>No tienes apuestas registradas aún.</p>
          <p className="historial-empty-subtitle">Crea tu primera apuesta en el panel de arriba.</p>
        </div>
      ) : (
        <div className="historial-table-container table-responsive">
          <table className="historial-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Partido</th>
                <th>Mercado</th>
                <th>Selección</th>
                <th>Cuota</th>
                <th>Stake</th>
                <th>Resultado</th>
                <th>Profit/Loss</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {apuestas.map((apuesta) => {
                const profitLoss = calcularProfitLoss(apuesta);
                return (
                  <tr key={apuesta._id}>
                    <td>{formatearFecha(apuesta.created_at)}</td>
                    <td className="historial-partido">{apuesta.partido}</td>
                    <td>{apuesta.mercado}</td>
                    <td>{apuesta.seleccion}</td>
                    <td>{apuesta.cuota.toFixed(2)}</td>
                    <td>${apuesta.stake.toFixed(2)}</td>
                    <td>
                      <span className={`resultado-badge ${getResultadoClass(apuesta.resultado)}`}>
                        {getResultadoText(apuesta.resultado)}
                      </span>
                    </td>
                    <td className={`profit-loss ${profitLoss > 0 ? 'profit' : profitLoss < 0 ? 'loss' : 'neutral'}`}>
                      {profitLoss > 0 ? '+' : ''}${profitLoss.toFixed(2)}
                    </td>
                    <td className="historial-acciones">
                      <button
                        className="btn-accion btn-editar"
                        onClick={() => abrirModalEdicion(apuesta)}
                        disabled={loading}
                        title="Editar apuesta"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-accion btn-eliminar"
                        onClick={() => handleEliminar(apuesta._id)}
                        disabled={loading}
                        title="Eliminar apuesta"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {apuestas.length > 0 && totalPages > 1 && (
        <div className="historial-pagination">
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1 || loading}
          >
            « Anterior
          </button>
          
          <div className="pagination-info">
            <span>Página {page} de {totalPages}</span>
            <span className="pagination-detail">
              (Mostrando {apuestas.length} de {total} apuestas)
            </span>
          </div>
          
          <button
            className="pagination-btn"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages || loading}
          >
            Siguiente »
          </button>
        </div>
      )}

      {/* Modal de Edición */}
      {mostrarModalEdicion && (
        <div className="modal-overlay" onClick={cerrarModalEdicion}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Apuesta</h3>
              <button className="modal-close" onClick={cerrarModalEdicion}>×</button>
            </div>

            {editandoError && (
              <div className="panel-message panel-error">
                <span>⚠️</span> {editandoError}
              </div>
            )}

            <div className="modal-body">
              <div className="form-row">
                <div className="form-group form-group-full">
                  <label htmlFor="edit-partido">Partido *</label>
                  <input
                    id="edit-partido"
                    type="text"
                    value={editPartido}
                    onChange={(e) => setEditPartido(e.target.value)}
                    placeholder="Ej: Real Madrid vs Barcelona"
                    disabled={editandoLoading}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-mercado">Mercado *</label>
                  <select
                    id="edit-mercado"
                    value={editMercado}
                    onChange={(e) => setEditMercado(e.target.value)}
                    disabled={editandoLoading}
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
                  <label htmlFor="edit-seleccion">Selección *</label>
                  <select
                    id="edit-seleccion"
                    value={editSeleccion}
                    onChange={(e) => setEditSeleccion(e.target.value)}
                    disabled={editandoLoading || !editMercado || (opcionesPorMercado[editMercado]?.length === 0)}
                    required
                  >
                    <option value="">
                      {!editMercado 
                        ? 'Selecciona primero un mercado' 
                        : opcionesPorMercado[editMercado]?.length === 0
                        ? 'No disponible'
                        : 'Selecciona una opción'}
                    </option>
                    {opcionesPorMercado[editMercado]?.map((opcion, index) => (
                      <option key={index} value={opcion}>
                        {opcion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-cuota">Cuota *</label>
                  <input
                    id="edit-cuota"
                    type="number"
                    step="0.01"
                    min="1.01"
                    value={editCuota}
                    onChange={(e) => setEditCuota(e.target.value)}
                    placeholder="Ej: 2.50"
                    disabled={editandoLoading}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-stake">Stake *</label>
                  <input
                    id="edit-stake"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editStake}
                    onChange={(e) => setEditStake(e.target.value)}
                    placeholder="Ej: 100"
                    disabled={editandoLoading}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-modelo-analisis">Modelo de Análisis *</label>
                  <select
                    id="edit-modelo-analisis"
                    value={editModeloAnalisis}
                    onChange={(e) => setEditModeloAnalisis(e.target.value)}
                    disabled={editandoLoading}
                    required
                  >
                    <option value="">Selecciona un modelo</option>
                    <option value="xG">xG</option>
                    <option value="Poisson">Poisson</option>
                    <option value="Mixto">Mixto</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-confianza">Confianza: {editConfianza}/5 *</label>
                  <input
                    id="edit-confianza"
                    type="range"
                    min="1"
                    max="5"
                    value={editConfianza}
                    onChange={(e) => setEditConfianza(parseInt(e.target.value))}
                    disabled={editandoLoading}
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

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-resultado">Resultado</label>
                  <select
                    id="edit-resultado"
                    value={editResultado}
                    onChange={(e) => setEditResultado(e.target.value)}
                    disabled={editandoLoading}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="ganada">Ganada</option>
                    <option value="perdida">Perdida</option>
                    <option value="nula">Nula</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={cerrarModalEdicion}
                disabled={editandoLoading}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={guardarEdicion}
                disabled={editandoLoading}
              >
                {editandoLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistorialApuestas;

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../../../context/UserContext';
import AdminModuleShell from '../AdminModuleShell';

import AnalystAdminDashboard from './analysts/AnalystAdminDashboard';

import AnalystAdminList from './analysts/AnalystAdminList';

import AnalystAdminDetail from './analysts/AnalystAdminDetail';

import AnalystAdminVerifications from './analysts/AnalystAdminVerifications';

import AnalystAdminAudit from './analysts/AnalystAdminAudit';

import AnalystAdminCreateForm from './analysts/AnalystAdminCreateForm';
import AvatarUpload from '../../AvatarUpload';

import {

  getAnalystAdminDashboard,

  listAdminAnalysts,

  suspendAnalyst,

  updateAdminAnalyst,

} from '../../../services/analystAdminService';



const BASE_TABS = [

  { id: 'dashboard', label: 'Dashboard' },

  { id: 'create', label: 'Crear analista' },

  { id: 'analysts', label: 'Analistas' },

  { id: 'verifications', label: 'Verificación' },

  { id: 'audit', label: 'Auditoría', mainAdminOnly: true },

];



export default function AnalistasModule() {
  const { isMainAdmin } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = useMemo(

    () => BASE_TABS.filter((tab) => !tab.mainAdminOnly || isMainAdmin),

    [isMainAdmin]

  );



  const [tab, setTab] = useState('dashboard');

  const [dashboard, setDashboard] = useState(null);

  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const [selectedAnalystId, setSelectedAnalystId] = useState(null);
  const [initialDetailTab, setInitialDetailTab] = useState('overview');
  const [editAnalyst, setEditAnalyst] = useState(null);

  useEffect(() => {
    const state = location.state;
    if (state?.openAnalystId) {
      setSelectedAnalystId(state.openAnalystId);
      setInitialDetailTab(state.openTab || 'overview');
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);


  const loadDashboard = useCallback(async () => {

    const data = await getAnalystAdminDashboard();

    setDashboard(data);

  }, []);



  const loadAnalysts = useCallback(async () => {

    const data = await listAdminAnalysts();

    setRows(data);

  }, []);



  const loadAll = useCallback(async () => {

    setLoading(true);

    setError('');

    try {

      await Promise.all([loadDashboard(), loadAnalysts()]);

    } catch (err) {

      setError(err.message || 'Error al cargar módulo de analistas');

    } finally {

      setLoading(false);

    }

  }, [loadDashboard, loadAnalysts]);



  useEffect(() => {

    loadAll();

  }, [loadAll]);



  const handleToggleSuspend = async (row) => {

    const suspended = row.analystStatus === 'suspended';

    let reason = '';

    if (!suspended) {

      reason = window.prompt('Motivo de suspensión (opcional):') || '';

    }

    try {

      await suspendAnalyst(row.id, { suspend: !suspended, reason });

      await loadAll();

    } catch (err) {

      alert(err.message);

    }

  };



  const handleSaveEdit = async () => {

    if (!editAnalyst) return;

    try {

      await updateAdminAnalyst(editAnalyst.id, {

        nombre: editAnalyst.nombre,

        apellido: editAnalyst.apellido,

        pais: editAnalyst.pais,

        foto_perfil_url: editAnalyst.foto_perfil_url,

        analystDescription: editAnalyst.analystDescription,

      });

      setEditAnalyst(null);

      await loadAll();

    } catch (err) {

      alert(err.message);

    }

  };



  if (selectedAnalystId) {

    return (

      <AdminModuleShell

        title="Analistas Deportivos"

        description="Detalle completo del analista."

        badge="Admin"

      >

        <AnalystAdminDetail
          analystId={selectedAnalystId}
          initialTab={initialDetailTab}
          isMainAdmin={isMainAdmin}
          onBack={() => {
            setSelectedAnalystId(null);
            setInitialDetailTab('overview');
            loadAll();
          }}
        />
      </AdminModuleShell>

    );

  }



  return (

    <AdminModuleShell

      title="Analistas Deportivos"

      description="Control de analistas, suscriptores, métricas, verificación, mensajes y auditoría."

      badge="Admin PRO"

      actions={

        <button type="button" className="admin-btn-secondary" onClick={loadAll}>

          Actualizar

        </button>

      }

    >

      {error ? <div className="admin-error">{error}</div> : null}



      <div className="admin-panel-nav analyst-admin-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`admin-nav-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>



      {tab === 'dashboard' ? (

        <AnalystAdminDashboard

          dashboard={loading ? null : dashboard}

          onSelectAnalyst={setSelectedAnalystId}

        />

      ) : null}



      {tab === 'create' ? (

        <AnalystAdminCreateForm

          isMainAdmin={isMainAdmin}

          onCreated={() => {

            loadAll();

            setTab('analysts');

          }}

        />

      ) : null}



      {tab === 'analysts' ? (

        <AnalystAdminList

          rows={rows}

          loading={loading}

          onRefresh={loadAll}

          onViewProfile={setSelectedAnalystId}

          onEdit={(id) => {

            const row = rows.find((r) => r.id === id);

            if (row) setEditAnalyst({ ...row });

          }}

          onToggleSuspend={handleToggleSuspend}

        />

      ) : null}



      {tab === 'verifications' ? (

        <AnalystAdminVerifications

          isMainAdmin={isMainAdmin}

          onSelectUser={setSelectedAnalystId}

        />

      ) : null}



      {tab === 'audit' && isMainAdmin ? <AnalystAdminAudit /> : null}



      {editAnalyst ? (

        <div className="analyst-admin-modal-backdrop">

          <div className="admin-panel-card analyst-admin-modal">

            <h3>Editar analista</h3>

            <label>

              Nombre

              <input

                className="admin-input"

                value={editAnalyst.nombre || ''}

                onChange={(e) => setEditAnalyst((p) => ({ ...p, nombre: e.target.value }))}

              />

            </label>

            <label>

              Apellido

              <input

                className="admin-input"

                value={editAnalyst.apellido || ''}

                onChange={(e) => setEditAnalyst((p) => ({ ...p, apellido: e.target.value }))}

              />

            </label>

            <label>

              País

              <input

                className="admin-input"

                value={editAnalyst.pais || ''}

                onChange={(e) => setEditAnalyst((p) => ({ ...p, pais: e.target.value }))}

              />

            </label>

            <AvatarUpload
              label="Foto de perfil"
              nombre={editAnalyst.nombre}
              value={editAnalyst.foto_perfil_url || ''}
              folder="analysts"
              onChange={(url) => setEditAnalyst((p) => ({ ...p, foto_perfil_url: url }))}
            />

            <label>

              Descripción

              <textarea

                className="admin-input"

                rows={3}

                value={editAnalyst.analystDescription || ''}

                onChange={(e) => setEditAnalyst((p) => ({ ...p, analystDescription: e.target.value }))}

              />

            </label>

            <div className="analyst-admin-actions">

              <button type="button" className="admin-btn-primary" onClick={handleSaveEdit}>

                Guardar

              </button>

              <button type="button" className="admin-btn-secondary" onClick={() => setEditAnalyst(null)}>

                Cancelar

              </button>

            </div>

          </div>

        </div>

      ) : null}

    </AdminModuleShell>

  );

}



import { useState } from 'react';
import AdminMensajesEnviados from '../../Admin/AdminMensajesEnviados';
import AdminMessageCampaigns from '../AdminMessageCampaigns';
import AdminModuleShell from '../AdminModuleShell';

export default function MessagesSentModule() {
  const [tab, setTab] = useState('campaigns');

  return (
    <AdminModuleShell
      title="Historial de mensajería"
      description="Campañas masivas y mensajes individuales con métricas."
      badge={null}
    >
      <div className="admin-messages-sent-tabs">
        <button
          type="button"
          className={tab === 'campaigns' ? 'is-active' : ''}
          onClick={() => setTab('campaigns')}
        >
          Campañas
        </button>
        <button
          type="button"
          className={tab === 'messages' ? 'is-active' : ''}
          onClick={() => setTab('messages')}
        >
          Mensajes
        </button>
      </div>
      {tab === 'campaigns' ? <AdminMessageCampaigns /> : <AdminMensajesEnviados />}
    </AdminModuleShell>
  );
}

import AdminMensajesEnviados from '../../Admin/AdminMensajesEnviados';
import AdminModuleShell from '../AdminModuleShell';

export default function MessagesSentModule() {
  return (
    <AdminModuleShell title="Mensajes enviados" description="Historial de mensajes del administrador." badge={null}>
      <AdminMensajesEnviados />
    </AdminModuleShell>
  );
}

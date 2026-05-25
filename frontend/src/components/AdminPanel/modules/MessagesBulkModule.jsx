import AdminSendBulkMessage from '../AdminSendBulkMessage';
import AdminModuleShell from '../AdminModuleShell';

export default function MessagesBulkModule() {
  return (
    <AdminModuleShell title="Mensajes masivos" description="Envío masivo o broadcast a usuarios." badge={null}>
      <AdminSendBulkMessage />
    </AdminModuleShell>
  );
}

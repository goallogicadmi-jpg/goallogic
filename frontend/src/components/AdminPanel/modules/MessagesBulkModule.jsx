import AdminMessagesBulk from '../AdminMessagesBulk';
import AdminModuleShell from '../AdminModuleShell';

export default function MessagesBulkModule() {
  return (
    <AdminModuleShell
      title="Mensajes masivos"
      description="Segmentación, plantillas, programación y envío por lotes."
      badge="Solo admin principal"
    >
      <AdminMessagesBulk />
    </AdminModuleShell>
  );
}

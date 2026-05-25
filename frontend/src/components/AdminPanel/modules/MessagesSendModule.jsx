import AdminEnviarMensaje from '../../Admin/AdminEnviarMensaje';
import AdminModuleShell from '../AdminModuleShell';

export default function MessagesSendModule() {
  return (
    <AdminModuleShell title="Enviar mensaje" description="Mensaje individual a un usuario." badge={null}>
      <AdminEnviarMensaje />
    </AdminModuleShell>
  );
}

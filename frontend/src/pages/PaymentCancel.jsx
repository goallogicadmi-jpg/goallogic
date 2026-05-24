import { Link } from 'react-router-dom';

export default function PaymentCancel() {
  return (
    <div className="micuenta-container" style={{ padding: '2rem' }}>
      <h1>Pago cancelado</h1>
      <p>No se ha cobrado nada. Puedes volver a intentar el registro o el pago cuando quieras.</p>
      <p>
        <Link to="/torneos">Volver</Link>
      </p>
    </div>
  );
}

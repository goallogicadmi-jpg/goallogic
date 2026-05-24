import PayButton from "./PayButton";
import "./PremiumRequired.css";

/**
 * Banner para usuarios logueados sin premium (403 en /me u otros).
 */
export default function PremiumRequired() {
  return (
    <div className="premium-warning">
      <h2>Tu cuenta no está activada</h2>
      <p>
        Tu cuenta está creada, pero necesitas completar el pago para acceder a
        GOAL_LOGIC.
      </p>
      <PayButton buttonText="Completar pago ahora" />
    </div>
  );
}

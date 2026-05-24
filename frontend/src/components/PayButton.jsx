import { useState } from "react";
import { getAuthHeaders } from "../setupApiAuth.js";

/** Debe coincidir con el precio activo en Stripe (Dashboard → producto → Precios). Sin valor, el checkout no arranca. */
const checkoutPriceId = import.meta.env.VITE_STRIPE_PRICE_ID?.trim() || "";

/**
 * Checkout Stripe por URL (sesión creada en el servidor).
 * Requiere JWT: el servidor usa req.user.id, no acepta userId en el body.
 */
export default function PayButton({ buttonText = "Comprar Premium" }) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  const handlePay = async () => {
    setLocalError("");
    setBusy(true);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("Debes iniciar sesión para completar el pago");
      }
      if (!checkoutPriceId) {
        throw new Error(
          "Falta VITE_STRIPE_PRICE_ID en frontend/.env (precio activo del producto en Stripe). Reinicia Vite tras guardar."
        );
      }

      const res = await fetch("/api/payments/create-checkout-session", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ priceId: checkoutPriceId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error || data.message || `Error al iniciar pago (${res.status})`
        );
      }
      if (!data.url) {
        throw new Error("La sesión de pago no devolvió URL");
      }
      window.location.href = data.url;
    } catch (e) {
      setLocalError(e.message || "No se pudo iniciar el pago");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        className="pay-button-stripe"
        onClick={handlePay}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? "Conectando…" : buttonText}
      </button>
      {localError && (
        <p
          className="pay-button-error"
          style={{ color: "#f87171", marginTop: "12px", fontSize: "0.9rem" }}
        >
          {localError}
        </p>
      )}
    </div>
  );
}

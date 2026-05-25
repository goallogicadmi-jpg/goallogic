import { useState } from "react";
import { getAuthHeaders, authFetch } from "../setupApiAuth.js";

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

      const res = await authFetch("/api/payments/create-checkout-session", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ priceId: checkoutPriceId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error(
            data.message || "Sesión expirada. Cierra sesión e inicia sesión de nuevo."
          );
        }
        if (res.status === 403) {
          throw new Error(
            data.error || data.message || "No tienes permiso para iniciar el pago."
          );
        }
        if (res.status === 500 && data.code === "STRIPE_SECRET_KEY_MISSING") {
          throw new Error(
            "Stripe no está configurado en el servidor (falta STRIPE_SECRET_KEY en Render)."
          );
        }
        if (res.status === 500 && data.code === "STRIPE_CHECKOUT_URLS_MISSING") {
          throw new Error(
            "Faltan STRIPE_SUCCESS_URL o STRIPE_CANCEL_URL en Render."
          );
        }
        if (res.status === 500 && (data.error || data.message)?.includes("configuración")) {
          throw new Error(
            "Error de configuración en Render (Stripe o JWT). Revisa variables de entorno."
          );
        }
        if (data.code === "STRIPE_PRICE_NOT_FOUND" || data.code === "STRIPE_PRICE_MODE_MISMATCH") {
          throw new Error(
            data.error ||
              "El precio de Stripe no coincide con modo LIVE. Redeploy del frontend y revisa STRIPE_PRICE_ID en Render."
          );
        }
        throw new Error(
          data.error || data.message || data.detail || `Error al iniciar pago (${res.status})`
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

const express = require("express");
const Stripe = require("stripe");
const rateLimit = require("express-rate-limit");
const { authJwt } = require("../middleware/auth");
const logger = require("../utils/logger");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

/**
 * Stripe sustituye {CHECKOUT_SESSION_ID} en la URL; ayuda a evitar caché y permite enlazar la sesión.
 */
function withCheckoutSessionPlaceholder(url) {
  if (!url || typeof url !== "string") return url;
  if (url.includes("{CHECKOUT_SESSION_ID}")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}session_id={CHECKOUT_SESSION_ID}`;
}

/** Modo inferido de la clave secreta (test/live); no confundir con el priceId (price_… es igual en ambos). */
function secretKeyMode(secret) {
  if (!secret || typeof secret !== "string") return "missing";
  if (secret.startsWith("sk_test_")) return "test";
  if (secret.startsWith("sk_live_")) return "live";
  return "unknown";
}

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes de pago. Intenta en un minuto." },
});

router.post("/create-checkout-session", checkoutLimiter, authJwt, async (req, res) => {
  const { priceId } = req.body || {};
  const userId = req.user?.id;
  const resolvedPriceId =
    (typeof priceId === "string" && priceId.trim()) ||
    (typeof process.env.STRIPE_PRICE_ID === "string" &&
      process.env.STRIPE_PRICE_ID.trim()) ||
    "";
  let checkoutMode;

  try {
    if (!userId) {
      return res.status(401).json({ error: "Autenticación requerida" });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      logger.error("stripe_checkout_config_missing", { field: "STRIPE_SECRET_KEY" });
      return res.status(500).json({
        error: "Error de configuración del servidor",
      });
    }

    if (!resolvedPriceId) {
      return res.status(400).json({
        error: "priceId es requerido",
      });
    }

    const successUrl = process.env.STRIPE_SUCCESS_URL;
    const cancelUrl = process.env.STRIPE_CANCEL_URL;

    if (!successUrl || !cancelUrl) {
      logger.error("stripe_checkout_config_missing", {
        field: "STRIPE_SUCCESS_URL/STRIPE_CANCEL_URL",
      });
      return res.status(500).json({
        error: "Error de configuración del servidor",
      });
    }

    const price = await stripe.prices.retrieve(resolvedPriceId);
    const recurring =
      price.recurring != null && typeof price.recurring === "object";
    checkoutMode = recurring ? "subscription" : "payment";

    const uid = String(userId).trim();
    const sessionParams = {
      mode: checkoutMode,
      payment_method_types: ["card"],
      line_items: [
        {
          price: resolvedPriceId,
          quantity: 1,
        },
      ],
      success_url: withCheckoutSessionPlaceholder(successUrl),
      cancel_url: withCheckoutSessionPlaceholder(cancelUrl),
      client_reference_id: uid,
      metadata: { userId: uid },
    };

    if (checkoutMode === "subscription") {
      sessionParams.subscription_data = {
        metadata: { userId: uid },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json({ url: session.url });
  } catch (error) {
    const skMode = secretKeyMode(process.env.STRIPE_SECRET_KEY);
    logger.error("stripe_checkout_session_failed", {
      message: error?.message,
      type: error?.type,
      code: error?.code,
      param: error?.param,
      statusCode: error?.statusCode,
      secretKeyMode: skMode,
      priceIdPrefix:
        typeof resolvedPriceId === "string"
          ? resolvedPriceId.slice(0, 24)
          : undefined,
      checkoutMode: checkoutMode !== undefined ? checkoutMode : undefined,
    });

    res.status(500).json({ error: "Error creando sesión de pago" });
  }
});

module.exports = router;

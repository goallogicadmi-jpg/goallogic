const express = require("express");
const Stripe = require("stripe");
const rateLimit = require("express-rate-limit");
const { authJwt } = require("../middleware/auth");
const logger = require("../utils/logger");
const { resolvePlanFromStripePriceId } = require("../utils/planAccess");
const {
  validatePromotionCode,
  resolveCheckoutDiscount,
} = require("../utils/stripeCouponAdmin");

const router = express.Router();

function getStripeClient() {
  const key = (process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) return null;
  return new Stripe(key);
}

function normalizeCheckoutRedirectUrl(url) {
  const trimmed = (typeof url === "string" ? url : "").trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function isAllowedCheckoutRedirectUrl(url) {
  const normalized = normalizeCheckoutRedirectUrl(url);
  if (!normalized) return false;
  if (process.env.NODE_ENV === "production") {
    return normalized.startsWith("https://");
  }
  return true;
}

function checkoutUrlHint(url) {
  const normalized = normalizeCheckoutRedirectUrl(url);
  if (!normalized) return null;
  try {
    const u = new URL(normalized);
    return `${u.origin}${u.pathname}`;
  } catch {
    return null;
  }
}

/**
 * Stripe sustituye {CHECKOUT_SESSION_ID} en la URL; ayuda a evitar caché y permite enlazar la sesión.
 */
function withCheckoutSessionPlaceholder(url) {
  const normalized = normalizeCheckoutRedirectUrl(url);
  if (!normalized) return url;
  if (normalized.includes("{CHECKOUT_SESSION_ID}")) return normalized;
  const sep = normalized.includes("?") ? "&" : "?";
  return `${normalized}${sep}session_id={CHECKOUT_SESSION_ID}`;
}

/** Modo inferido de la clave secreta (test/live); no confundir con el priceId (price_… es igual en ambos). */
function secretKeyMode(secret) {
  if (!secret || typeof secret !== "string") return "missing";
  if (secret.startsWith("sk_test_")) return "test";
  if (secret.startsWith("sk_live_")) return "live";
  return "unknown";
}

/** Orden de candidatos: en producción prioriza STRIPE_PRICE_ID del servidor (Render). */
function checkoutPriceCandidates(bodyPriceId) {
  const envPrice = (process.env.STRIPE_PRICE_ID || "").trim();
  const bodyPrice = (typeof bodyPriceId === "string" ? bodyPriceId : "").trim();
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && envPrice) {
    return bodyPrice && bodyPrice !== envPrice ? [envPrice, bodyPrice] : [envPrice];
  }
  if (bodyPrice) return envPrice && envPrice !== bodyPrice ? [bodyPrice, envPrice] : [bodyPrice];
  return envPrice ? [envPrice] : [];
}

/**
 * Resuelve un price válido para la cuenta/modo de la clave secreta.
 * Evita fallos cuando el frontend (bundle antiguo) envía un price de test con sk_live.
 */
async function resolvePriceForCheckout(stripe, bodyPriceId) {
  const skMode = secretKeyMode(process.env.STRIPE_SECRET_KEY);
  const candidates = checkoutPriceCandidates(bodyPriceId);
  let lastMissing = null;

  for (const priceId of candidates) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      const priceMode = price.livemode ? "live" : "test";
      if (skMode === "live" && priceMode === "test") {
        lastMissing = new Error(`Price ${priceId} is test mode but secret key is live`);
        lastMissing.code = "STRIPE_PRICE_MODE_MISMATCH";
        continue;
      }
      if (skMode === "test" && priceMode === "live") {
        lastMissing = new Error(`Price ${priceId} is live mode but secret key is test`);
        lastMissing.code = "STRIPE_PRICE_MODE_MISMATCH";
        continue;
      }
      if (candidates[0] !== priceId) {
        logger.warn("stripe_checkout_price_fallback", {
          usedPricePrefix: priceId.slice(0, 20),
          skippedPrefix: candidates[0].slice(0, 20),
          secretKeyMode: skMode,
        });
      }
      return { priceId, price };
    } catch (err) {
      if (err?.code === "resource_missing") {
        lastMissing = err;
        continue;
      }
      throw err;
    }
  }

  if (lastMissing) throw lastMissing;
  const err = new Error("No priceId configured");
  err.code = "STRIPE_PRICE_ID_MISSING";
  throw err;
}

function mapStripeCheckoutError(error, skMode) {
  const code = error?.code;
  const message = error?.message || "";

  if (code === "resource_missing" && /price/i.test(message)) {
    return {
      error:
        skMode === "live"
          ? "El precio no existe en Stripe LIVE. Revisa STRIPE_PRICE_ID en Render y redeploy del frontend (VITE_STRIPE_PRICE_ID)."
          : "El precio no existe en Stripe. Verifica STRIPE_PRICE_ID.",
      code: "STRIPE_PRICE_NOT_FOUND",
    };
  }
  if (code === "STRIPE_PRICE_MODE_MISMATCH") {
    return {
      error:
        "El price_id no coincide con el modo de la clave (test vs live). Usa price_1Tb3eiE8KSBWzWIREl5xnpiW con sk_live.",
      code: "STRIPE_PRICE_MODE_MISMATCH",
    };
  }
  if (code === "STRIPE_PRICE_ID_MISSING") {
    return {
      error: "Falta STRIPE_PRICE_ID en el servidor.",
      code: "STRIPE_PRICE_ID_MISSING",
    };
  }
  if (code === "url_invalid") {
    return {
      error:
        "Stripe rechazó las URLs de retorno. En Render usa STRIPE_SUCCESS_URL=https://goallogic.vercel.app/pago-exitoso y STRIPE_CANCEL_URL=https://goallogic.vercel.app/pago-cancelado, y añádelas en Dashboard → Checkout → Allowed redirect URLs (modo LIVE).",
      code: "STRIPE_URL_INVALID",
    };
  }

  return {
    error: "Error creando sesión de pago",
    code: code || "STRIPE_CHECKOUT_FAILED",
    detail: process.env.NODE_ENV !== "production" ? message : undefined,
  };
}

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes de pago. Intenta en un minuto." },
});

router.post("/validate-coupon", checkoutLimiter, authJwt, async (req, res) => {
  try {
    const { code } = req.body || {};
    const result = await validatePromotionCode(code);
    if (!result.valid) {
      return res.status(400).json({ success: false, ...result });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error al validar cupón",
    });
  }
});

router.post("/create-checkout-session", checkoutLimiter, authJwt, async (req, res) => {
  const { priceId: bodyPriceId, promotionCode } = req.body || {};
  const userId = req.user?.id;
  let resolvedPriceId;
  let checkoutMode;

  try {
    if (!userId) {
      return res.status(401).json({ error: "Autenticación requerida" });
    }

    const stripe = getStripeClient();
    if (!stripe) {
      logger.error("stripe_checkout_config_missing", { field: "STRIPE_SECRET_KEY" });
      return res.status(500).json({
        error: "Error de configuración del servidor",
        code: "STRIPE_SECRET_KEY_MISSING",
      });
    }

    const successUrl = normalizeCheckoutRedirectUrl(process.env.STRIPE_SUCCESS_URL);
    const cancelUrl = normalizeCheckoutRedirectUrl(process.env.STRIPE_CANCEL_URL);

    if (!successUrl || !cancelUrl) {
      logger.error("stripe_checkout_config_missing", {
        field: "STRIPE_SUCCESS_URL/STRIPE_CANCEL_URL",
      });
      return res.status(500).json({
        error: "Error de configuración del servidor",
        code: "STRIPE_CHECKOUT_URLS_MISSING",
      });
    }

    if (!isAllowedCheckoutRedirectUrl(successUrl) || !isAllowedCheckoutRedirectUrl(cancelUrl)) {
      logger.error("stripe_checkout_url_invalid", {
        successUrlHint: checkoutUrlHint(successUrl),
        cancelUrlHint: checkoutUrlHint(cancelUrl),
      });
      return res.status(500).json({
        error:
          "URLs de checkout inválidas: en producción deben ser HTTPS (p. ej. https://goallogic.vercel.app/pago-exitoso).",
        code: "STRIPE_CHECKOUT_URLS_INVALID",
      });
    }

    const { priceId, price } = await resolvePriceForCheckout(stripe, bodyPriceId);
    resolvedPriceId = priceId;

    const recurring =
      price.recurring != null && typeof price.recurring === "object";
    checkoutMode = recurring ? "subscription" : "payment";

    const uid = String(userId).trim();
    const resolvedPlan = resolvePlanFromStripePriceId(resolvedPriceId);
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
      metadata: { userId: uid, plan: resolvedPlan },
    };

    if (checkoutMode === "subscription") {
      sessionParams.subscription_data = {
        metadata: { userId: uid, plan: resolvedPlan },
      };
    }

    try {
      const discount = await resolveCheckoutDiscount({ promotionCode });
      if (discount?.type === 'promotion_code') {
        sessionParams.discounts = [{ promotion_code: discount.id }];
      } else if (discount?.type === 'coupon') {
        sessionParams.discounts = [{ coupon: discount.id }];
      }
    } catch (couponErr) {
      if (couponErr.code === 'COUPON_INVALID') {
        return res.status(400).json({
          error: couponErr.message,
          code: 'COUPON_INVALID',
        });
      }
      throw couponErr;
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
      bodyPriceIdPrefix:
        typeof bodyPriceId === "string" ? bodyPriceId.slice(0, 24) : undefined,
      envPriceIdPrefix: (process.env.STRIPE_PRICE_ID || "").slice(0, 24) || undefined,
      resolvedPriceIdPrefix:
        typeof resolvedPriceId === "string"
          ? resolvedPriceId.slice(0, 24)
          : undefined,
      checkoutMode: checkoutMode !== undefined ? checkoutMode : undefined,
    });

    const mapped = mapStripeCheckoutError(error, skMode);
    const status =
      mapped.code === "STRIPE_PRICE_NOT_FOUND" ||
      mapped.code === "STRIPE_PRICE_MODE_MISMATCH" ||
      mapped.code === "STRIPE_PRICE_ID_MISSING"
        ? 400
        : 500;
    res.status(status).json(mapped);
  }
});

module.exports = router;

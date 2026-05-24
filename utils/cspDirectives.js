/**
 * CSP de producción: sin wildcards, sin scripts inline, dominios explícitos.
 * @see https://helmetjs.github.io/docs/content-security-policy/
 */
function buildProductionCspDirectives() {
  const self = "'self'";
  return {
    defaultSrc: [self],
    scriptSrc: [self],
    scriptSrcAttr: ["'none'"],
    styleSrc: [self, 'https://fonts.googleapis.com'],
    styleSrcAttr: ["'unsafe-inline'"],
    imgSrc: [
      self,
      'data:',
      'blob:',
      'https://media.api-sports.io',
      'https://via.placeholder.com',
    ],
    connectSrc: [
      self,
      'https://api.stripe.com',
      'https://js.stripe.com',
      'https://hooks.stripe.com',
      'https://checkout.stripe.com',
    ],
    frameSrc: [
      self,
      'https://js.stripe.com',
      'https://hooks.stripe.com',
      'https://checkout.stripe.com',
    ],
    fontSrc: [self, 'data:', 'https://fonts.gstatic.com'],
    objectSrc: ["'none'"],
    baseUri: [self],
    formAction: [self],
    frameAncestors: ["'none'"],
  };
}

module.exports = { buildProductionCspDirectives };

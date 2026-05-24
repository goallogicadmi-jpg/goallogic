const logger = require('./logger');

/**
 * Registra error upstream (API-Sports, etc.) sin exponer detalles al cliente.
 */
function logUpstream(label, error, extra = {}) {
  logger.error(label, {
    message: error?.message,
    status: error?.response?.status,
    upstream: error?.response?.data,
    ...extra,
  });
}

const GENERIC_API_ERROR = 'Error al procesar la solicitud';

module.exports = {
  logUpstream,
  GENERIC_API_ERROR,
};

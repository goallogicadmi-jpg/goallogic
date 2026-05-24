const { AsyncLocalStorage } = require('async_hooks');
const metrics = require('./metrics');

const als = new AsyncLocalStorage();

/**
 * Middleware: contexto por petición (IP, endpoint, userId y status al finalizar).
 */
function middleware(req, res, next) {
  const store = {
    ip: req.ip,
    endpoint: `${req.method} ${req.originalUrl || req.url || ''}`,
    userId: undefined,
    statusCode: undefined,
  };
  als.run(store, () => {
    res.on('finish', () => {
      store.statusCode = res.statusCode;
      store.userId =
        req.user?.id ||
        req.user?._id ||
        (typeof req.user?.user_id === 'string' ? req.user.user_id : req.user?.user_id?.toString?.());
      metrics.onResponseFinished(res.statusCode, res.locals);
      if (res.statusCode >= 500) {
        const logger = require('./logger');
        logger.critical('http_response_5xx', {
          statusCode: res.statusCode,
          endpoint: store.endpoint,
        });
      }
      if (process.env.LOG_HTTP_ACCESS === 'true') {
        const logger = require('./logger');
        logger.info('http_access', {
          statusCode: res.statusCode,
          durationMs: undefined,
        });
      }
    });
    next();
  });
}

function getFields() {
  const s = als.getStore();
  if (!s) {
    return {
      ip: undefined,
      userId: undefined,
      endpoint: undefined,
      statusCode: undefined,
    };
  }
  return {
    ip: s.ip,
    userId: s.userId,
    endpoint: s.endpoint,
    statusCode: s.statusCode,
  };
}

module.exports = { middleware, getFields };

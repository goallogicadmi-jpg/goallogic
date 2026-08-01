/**
 * Bloquea a analistas en rutas que exponen datos privados de usuarios.
 */
const { forbidAnalystPrivateData } = require('../utils/analystPrivacy');

function blockAnalystPrivateData(req, res, next) {
  if (forbidAnalystPrivateData(req, res)) return;
  next();
}

module.exports = blockAnalystPrivateData;

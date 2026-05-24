const mongoose = require('mongoose');

let registered = false;

function registerMongoMonitoring() {
  if (registered) return;
  registered = true;
  const logger = require('./logger');

  mongoose.connection.on('disconnected', () => {
    logger.critical('mongo_disconnected', { state: mongoose.connection.readyState });
  });

  mongoose.connection.on('error', (err) => {
    logger.critical('mongo_connection_error', { message: err.message });
  });
}

module.exports = { registerMongoMonitoring };

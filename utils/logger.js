/**
 * Logger utility that provides consistent logging across the application
 */
const configLogger = require('../config/logger');

// Create a logger wrapper to ensure consistent logging interface
const logger = {
  info: message => {
    if (configLogger) {
      configLogger.info(message);
    } else {
      console.log(`[INFO] ${message}`);
    }
  },

  error: (message, error) => {
    if (configLogger) {
      configLogger.error(message, error);
    } else {
      console.error(`[ERROR] ${message}`, error || '');
    }
  },

  warn: message => {
    if (configLogger) {
      configLogger.warn(message);
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },

  debug: message => {
    if (configLogger) {
      configLogger.debug(message);
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[DEBUG] ${message}`);
      }
    }
  },
};

module.exports = logger;

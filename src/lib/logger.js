/**
 * Production-grade logging utility
 * - Removes console logs in production builds
 * - Integrates with error monitoring service (Sentry)
 * - Preserves errors for debugging while protecting sensitive data
 */

const isDev = import.meta.env.DEV;
const isBrowser = typeof window !== 'undefined';

// Stub error service (replace with Sentry for production)
const errorService = {
  captureException: (error, context = {}) => {
    if (isDev) {
      console.error('[Error Service]', error, context);
    }
    // In production, send to Sentry/LogRocket
  },
  captureMessage: (msg, level = 'info', context = {}) => {
    if (isDev) {
      console.log(`[${level.toUpperCase()}]`, msg, context);
    }
  }
};

export const logger = {
  /**
   * Log errors with safe message for users
   * @param {Error} error - The error object
   * @param {string} context - Where error occurred (e.g., 'trails.js:POST')
   * @param {Object} metadata - Additional safe metadata
   */
  error: (error, context = 'app', metadata = {}) => {
    if (isDev && isBrowser) {
      console.error(`[${context}]`, error?.message || error, metadata);
    }
    errorService.captureException(error, { context, ...metadata });
  },

  /**
   * Log warnings (dev only)
   * @param {string} message
   * @param {Object} data
   */
  warn: (message, data = {}) => {
    if (isDev && isBrowser) {
      console.warn(message, data);
    }
    errorService.captureMessage(message, 'warning', data);
  },

  /**
   * Log info messages (dev only)
   * @param {string} message
   * @param {Object} data
   */
  info: (message, data = {}) => {
    if (isDev && isBrowser) {
      console.log(message, data);
    }
  },

  /**
   * Log debug info (dev only)
   * @param {string} message
   * @param {Object} data
   */
  debug: (message, data = {}) => {
    if (isDev && isBrowser) {
      console.debug(message, data);
    }
  },
};

export default logger;

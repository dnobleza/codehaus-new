const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const TAG = '[RATE-LIMITER]';

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  handler: (req, res, next, options) => {
    logger.warn(`${TAG} Rate limit exceeded for ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  },
});

module.exports = { authRateLimiter };

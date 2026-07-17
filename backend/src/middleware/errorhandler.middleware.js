const logger = require('../utils/logger');
const TAG = '[ERROR-HANDLER]';

const errorHandler = (err, req, res, next) => {
  logger.error(`${TAG} ${err.message}`);

  const statusCode = err.statusCode || 500;
  const message = statusCode < 500 ? err.message : 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;

const logger = require('../utils/logger');
const TAG = '[HEALTH-CONTROLLER]';

exports.health = (req, res, next) => {
  try {
    logger.info(`${TAG} is running and Healthy`);
    res.status(200).json({
      success: true,
      message: 'Codehaus API is running',
      env: process.env.NODE_ENV,
    });
  } catch (error) {
    next(error);
  }
};

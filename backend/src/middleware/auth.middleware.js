const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const config = require('../config/env');
const TAG = '[AUTH-MIDDLEWARE]';

function verifyAccessToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Missing access token' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (error) {
    logger.info(`${TAG} Rejected token: ${error.message}`);
    res.status(401).json({ success: false, message: 'Invalid or expired access token' });
  }
}

module.exports = { verifyAccessToken };

const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { authRateLimiter } = require('../middleware/rateLimiter.middleware');

router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/refresh', authRateLimiter, authController.refresh);
router.post('/logout', authRateLimiter, authController.logout);

module.exports = router;

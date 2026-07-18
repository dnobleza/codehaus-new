const express = require('express');
const router = express.Router();

const addonsController = require('../controllers/addons.controller');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/requireRole.middleware');

router.use(verifyAccessToken, requireRole('client'));

router.get('/', addonsController.list);

module.exports = router;

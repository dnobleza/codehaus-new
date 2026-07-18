const express = require('express');
const router = express.Router();

const packagesController = require('../controllers/packages.controller');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/requireRole.middleware');

router.use(verifyAccessToken, requireRole('client'));

router.get('/', packagesController.list);
router.get('/:id', packagesController.getById);

module.exports = router;

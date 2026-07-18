const express = require('express');
const router = express.Router();

const adminPaymentsController = require('../controllers/adminPayments.controller');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/requireRole.middleware');

// Payment verification is shared between admin and staff (judgment call --
// see report).
router.use(verifyAccessToken, requireRole('admin', 'staff'));

router.get('/', adminPaymentsController.list);
router.patch('/:id/verify', adminPaymentsController.verify);
router.patch('/:id/reject', adminPaymentsController.reject);

module.exports = router;

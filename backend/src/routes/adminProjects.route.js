const express = require('express');
const router = express.Router();

const adminProjectsController = require('../controllers/adminProjects.controller');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/requireRole.middleware');

// Project review / status transitions / quotation prep are shared between
// admin and staff (judgment call -- see report).
router.use(verifyAccessToken, requireRole('admin', 'staff'));

router.get('/', adminProjectsController.list);
router.get('/:id', adminProjectsController.getById);
router.patch('/:id/status', adminProjectsController.updateStatus);
router.patch('/:id/accept', adminProjectsController.accept);
router.patch('/:id/decline', adminProjectsController.decline);
router.patch('/:id/deliver', adminProjectsController.deliver);

router.post('/:id/quotations', adminProjectsController.createAndSendQuotation);
router.patch('/:id/quotations/:quotationId', adminProjectsController.editDraftQuotation);
router.patch('/:id/quotations/:quotationId/send', adminProjectsController.sendDraftQuotation);

module.exports = router;

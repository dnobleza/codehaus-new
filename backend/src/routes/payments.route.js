const express = require('express');
const router = express.Router();

const paymentsController = require('../controllers/payments.controller');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/requireRole.middleware');

// Client-scoped, cross-project payment list backing the Invoices page.
// Submitting a payment and streaming its proof stay nested under
// /projects/:id/payments in projects.route.js -- those act on one specific
// project and are scoped by that project's ownership. This file only adds the
// flat read surface, scoped to req.user.id inside the repository query
// (payments.repository.js#listByClientWithContext).
router.use(verifyAccessToken);

router.get('/', requireRole('client'), paymentsController.listMine);
router.get('/due', requireRole('client'), paymentsController.listDue);

module.exports = router;

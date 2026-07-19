const express = require('express');
const router = express.Router();

const projectsController = require('../controllers/projects.controller');
const quotationsController = require('../controllers/quotations.controller');
const paymentsController = require('../controllers/payments.controller');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/requireRole.middleware');
const { uploadPaymentProof, wrapUpload } = require('../middleware/upload.middleware');

// Authentication is required for everything in this file, but role gating
// is now applied PER ROUTE (not as a blanket router.use) rather than
// blanket requireRole('client'): the proof-of-payment route below must be
// reachable by BOTH the owning CLIENT and ADMIN/STAFF, so it can't sit
// behind a single-role gate the way the rest of this file's routes can.
// Every other route here still requires role CLIENT and is always scoped
// to req.user.id as the client_id (see projects.service.js /
// payments.service.js / quotations.service.js -- every read/write is
// filtered by ownership, never a bare :id lookup).
router.use(verifyAccessToken);

router.post('/', requireRole('client'), projectsController.create);
router.get('/', requireRole('client'), projectsController.list);
router.get('/:id', requireRole('client'), projectsController.getById);
router.get('/:id/overview', requireRole('client'), projectsController.getOverview);
router.get('/:id/activity', requireRole('client'), projectsController.getActivity);

router.post('/:id/quotations', requireRole('client'), quotationsController.create);
router.patch('/:id/quotations/:quotationId/accept', requireRole('client'), quotationsController.accept);
router.patch('/:id/quotations/:quotationId/reject', requireRole('client'), quotationsController.reject);

router.post(
  '/:id/payments',
  requireRole('client'),
  wrapUpload(uploadPaymentProof.single('proof')),
  paymentsController.create
);
router.get('/:id/payments', requireRole('client'), paymentsController.list);

// Shared between the owning client and ADMIN/STAFF -- deliberately NOT
// role-gated here. Authorization is data-dependent (must be this specific
// project's client, OR elevated), which requireRole's role-only check can't
// express, so it's enforced inside payments.service.js's
// resolveProofForAccess instead (404, never 403, on any unauthorized
// attempt -- see that function's comment).
router.get('/:id/payments/:paymentId/proof', paymentsController.getProof);

module.exports = router;

const express = require('express');
const router = express.Router();

const adminPaymentsController = require('../controllers/adminPayments.controller');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/requireRole.middleware');
const { ROLES } = require('../constants/roles');

/*
  Payment verification is ADMIN ONLY.

  This router previously applied `requireRole('admin','staff')` to the whole
  surface, verify and reject included. That is a segregation-of-duties failure:
  verifying a payment is an attestation that money actually landed in the
  agency's bank or GCash account, and it mutates commercial state -- verifying
  installment 1 flips the project to `accepted`
  (payments.service.js#verifyPayment). Combined with the quotation-authoring
  grant that used to sit on adminProjects.route.js, a single staff member could
  set a price and then declare it settled.

  Staff keeps read access to the queue so delivery can see whether a project is
  paid up, but cannot act on it.

  Note for the PayMongo work: gateway payments settle via webhook with no human
  in the loop, so this manual queue shrinks to bank transfers only. The
  admin-only rule should not be relaxed on bottleneck grounds without first
  measuring the bottleneck; the narrower fix is a per-user
  `can_verify_payments` grant, not widening the whole staff role.
*/
router.use(verifyAccessToken);

router.get('/', requireRole(ROLES.ADMIN, ROLES.STAFF), adminPaymentsController.list);

router.patch('/:id/verify', requireRole(ROLES.ADMIN), adminPaymentsController.verify);
router.patch('/:id/reject', requireRole(ROLES.ADMIN), adminPaymentsController.reject);

module.exports = router;

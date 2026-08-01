const express = require('express');
const router = express.Router();

const adminProjectsController = require('../controllers/adminProjects.controller');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/requireRole.middleware');
const { ROLES } = require('../constants/roles');

/*
  Authorization model for this router.

  The separating principle: ADMIN owns the commercial and financial ledger,
  STAFF owns delivery execution, CLIENT owns intent and approval. Ask of any
  endpoint: does this change what we charge, what we agree to take on, or what
  we consider paid? If yes it is admin's.

  This router previously carried a single blanket
  `requireRole('admin','staff')`, which handed staff the authority to accept
  new business and to create and send quotations with arbitrary discounts.
  Combined with the payment-verification grant that used to sit on
  adminPayments.route.js, one staff member could price an engagement and then
  settle it -- pricing, invoicing, and settlement under one actor, with no
  second pair of eyes.

  Every route is authenticated; the role split is per-route below.
*/
router.use(verifyAccessToken);

const requireAdmin = requireRole(ROLES.ADMIN);
const requireDeliveryAccess = requireRole(ROLES.ADMIN, ROLES.STAFF);

// --- Read: delivery work is visible to staff --------------------------------
router.get('/', requireDeliveryAccess, adminProjectsController.list);
router.get('/:id', requireDeliveryAccess, adminProjectsController.getById);

/*
  Status transitions are mixed: this one endpoint expresses both delivery
  progress and commercial outcomes. Staff reaches it, but the service applies
  STAFF_ASSIGNABLE_STATUSES so a staff caller can only set delivery states.
  Route gating alone would let staff mark a project `completed` or `cancelled`.
*/
router.patch('/:id/status', requireDeliveryAccess, adminProjectsController.updateStatus);

// --- Commercial decisions: admin only ---------------------------------------
// Accepting or declining a request is taking on (or refusing) new business.
router.patch('/:id/accept', requireAdmin, adminProjectsController.accept);
router.patch('/:id/decline', requireAdmin, adminProjectsController.decline);
// Delivery sign-off releases the final commercial obligation.
router.patch('/:id/deliver', requireAdmin, adminProjectsController.deliver);

// Quotations set price and discount. Commercial by definition.
router.post('/:id/quotations', requireAdmin, adminProjectsController.createAndSendQuotation);
router.patch(
  '/:id/quotations/:quotationId',
  requireAdmin,
  adminProjectsController.editDraftQuotation,
);
router.patch(
  '/:id/quotations/:quotationId/send',
  requireAdmin,
  adminProjectsController.sendDraftQuotation,
);

// --- Delivery execution: staff's own surface --------------------------------
router.patch(
  '/:id/milestones/:milestoneId',
  requireDeliveryAccess,
  adminProjectsController.updateMilestoneProgress,
);
router.post(
  '/:id/milestones/generate',
  requireDeliveryAccess,
  adminProjectsController.generateMilestones,
);

module.exports = router;

const express = require('express');
const router = express.Router();

const quotationsController = require('../controllers/quotations.controller');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/requireRole.middleware');

// Client-scoped, cross-project quotation list. The per-quotation write
// actions (create/accept/reject) stay nested under /projects/:id/quotations
// in projects.route.js -- they act on a specific project and are scoped by
// that project's ownership. This file only adds the flat read surface the
// client Quotations page needs, scoped to req.user.id inside the repository
// query (quotations.repository.js#listByClient).
router.use(verifyAccessToken);

router.get('/', requireRole('client'), quotationsController.list);

module.exports = router;

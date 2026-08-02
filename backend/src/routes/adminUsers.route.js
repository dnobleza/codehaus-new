const express = require('express');
const router = express.Router();

const adminUsersController = require('../controllers/adminUsers.controller');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/requireRole.middleware');
const { ROLES } = require('../constants/roles');

/*
  Admin-only user lookup, existing solely to populate the project assignment
  picker.

  Admin-only rather than admin+staff even though staff can see a project's
  team: listing every staff member with their email is a directory, and only
  the role that manages teams needs it. Staff reads its own project's roster
  through GET /admin/projects/:id/assignments, which is assignment-gated.
*/
router.use(verifyAccessToken, requireRole(ROLES.ADMIN));

router.get('/assignable', adminUsersController.listAssignable);

module.exports = router;

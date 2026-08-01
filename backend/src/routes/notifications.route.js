const express = require('express');
const router = express.Router();

const notificationsController = require('../controllers/notifications.controller');
const { verifyAccessToken } = require('../middleware/auth.middleware');

// Deliberately NOT role-gated: a notification inbox is per-user, and every
// authenticated role has one. Scoping is by req.user.id inside the repository
// queries (notifications.repository.js), never by role -- so this stays
// correct if staff/admin events are added later without touching this file.
//
// Only clients receive notifications today (see notifications.service.js's
// EVENT_BUILDERS); other roles simply get an empty inbox.
router.use(verifyAccessToken);

router.get('/', notificationsController.list);
router.patch('/read-all', notificationsController.markAllRead);
router.patch('/:id/read', notificationsController.markRead);

module.exports = router;

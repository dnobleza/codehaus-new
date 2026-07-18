const express = require('express');
const router = express.Router();

const adminAddonsController = require('../controllers/adminAddons.controller');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/requireRole.middleware');

// Catalog *management* is admin-only; reads are admin+staff -- see
// adminPackages.route.js for the same split and why.
router.use(verifyAccessToken);

router.get('/', requireRole('admin', 'staff'), adminAddonsController.list);
router.get('/:id', requireRole('admin', 'staff'), adminAddonsController.getById);

router.post('/', requireRole('admin'), adminAddonsController.create);
router.patch('/:id', requireRole('admin'), adminAddonsController.update);
router.delete('/:id', requireRole('admin'), adminAddonsController.remove);
router.patch('/:id/activate', requireRole('admin'), adminAddonsController.activate);
router.patch('/:id/deactivate', requireRole('admin'), adminAddonsController.deactivate);

module.exports = router;

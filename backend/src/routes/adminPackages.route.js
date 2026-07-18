const express = require('express');
const router = express.Router();

const adminPackagesController = require('../controllers/adminPackages.controller');
const { verifyAccessToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/requireRole.middleware');
const { uploadThumbnail, uploadBanner, wrapUpload } = require('../middleware/upload.middleware');

// Catalog *management* (create/edit/delete/activate/upload) is admin-only.
// Reads are admin+staff: staff builds/sends quotations (adminProjects.route.js
// allows staff for that) and needs the current catalog to pick from -- a
// blanket admin-only gate here silently broke that workflow.
router.use(verifyAccessToken);

router.get('/', requireRole('admin', 'staff'), adminPackagesController.list);
router.get('/:id', requireRole('admin', 'staff'), adminPackagesController.getById);

router.post('/', requireRole('admin'), adminPackagesController.create);
router.patch('/:id', requireRole('admin'), adminPackagesController.update);
router.delete('/:id', requireRole('admin'), adminPackagesController.remove);

router.patch('/:id/activate', requireRole('admin'), adminPackagesController.activate);
router.patch('/:id/deactivate', requireRole('admin'), adminPackagesController.deactivate);

router.post(
  '/:id/thumbnail',
  requireRole('admin'),
  wrapUpload(uploadThumbnail.single('thumbnail')),
  adminPackagesController.uploadThumbnail
);
router.post(
  '/:id/banner',
  requireRole('admin'),
  wrapUpload(uploadBanner.single('banner')),
  adminPackagesController.uploadBanner
);

router.post('/:id/pages', requireRole('admin'), adminPackagesController.addPage);
router.patch('/:id/pages/:pageId', requireRole('admin'), adminPackagesController.updatePage);
router.delete('/:id/pages/:pageId', requireRole('admin'), adminPackagesController.deletePage);

router.post('/:id/features', requireRole('admin'), adminPackagesController.addFeature);
router.patch('/:id/features/:featureId', requireRole('admin'), adminPackagesController.updateFeature);
router.delete('/:id/features/:featureId', requireRole('admin'), adminPackagesController.deleteFeature);

module.exports = router;

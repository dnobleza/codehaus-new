const { toHttpError, httpError } = require('../utils/httpError');
const {
  createPackageSchema,
  updatePackageSchema,
  pageOrFeatureCreateSchema,
  pageOrFeatureUpdateSchema,
} = require('../validators/packages.validator');
const packagesService = require('../services/packages.service');
const { relativeUploadPath } = require('../middleware/upload.middleware');

exports.list = async (req, res, next) => {
  try {
    const packages = await packagesService.listAdminPackages();
    res.status(200).json({ success: true, message: 'Packages retrieved successfully', data: packages });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const pkg = await packagesService.getPackageDetail(req.params.id);
    res.status(200).json({ success: true, message: 'Package retrieved successfully', data: pkg });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = createPackageSchema.parse(req.body);
    const pkg = await packagesService.createPackage(data, req.user.id);
    res.status(201).json({ success: true, message: 'Package created successfully', data: pkg });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = updatePackageSchema.parse(req.body);
    const pkg = await packagesService.updatePackage(req.params.id, data);
    res.status(200).json({ success: true, message: 'Package updated successfully', data: pkg });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.remove = async (req, res, next) => {
  try {
    await packagesService.deletePackage(req.params.id);
    res.status(200).json({ success: true, message: 'Package deleted successfully' });
  } catch (error) {
    next(toHttpError(error));
  }
};

// Deliberately separate activate/deactivate actions rather than a generic
// PATCH that could silently flip other fields (per the brief).
exports.activate = async (req, res, next) => {
  try {
    const pkg = await packagesService.setPackageActive(req.params.id, true);
    res.status(200).json({ success: true, message: 'Package activated successfully', data: pkg });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.deactivate = async (req, res, next) => {
  try {
    const pkg = await packagesService.setPackageActive(req.params.id, false);
    res.status(200).json({ success: true, message: 'Package deactivated successfully', data: pkg });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.uploadThumbnail = async (req, res, next) => {
  try {
    if (!req.file) throw httpError(400, 'Thumbnail image file is required');
    const pkg = await packagesService.setPackageThumbnail(req.params.id, relativeUploadPath(req.file.path));
    res.status(200).json({ success: true, message: 'Thumbnail uploaded successfully', data: pkg });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.uploadBanner = async (req, res, next) => {
  try {
    if (!req.file) throw httpError(400, 'Banner image file is required');
    const pkg = await packagesService.setPackageBanner(req.params.id, relativeUploadPath(req.file.path));
    res.status(200).json({ success: true, message: 'Banner uploaded successfully', data: pkg });
  } catch (error) {
    next(toHttpError(error));
  }
};

// --- Pages ---

exports.addPage = async (req, res, next) => {
  try {
    const data = pageOrFeatureCreateSchema.parse(req.body);
    const page = await packagesService.addPage(req.params.id, data);
    res.status(201).json({ success: true, message: 'Page added successfully', data: page });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.updatePage = async (req, res, next) => {
  try {
    const data = pageOrFeatureUpdateSchema.parse(req.body);
    const page = await packagesService.updatePage(req.params.id, req.params.pageId, data);
    res.status(200).json({ success: true, message: 'Page updated successfully', data: page });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.deletePage = async (req, res, next) => {
  try {
    await packagesService.deletePage(req.params.id, req.params.pageId);
    res.status(200).json({ success: true, message: 'Page deleted successfully' });
  } catch (error) {
    next(toHttpError(error));
  }
};

// --- Features ---

exports.addFeature = async (req, res, next) => {
  try {
    const data = pageOrFeatureCreateSchema.parse(req.body);
    const feature = await packagesService.addFeature(req.params.id, data);
    res.status(201).json({ success: true, message: 'Feature added successfully', data: feature });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.updateFeature = async (req, res, next) => {
  try {
    const data = pageOrFeatureUpdateSchema.parse(req.body);
    const feature = await packagesService.updateFeature(req.params.id, req.params.featureId, data);
    res.status(200).json({ success: true, message: 'Feature updated successfully', data: feature });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.deleteFeature = async (req, res, next) => {
  try {
    await packagesService.deleteFeature(req.params.id, req.params.featureId);
    res.status(200).json({ success: true, message: 'Feature deleted successfully' });
  } catch (error) {
    next(toHttpError(error));
  }
};

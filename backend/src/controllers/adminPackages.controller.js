const logger = require('../utils/logger');
const { toHttpError, httpError } = require('../utils/httpError');
const {
  createPackageSchema,
  updatePackageSchema,
  pageOrFeatureCreateSchema,
  pageOrFeatureUpdateSchema,
} = require('../validators/packages.validator');
const packagesService = require('../services/packages.service');
const { relativeUploadPath } = require('../middleware/upload.middleware');
const TAG = '[ADMIN-PACKAGES-CONTROLLER]';

exports.list = async (req, res, next) => {
  try {
    const packages = await packagesService.listAdminPackages();
    logger.info(`${TAG} Listed ${packages.length} packages (admin)`);
    res.status(200).json({ success: true, message: 'Packages retrieved successfully', data: packages });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const pkg = await packagesService.getPackageDetail(req.params.id);
    logger.info(`${TAG} Package ${req.params.id} retrieved (admin)`);
    res.status(200).json({ success: true, message: 'Package retrieved successfully', data: pkg });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = createPackageSchema.parse(req.body);
    const pkg = await packagesService.createPackage(data, req.user.id);
    logger.info(`${TAG} Package ${pkg.id} created`);
    res.status(201).json({ success: true, message: 'Package created successfully', data: pkg });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = updatePackageSchema.parse(req.body);
    const pkg = await packagesService.updatePackage(req.params.id, data);
    logger.info(`${TAG} Package ${req.params.id} updated`);
    res.status(200).json({ success: true, message: 'Package updated successfully', data: pkg });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.remove = async (req, res, next) => {
  try {
    await packagesService.deletePackage(req.params.id);
    logger.info(`${TAG} Package ${req.params.id} deleted`);
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
    logger.info(`${TAG} Package ${req.params.id} activated`);
    res.status(200).json({ success: true, message: 'Package activated successfully', data: pkg });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.deactivate = async (req, res, next) => {
  try {
    const pkg = await packagesService.setPackageActive(req.params.id, false);
    logger.info(`${TAG} Package ${req.params.id} deactivated`);
    res.status(200).json({ success: true, message: 'Package deactivated successfully', data: pkg });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.uploadThumbnail = async (req, res, next) => {
  try {
    if (!req.file) throw httpError(400, 'Thumbnail image file is required');
    const pkg = await packagesService.setPackageThumbnail(req.params.id, relativeUploadPath(req.file.path));
    logger.info(`${TAG} Package ${req.params.id} thumbnail uploaded`);
    res.status(200).json({ success: true, message: 'Thumbnail uploaded successfully', data: pkg });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.uploadBanner = async (req, res, next) => {
  try {
    if (!req.file) throw httpError(400, 'Banner image file is required');
    const pkg = await packagesService.setPackageBanner(req.params.id, relativeUploadPath(req.file.path));
    logger.info(`${TAG} Package ${req.params.id} banner uploaded`);
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
    logger.info(`${TAG} Page ${page.id} added to package ${req.params.id}`);
    res.status(201).json({ success: true, message: 'Page added successfully', data: page });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.updatePage = async (req, res, next) => {
  try {
    const data = pageOrFeatureUpdateSchema.parse(req.body);
    const page = await packagesService.updatePage(req.params.id, req.params.pageId, data);
    logger.info(`${TAG} Page ${req.params.pageId} updated for package ${req.params.id}`);
    res.status(200).json({ success: true, message: 'Page updated successfully', data: page });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.deletePage = async (req, res, next) => {
  try {
    await packagesService.deletePage(req.params.id, req.params.pageId);
    logger.info(`${TAG} Page ${req.params.pageId} deleted from package ${req.params.id}`);
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
    logger.info(`${TAG} Feature ${feature.id} added to package ${req.params.id}`);
    res.status(201).json({ success: true, message: 'Feature added successfully', data: feature });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.updateFeature = async (req, res, next) => {
  try {
    const data = pageOrFeatureUpdateSchema.parse(req.body);
    const feature = await packagesService.updateFeature(req.params.id, req.params.featureId, data);
    logger.info(`${TAG} Feature ${req.params.featureId} updated for package ${req.params.id}`);
    res.status(200).json({ success: true, message: 'Feature updated successfully', data: feature });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.deleteFeature = async (req, res, next) => {
  try {
    await packagesService.deleteFeature(req.params.id, req.params.featureId);
    logger.info(`${TAG} Feature ${req.params.featureId} deleted from package ${req.params.id}`);
    res.status(200).json({ success: true, message: 'Feature deleted successfully' });
  } catch (error) {
    next(toHttpError(error));
  }
};

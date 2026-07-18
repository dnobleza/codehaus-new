const logger = require('../utils/logger');
const { toHttpError } = require('../utils/httpError');
const packagesService = require('../services/packages.service');
const TAG = '[PACKAGES-CONTROLLER]';

// Client-facing: active packages only.
exports.list = async (req, res, next) => {
  try {
    const packages = await packagesService.listPublicPackages();
    logger.info(`${TAG} Listed ${packages.length} public packages`);
    res.status(200).json({ success: true, message: 'Packages retrieved successfully', data: packages });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const pkg = await packagesService.getPackageDetail(req.params.id, { requireActive: true });
    logger.info(`${TAG} Package ${req.params.id} retrieved`);
    res.status(200).json({ success: true, message: 'Package retrieved successfully', data: pkg });
  } catch (error) {
    next(toHttpError(error));
  }
};

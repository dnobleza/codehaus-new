const logger = require('../utils/logger');
const { toHttpError } = require('../utils/httpError');
const addonsService = require('../services/addons.service');
const TAG = '[ADDONS-CONTROLLER]';

// Client-facing: active add-ons only, flat with a `category` field
// (frontend groups them; see report for reasoning).
exports.list = async (req, res, next) => {
  try {
    const addons = await addonsService.listPublicAddons();
    logger.info(`${TAG} Listed ${addons.length} public add-ons`);
    res.status(200).json({ success: true, message: 'Add-ons retrieved successfully', data: addons });
  } catch (error) {
    next(toHttpError(error));
  }
};

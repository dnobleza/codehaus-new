const logger = require('../utils/logger');
const { toHttpError } = require('../utils/httpError');
const { createAddonSchema, updateAddonSchema } = require('../validators/addons.validator');
const addonsService = require('../services/addons.service');
const TAG = '[ADMIN-ADDONS-CONTROLLER]';

exports.list = async (req, res, next) => {
  try {
    const addons = await addonsService.listAdminAddons();
    logger.info(`${TAG} Listed ${addons.length} add-ons (admin)`);
    res.status(200).json({ success: true, message: 'Add-ons retrieved successfully', data: addons });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const addon = await addonsService.getAddon(req.params.id);
    logger.info(`${TAG} Add-on ${req.params.id} retrieved (admin)`);
    res.status(200).json({ success: true, message: 'Add-on retrieved successfully', data: addon });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = createAddonSchema.parse(req.body);
    const addon = await addonsService.createAddon(data);
    logger.info(`${TAG} Add-on ${addon.id} created`);
    res.status(201).json({ success: true, message: 'Add-on created successfully', data: addon });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = updateAddonSchema.parse(req.body);
    const addon = await addonsService.updateAddon(req.params.id, data);
    logger.info(`${TAG} Add-on ${req.params.id} updated`);
    res.status(200).json({ success: true, message: 'Add-on updated successfully', data: addon });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.remove = async (req, res, next) => {
  try {
    await addonsService.deleteAddon(req.params.id);
    logger.info(`${TAG} Add-on ${req.params.id} deleted`);
    res.status(200).json({ success: true, message: 'Add-on deleted successfully' });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.activate = async (req, res, next) => {
  try {
    const addon = await addonsService.setAddonActive(req.params.id, true);
    logger.info(`${TAG} Add-on ${req.params.id} activated`);
    res.status(200).json({ success: true, message: 'Add-on activated successfully', data: addon });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.deactivate = async (req, res, next) => {
  try {
    const addon = await addonsService.setAddonActive(req.params.id, false);
    logger.info(`${TAG} Add-on ${req.params.id} deactivated`);
    res.status(200).json({ success: true, message: 'Add-on deactivated successfully', data: addon });
  } catch (error) {
    next(toHttpError(error));
  }
};

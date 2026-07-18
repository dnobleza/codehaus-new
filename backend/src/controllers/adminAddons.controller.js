const { toHttpError } = require('../utils/httpError');
const { createAddonSchema, updateAddonSchema } = require('../validators/addons.validator');
const addonsService = require('../services/addons.service');

exports.list = async (req, res, next) => {
  try {
    const addons = await addonsService.listAdminAddons();
    res.status(200).json({ success: true, message: 'Add-ons retrieved successfully', data: addons });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const addon = await addonsService.getAddon(req.params.id);
    res.status(200).json({ success: true, message: 'Add-on retrieved successfully', data: addon });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = createAddonSchema.parse(req.body);
    const addon = await addonsService.createAddon(data);
    res.status(201).json({ success: true, message: 'Add-on created successfully', data: addon });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = updateAddonSchema.parse(req.body);
    const addon = await addonsService.updateAddon(req.params.id, data);
    res.status(200).json({ success: true, message: 'Add-on updated successfully', data: addon });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.remove = async (req, res, next) => {
  try {
    await addonsService.deleteAddon(req.params.id);
    res.status(200).json({ success: true, message: 'Add-on deleted successfully' });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.activate = async (req, res, next) => {
  try {
    const addon = await addonsService.setAddonActive(req.params.id, true);
    res.status(200).json({ success: true, message: 'Add-on activated successfully', data: addon });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.deactivate = async (req, res, next) => {
  try {
    const addon = await addonsService.setAddonActive(req.params.id, false);
    res.status(200).json({ success: true, message: 'Add-on deactivated successfully', data: addon });
  } catch (error) {
    next(toHttpError(error));
  }
};

const { toHttpError } = require('../utils/httpError');
const addonsService = require('../services/addons.service');

// Client-facing: active add-ons only, flat with a `category` field
// (frontend groups them; see report for reasoning).
exports.list = async (req, res, next) => {
  try {
    const addons = await addonsService.listPublicAddons();
    res.status(200).json({ success: true, message: 'Add-ons retrieved successfully', data: addons });
  } catch (error) {
    next(toHttpError(error));
  }
};

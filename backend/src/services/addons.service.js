const addonsRepo = require('../repositories/addons.repository');
const logger = require('../utils/logger');
const TAG = '[ADDONS-SERVICE]';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function listPublicAddons() {
  return addonsRepo.listActive();
}

async function listAdminAddons() {
  return addonsRepo.listAll();
}

async function getAddon(id) {
  const addon = await addonsRepo.findById(id);
  if (!addon) throw httpError(404, 'Add-on not found');
  return addon;
}

async function createAddon(data) {
  try {
    const addon = await addonsRepo.create(data);
    logger.info(`${TAG} Created addon ${addon.id}`);
    return addon;
  } catch (error) {
    if (error.code === '23505') throw httpError(409, 'An add-on with this name already exists in this category');
    throw error;
  }
}

async function updateAddon(id, data) {
  await getAddon(id);
  try {
    return await addonsRepo.update(id, data);
  } catch (error) {
    if (error.code === '23505') throw httpError(409, 'An add-on with this name already exists in this category');
    throw error;
  }
}

async function deleteAddon(id) {
  await getAddon(id);
  try {
    await addonsRepo.remove(id);
    logger.info(`${TAG} Deleted addon ${id}`);
  } catch (error) {
    // See packages.service.js's deletePackage for why both 23001
    // (restrict_violation, the actual code an ON DELETE RESTRICT fires) and
    // 23503 (foreign_key_violation) are checked here.
    if (error.code === '23001' || error.code === '23503') {
      throw httpError(409, 'Cannot delete an add-on referenced by existing quotations. Deactivate it instead.');
    }
    throw error;
  }
}

async function setAddonActive(id, isActive) {
  const addon = await addonsRepo.setActive(id, isActive);
  if (!addon) throw httpError(404, 'Add-on not found');
  return addon;
}

module.exports = {
  listPublicAddons,
  listAdminAddons,
  getAddon,
  createAddon,
  updateAddon,
  deleteAddon,
  setAddonActive,
};

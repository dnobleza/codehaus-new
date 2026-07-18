const packagesRepo = require('../repositories/packages.repository');
const logger = require('../utils/logger');
const TAG = '[PACKAGES-SERVICE]';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Public/client-facing list: active packages only, ordered by display_order
// (repository already applies both filter and ordering).
async function listPublicPackages() {
  return packagesRepo.listActive();
}

// Admin list: everything, active or not.
async function listAdminPackages() {
  return packagesRepo.listAll();
}

async function getPackageDetail(id, { requireActive = false } = {}) {
  const pkg = await packagesRepo.findById(id);
  if (!pkg || (requireActive && !pkg.is_active)) {
    throw httpError(404, 'Package not found');
  }
  return pkg;
}

async function ensurePackageExists(id) {
  const pkg = await packagesRepo.findCoreById(id);
  if (!pkg) throw httpError(404, 'Package not found');
  return pkg;
}

async function createPackage(data, createdBy) {
  const slug = slugify(data.slug || data.name);
  try {
    const pkg = await packagesRepo.create({ ...data, slug, createdBy });
    logger.info(`${TAG} Created package ${pkg.id}`);
    return getPackageDetail(pkg.id);
  } catch (error) {
    if (error.code === '23505') throw httpError(409, 'A package with this slug already exists');
    if (error.code === '23514') {
      throw httpError(
        400,
        'Package price/timeline violates a validation rule (e.g. a non-custom package must have a base price)'
      );
    }
    throw error;
  }
}

async function updatePackage(id, data) {
  await ensurePackageExists(id);

  const updateData = { ...data };
  if (data.slug) updateData.slug = slugify(data.slug);

  try {
    await packagesRepo.update(id, updateData);
    return getPackageDetail(id);
  } catch (error) {
    if (error.code === '23505') throw httpError(409, 'A package with this slug already exists');
    if (error.code === '23514') throw httpError(400, 'Package price/timeline violates a validation rule');
    throw error;
  }
}

async function deletePackage(id) {
  await ensurePackageExists(id);
  try {
    await packagesRepo.remove(id);
    logger.info(`${TAG} Deleted package ${id}`);
  } catch (error) {
    // project_packages FK's from projects/quotations are ON DELETE RESTRICT
    // by design (see design doc) -- surface that as a clear 409, not a 500.
    // Verified empirically against Postgres: an explicit ON DELETE RESTRICT
    // violation raises SQLSTATE 23001 (restrict_violation), NOT 23503
    // (foreign_key_violation, which Postgres reserves for a plain/NO ACTION
    // FK check -- e.g. on INSERT/UPDATE with a dangling reference). Both are
    // checked here since either could theoretically surface depending on
    // constraint timing, but 23001 is the one that actually fires for this
    // RESTRICT-on-DELETE case.
    if (error.code === '23001' || error.code === '23503') {
      throw httpError(
        409,
        'Cannot delete a package referenced by existing projects or quotations. Deactivate it instead.'
      );
    }
    throw error;
  }
}

async function setPackageActive(id, isActive) {
  const pkg = await packagesRepo.setActive(id, isActive);
  if (!pkg) throw httpError(404, 'Package not found');
  return getPackageDetail(id);
}

async function setPackageThumbnail(id, url) {
  const pkg = await packagesRepo.setThumbnail(id, url);
  if (!pkg) throw httpError(404, 'Package not found');
  return pkg;
}

async function setPackageBanner(id, url) {
  const pkg = await packagesRepo.setBanner(id, url);
  if (!pkg) throw httpError(404, 'Package not found');
  return pkg;
}

async function addPage(packageId, data) {
  await ensurePackageExists(packageId);
  return packagesRepo.addPage(packageId, data);
}

async function updatePage(packageId, pageId, data) {
  await ensurePackageExists(packageId);
  const page = await packagesRepo.findPageById(pageId);
  if (!page || page.package_id !== packageId) throw httpError(404, 'Page not found');
  return packagesRepo.updatePage(pageId, data);
}

async function deletePage(packageId, pageId) {
  await ensurePackageExists(packageId);
  const page = await packagesRepo.findPageById(pageId);
  if (!page || page.package_id !== packageId) throw httpError(404, 'Page not found');
  await packagesRepo.deletePage(pageId);
}

async function addFeature(packageId, data) {
  await ensurePackageExists(packageId);
  return packagesRepo.addFeature(packageId, data);
}

async function updateFeature(packageId, featureId, data) {
  await ensurePackageExists(packageId);
  const feature = await packagesRepo.findFeatureById(featureId);
  if (!feature || feature.package_id !== packageId) throw httpError(404, 'Feature not found');
  return packagesRepo.updateFeature(featureId, data);
}

async function deleteFeature(packageId, featureId) {
  await ensurePackageExists(packageId);
  const feature = await packagesRepo.findFeatureById(featureId);
  if (!feature || feature.package_id !== packageId) throw httpError(404, 'Feature not found');
  await packagesRepo.deleteFeature(featureId);
}

module.exports = {
  listPublicPackages,
  listAdminPackages,
  getPackageDetail,
  createPackage,
  updatePackage,
  deletePackage,
  setPackageActive,
  setPackageThumbnail,
  setPackageBanner,
  addPage,
  updatePage,
  deletePage,
  addFeature,
  updateFeature,
  deleteFeature,
};

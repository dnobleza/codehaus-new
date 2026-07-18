const pool = require('../config/database');
const quotationsRepo = require('../repositories/quotations.repository');
const projectsRepo = require('../repositories/projects.repository');
const packagesRepo = require('../repositories/packages.repository');
const addonsRepo = require('../repositories/addons.repository');
const logger = require('../utils/logger');
const TAG = '[QUOTATIONS-SERVICE]';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

// Never trust a client-submitted total -- always recompute server-side from
// the CURRENT catalog (project_packages / addons) at the moment the
// quotation is written, then snapshot the result onto the quotation/
// quotation_addons rows. See the design doc's "Historical pricing/timeline
// integrity" section for why quotations own their own base_price/timeline/
// addon-price columns instead of joining live to the catalog.
async function resolvePricing(dbClient, { packageId, addonIds }) {
  let basePrice = 0;
  let timelineMin = null;
  let timelineMax = null;

  if (packageId) {
    const pkg = await packagesRepo.findCoreById(packageId, dbClient);
    if (!pkg) throw httpError(400, 'Selected package does not exist');
    if (!pkg.is_active) throw httpError(400, 'Selected package is not currently available');
    if (pkg.base_price === null) {
      throw httpError(400, 'This package has no catalog price and requires an admin-prepared custom quotation');
    }
    basePrice = Number(pkg.base_price);
    timelineMin = pkg.estimated_timeline_min_days;
    timelineMax = pkg.estimated_timeline_max_days;
  }

  const uniqueAddonIds = [...new Set(addonIds || [])];
  const addonRows = uniqueAddonIds.length > 0 ? await addonsRepo.findManyByIds(uniqueAddonIds, dbClient) : [];
  if (addonRows.length !== uniqueAddonIds.length) {
    throw httpError(400, 'One or more selected add-ons do not exist');
  }
  const inactive = addonRows.filter((addon) => !addon.is_active);
  if (inactive.length > 0) {
    throw httpError(400, `Add-on(s) no longer available: ${inactive.map((addon) => addon.name).join(', ')}`);
  }

  return { basePrice, timelineMin, timelineMax, addonRows };
}

function computeTotal(basePrice, discountAmount, addonRows) {
  const addonsTotal = addonRows.reduce((sum, addon) => sum + Number(addon.price), 0);
  const total = toMoney(basePrice - discountAmount + addonsTotal);
  if (total < 0) throw httpError(400, 'Discount cannot exceed the package price plus add-ons total');
  return total;
}

async function persistQuotation(dbClient, { projectId, packageId, discountAmount, status, sentAt, pricing }) {
  const totalAmount = computeTotal(pricing.basePrice, discountAmount, pricing.addonRows);

  const quotation = await quotationsRepo.insert(
    {
      projectId,
      packageId: packageId ?? null,
      basePrice: pricing.basePrice,
      estimatedTimelineMinDays: pricing.timelineMin,
      estimatedTimelineMaxDays: pricing.timelineMax,
      discountAmount,
      totalAmount,
      status,
      sentAt,
    },
    dbClient
  );

  for (const addon of pricing.addonRows) {
    await quotationsRepo.insertAddon({ quotationId: quotation.id, addonId: addon.id, priceAtTime: addon.price }, dbClient);
  }

  return quotation;
}

// Client-triggered (POST /projects/:id/quotations). Persists the client's
// package + add-on selection as a 'draft' quotation on their OWN project.
// Deliberately does NOT advance project.status_code: the project stays
// 'submitted' so it still goes through the admin's Accept/Decline gate
// (adminProjects accept/decline) before anyone acts on it. Accepting moves
// the project to 'under_review', at which point the admin's quotation
// builder picks up this exact draft (package/add-ons already chosen by the
// client) via `draftQuotation` and can review/edit it before sending.
//
// Judgment call: this is a persist-on-submit action, not a live-pricing
// endpoint. Per the brief's own reasoning, step 4's "quotation updates in
// real time" as the client toggles add-ons is served entirely by the
// frontend computing totals client-side from the GET /packages + GET
// /addons price data it already has in hand (both are simple catalog
// reads with a handful of rows) -- hitting this endpoint on every checkbox
// toggle would be unnecessary network chatter for a purely additive sum the
// frontend can already do. This endpoint is called once, when the client is
// ready to submit/request a quote, and the server always recomputes the
// total from current catalog prices rather than trusting whatever the
// frontend displayed.
async function createClientQuotationRequest({ projectId, clientId, packageId, addonIds }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: projectRows } = await client.query(
      'SELECT * FROM projects WHERE id = $1 AND client_id = $2 FOR UPDATE',
      [projectId, clientId]
    );
    const project = projectRows[0];
    if (!project) throw httpError(404, 'Project not found');

    const resolvedPackageId = packageId ?? project.package_id;
    if (!resolvedPackageId) {
      throw httpError(400, 'This is a custom project request; an administrator must prepare your quotation');
    }

    const pricing = await resolvePricing(client, { packageId: resolvedPackageId, addonIds });
    const quotation = await persistQuotation(client, {
      projectId,
      packageId: resolvedPackageId,
      discountAmount: 0, // clients can never set a discount
      status: 'draft',
      sentAt: null,
      pricing,
    });

    await client.query('COMMIT');
    logger.info(`${TAG} Client ${clientId} requested quotation ${quotation.id} for project ${projectId}`);
    return quotation;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Admin/staff-only (POST /admin/projects/:id/quotations). Creates a BRAND
// NEW quotation row and sends it immediately (status='sent', sent_at=now()),
// per the brief's literal wording ("admin finalizes/sends a quotation").
// This does not mutate any prior draft the client may have created via
// createClientQuotationRequest -- quotations are intentionally versioned/
// historical (a project can accumulate more than one over its life, per the
// design doc), so "sending a quotation" always means "here is the operative
// quote going forward", never "silently rewrite history".
async function adminCreateAndSendQuotation({ projectId, packageId, addonIds, discountAmount }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: projectRows } = await client.query('SELECT * FROM projects WHERE id = $1 FOR UPDATE', [projectId]);
    const project = projectRows[0];
    if (!project) throw httpError(404, 'Project not found');

    const resolvedPackageId = packageId ?? project.package_id;
    const pricing = await resolvePricing(client, { packageId: resolvedPackageId, addonIds });
    const quotation = await persistQuotation(client, {
      projectId,
      packageId: resolvedPackageId,
      discountAmount,
      status: 'sent',
      sentAt: new Date(),
      pricing,
    });

    await projectsRepo.updateStatus(projectId, 'quotation_sent', client);

    await client.query('COMMIT');
    logger.info(`${TAG} Quotation ${quotation.id} created and sent for project ${projectId}`);
    return quotation;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Admin/staff-only (PATCH /admin/projects/:id/quotations/:quotationId).
// Edits a quotation that is still 'draft' -- e.g. to correct a client-
// submitted request before deciding whether to send it. Rejects (409) once
// the quotation has moved past draft, since sent/accepted/rejected
// quotations are historical records at that point.
async function adminEditDraftQuotation({ projectId, quotationId, packageId, addonIds, discountAmount }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: quotationRows } = await client.query(
      'SELECT * FROM quotations WHERE id = $1 AND project_id = $2 FOR UPDATE',
      [quotationId, projectId]
    );
    const quotation = quotationRows[0];
    if (!quotation) throw httpError(404, 'Quotation not found');
    if (quotation.status !== 'draft') {
      throw httpError(409, 'Only draft quotations can be edited');
    }

    const resolvedPackageId = packageId ?? quotation.package_id;
    const pricing = await resolvePricing(client, { packageId: resolvedPackageId, addonIds });
    const totalAmount = computeTotal(pricing.basePrice, discountAmount ?? 0, pricing.addonRows);

    const updated = await quotationsRepo.updateCore(
      quotationId,
      {
        packageId: resolvedPackageId,
        basePrice: pricing.basePrice,
        estimatedTimelineMinDays: pricing.timelineMin,
        estimatedTimelineMaxDays: pricing.timelineMax,
        discountAmount: discountAmount ?? 0,
        totalAmount,
      },
      client
    );

    await quotationsRepo.clearAddons(quotationId, client);
    for (const addon of pricing.addonRows) {
      await quotationsRepo.insertAddon({ quotationId, addonId: addon.id, priceAtTime: addon.price }, client);
    }

    await client.query('COMMIT');
    logger.info(`${TAG} Draft quotation ${quotationId} edited`);
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Admin/staff-only (PATCH .../quotations/:quotationId/send). Sends a
// quotation that started life as a draft (the client's own auto-created
// request, or one an admin composed/edited but held back). Added as a
// judgment call beyond the brief's literal endpoint list: a draft that can
// never itself become 'sent' would make adminEditDraftQuotation pointless,
// so a dedicated send action for an EXISTING draft complements (not
// duplicates) adminCreateAndSendQuotation's "create a fresh one and send
// it immediately" behavior. See report for full reasoning.
async function adminSendQuotation({ projectId, quotationId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: quotationRows } = await client.query(
      'SELECT * FROM quotations WHERE id = $1 AND project_id = $2 FOR UPDATE',
      [quotationId, projectId]
    );
    const quotation = quotationRows[0];
    if (!quotation) throw httpError(404, 'Quotation not found');
    if (quotation.status !== 'draft') {
      throw httpError(409, 'Quotation has already been sent or resolved');
    }

    const updated = await quotationsRepo.setStatus(quotationId, { status: 'sent', sentAt: new Date() }, client);
    await projectsRepo.updateStatus(projectId, 'quotation_sent', client);

    await client.query('COMMIT');
    logger.info(`${TAG} Draft quotation ${quotationId} sent`);
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Client-triggered accept/reject (PATCH /projects/:id/quotations/:id/accept|reject).
// Only a 'sent' quotation belonging to the caller's own project can be
// responded to.
async function respondToQuotation({ projectId, quotationId, clientId, decision }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: projectRows } = await client.query(
      'SELECT * FROM projects WHERE id = $1 AND client_id = $2 FOR UPDATE',
      [projectId, clientId]
    );
    if (!projectRows[0]) throw httpError(404, 'Project not found');

    const { rows: quotationRows } = await client.query(
      'SELECT * FROM quotations WHERE id = $1 AND project_id = $2 FOR UPDATE',
      [quotationId, projectId]
    );
    const quotation = quotationRows[0];
    if (!quotation) throw httpError(404, 'Quotation not found');
    if (quotation.status !== 'sent') {
      throw httpError(409, 'Only a sent quotation awaiting a response can be accepted or rejected');
    }

    const newQuotationStatus = decision === 'accept' ? 'accepted' : 'rejected';
    const newProjectStatus = decision === 'accept' ? 'quotation_accepted' : 'quotation_rejected';

    const updated = await quotationsRepo.setStatus(
      quotationId,
      { status: newQuotationStatus, respondedAt: new Date() },
      client
    );
    await projectsRepo.updateStatus(projectId, newProjectStatus, client);

    await client.query('COMMIT');
    logger.info(`${TAG} Client ${clientId} ${decision}ed quotation ${quotationId}`);
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createClientQuotationRequest,
  adminCreateAndSendQuotation,
  adminEditDraftQuotation,
  adminSendQuotation,
  respondToQuotation,
};

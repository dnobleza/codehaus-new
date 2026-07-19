const logger = require('../utils/logger');
const { toHttpError } = require('../utils/httpError');
const { adminStatusUpdateSchema, adminDeclineSchema } = require('../validators/projects.validator');
const { adminQuotationSchema } = require('../validators/quotations.validator');
const { updateMilestoneProgressSchema } = require('../validators/milestones.validator');
const projectsService = require('../services/projects.service');
const quotationsService = require('../services/quotations.service');
const projectOverviewService = require('../services/projectOverview.service');
const TAG = '[ADMIN-PROJECTS-CONTROLLER]';

exports.list = async (req, res, next) => {
  try {
    const projects = await projectsService.listProjectsAdmin({ statusCode: req.query.status_code });
    logger.info(`${TAG} Listed ${projects.length} projects (admin)`);
    res.status(200).json({ success: true, message: 'Projects retrieved successfully', data: projects });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const project = await projectsService.getProjectAdmin(req.params.id);
    logger.info(`${TAG} Project ${req.params.id} retrieved (admin)`);
    res.status(200).json({ success: true, message: 'Project retrieved successfully', data: project });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { statusCode } = adminStatusUpdateSchema.parse(req.body);
    const project = await projectsService.updateProjectStatusAdmin(req.params.id, statusCode);
    logger.info(`${TAG} Project ${req.params.id} status updated to ${statusCode}`);
    res.status(200).json({ success: true, message: 'Project status updated successfully', data: project });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.accept = async (req, res, next) => {
  try {
    const project = await projectsService.acceptProjectAdmin(req.params.id);
    logger.info(`${TAG} Project ${req.params.id} accepted`);
    res.status(200).json({ success: true, message: 'Project request accepted', data: project });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.decline = async (req, res, next) => {
  try {
    const { reason } = adminDeclineSchema.parse(req.body);
    const project = await projectsService.declineProjectAdmin(req.params.id, reason);
    logger.info(`${TAG} Project ${req.params.id} declined`);
    res.status(200).json({ success: true, message: 'Project request declined', data: project });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.deliver = async (req, res, next) => {
  try {
    const project = await projectsService.markProjectDeliveredAdmin(req.params.id);
    logger.info(`${TAG} Project ${req.params.id} marked delivered`);
    res.status(200).json({ success: true, message: 'Project marked as delivered', data: project });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.createAndSendQuotation = async (req, res, next) => {
  try {
    const data = adminQuotationSchema.parse(req.body);
    const quotation = await quotationsService.adminCreateAndSendQuotation({
      projectId: req.params.id,
      packageId: data.packageId,
      addonIds: data.addonIds,
      discountAmount: data.discountAmount,
    });
    logger.info(`${TAG} Quotation ${quotation.id} created and sent for project ${req.params.id}`);
    res.status(201).json({ success: true, message: 'Quotation created and sent to client', data: quotation });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.editDraftQuotation = async (req, res, next) => {
  try {
    const data = adminQuotationSchema.parse(req.body);
    const quotation = await quotationsService.adminEditDraftQuotation({
      projectId: req.params.id,
      quotationId: req.params.quotationId,
      packageId: data.packageId,
      addonIds: data.addonIds,
      discountAmount: data.discountAmount,
    });
    logger.info(`${TAG} Draft quotation ${req.params.quotationId} updated for project ${req.params.id}`);
    res.status(200).json({ success: true, message: 'Draft quotation updated successfully', data: quotation });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.updateMilestoneProgress = async (req, res, next) => {
  try {
    const data = updateMilestoneProgressSchema.parse(req.body);
    const milestone = await projectOverviewService.updateMilestoneProgress(
      req.params.id,
      req.params.milestoneId,
      data,
      req.user.id
    );
    logger.info(`${TAG} Milestone ${req.params.milestoneId} updated for project ${req.params.id}`);
    res.status(200).json({ success: true, message: 'Milestone progress updated successfully', data: milestone });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.generateMilestones = async (req, res, next) => {
  try {
    const milestones = await projectOverviewService.generateMilestoneTemplateAdmin(req.params.id);
    logger.info(`${TAG} Milestone template generated for project ${req.params.id}`);
    res.status(201).json({ success: true, message: 'Milestone template generated successfully', data: milestones });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.sendDraftQuotation = async (req, res, next) => {
  try {
    const quotation = await quotationsService.adminSendQuotation({
      projectId: req.params.id,
      quotationId: req.params.quotationId,
    });
    logger.info(`${TAG} Draft quotation ${req.params.quotationId} sent for project ${req.params.id}`);
    res.status(200).json({ success: true, message: 'Quotation sent to client', data: quotation });
  } catch (error) {
    next(toHttpError(error));
  }
};

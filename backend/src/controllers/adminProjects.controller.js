const { toHttpError } = require('../utils/httpError');
const { adminStatusUpdateSchema, adminDeclineSchema } = require('../validators/projects.validator');
const { adminQuotationSchema } = require('../validators/quotations.validator');
const projectsService = require('../services/projects.service');
const quotationsService = require('../services/quotations.service');

exports.list = async (req, res, next) => {
  try {
    const projects = await projectsService.listProjectsAdmin({ statusCode: req.query.status_code });
    res.status(200).json({ success: true, message: 'Projects retrieved successfully', data: projects });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const project = await projectsService.getProjectAdmin(req.params.id);
    res.status(200).json({ success: true, message: 'Project retrieved successfully', data: project });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { statusCode } = adminStatusUpdateSchema.parse(req.body);
    const project = await projectsService.updateProjectStatusAdmin(req.params.id, statusCode);
    res.status(200).json({ success: true, message: 'Project status updated successfully', data: project });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.accept = async (req, res, next) => {
  try {
    const project = await projectsService.acceptProjectAdmin(req.params.id);
    res.status(200).json({ success: true, message: 'Project request accepted', data: project });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.decline = async (req, res, next) => {
  try {
    const { reason } = adminDeclineSchema.parse(req.body);
    const project = await projectsService.declineProjectAdmin(req.params.id, reason);
    res.status(200).json({ success: true, message: 'Project request declined', data: project });
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
    res.status(200).json({ success: true, message: 'Draft quotation updated successfully', data: quotation });
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
    res.status(200).json({ success: true, message: 'Quotation sent to client', data: quotation });
  } catch (error) {
    next(toHttpError(error));
  }
};

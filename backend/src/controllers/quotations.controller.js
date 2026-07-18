const { toHttpError } = require('../utils/httpError');
const { clientCreateQuotationSchema } = require('../validators/quotations.validator');
const quotationsService = require('../services/quotations.service');

// Client-triggered: persists the client's package + add-on selection as a
// draft quotation request on their own project (see quotations.service.js
// for the "why not a live-pricing endpoint" reasoning).
exports.create = async (req, res, next) => {
  try {
    const data = clientCreateQuotationSchema.parse(req.body);
    const quotation = await quotationsService.createClientQuotationRequest({
      projectId: req.params.id,
      clientId: req.user.id,
      packageId: data.packageId,
      addonIds: data.addonIds,
    });
    res.status(201).json({ success: true, message: 'Quotation request submitted successfully', data: quotation });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.accept = async (req, res, next) => {
  try {
    const quotation = await quotationsService.respondToQuotation({
      projectId: req.params.id,
      quotationId: req.params.quotationId,
      clientId: req.user.id,
      decision: 'accept',
    });
    res.status(200).json({ success: true, message: 'Quotation accepted', data: quotation });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.reject = async (req, res, next) => {
  try {
    const quotation = await quotationsService.respondToQuotation({
      projectId: req.params.id,
      quotationId: req.params.quotationId,
      clientId: req.user.id,
      decision: 'reject',
    });
    res.status(200).json({ success: true, message: 'Quotation rejected', data: quotation });
  } catch (error) {
    next(toHttpError(error));
  }
};

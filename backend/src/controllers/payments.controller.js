const { toHttpError, httpError } = require('../utils/httpError');
const { createPaymentSchema } = require('../validators/payments.validator');
const paymentsService = require('../services/payments.service');
const { relativeUploadPath } = require('../middleware/upload.middleware');
const { presentPayment, presentPayments } = require('../utils/paymentPresenter');

exports.create = async (req, res, next) => {
  try {
    const data = createPaymentSchema.parse(req.body);
    if (!req.file) {
      throw httpError(400, 'Proof of payment file is required');
    }

    const payment = await paymentsService.createPayment({
      projectId: req.params.id,
      clientId: req.user.id,
      paymentMethod: data.paymentMethod,
      amount: data.amount,
      referenceNumber: data.referenceNumber,
      proofOfPaymentUrl: relativeUploadPath(req.file.path),
    });

    res.status(201).json({
      success: true,
      message: 'Payment submitted and awaiting verification',
      data: presentPayment(payment),
    });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.list = async (req, res, next) => {
  try {
    const payments = await paymentsService.listPaymentsForClientProject(req.params.id, req.user.id);
    res.status(200).json({ success: true, message: 'Payments retrieved successfully', data: presentPayments(payments) });
  } catch (error) {
    next(toHttpError(error));
  }
};

// Authenticated proof-of-payment file stream. Authorization (owner client
// OR ADMIN/STAFF) and the not-found-vs-unauthorized 404 collapsing both
// happen in the service layer -- see payments.service.js's
// resolveProofForAccess for the full reasoning.
exports.getProof = async (req, res, next) => {
  try {
    const { absolutePath } = await paymentsService.resolveProofForAccess({
      projectId: req.params.id,
      paymentId: req.params.paymentId,
      requestingUser: req.user,
    });

    res.sendFile(absolutePath, (error) => {
      if (error && !res.headersSent) {
        error.statusCode = error.statusCode || 404;
        next(error);
      }
    });
  } catch (error) {
    next(toHttpError(error));
  }
};

const logger = require('../utils/logger');
const { toHttpError } = require('../utils/httpError');
const paymentsService = require('../services/payments.service');
const { presentPayment, presentPayments } = require('../utils/paymentPresenter');
const TAG = '[ADMIN-PAYMENTS-CONTROLLER]';

exports.list = async (req, res, next) => {
  try {
    const payments = await paymentsService.listPaymentsAdmin({ status: req.query.status });
    logger.info(`${TAG} Listed ${payments.length} payments (admin)`);
    res.status(200).json({ success: true, message: 'Payments retrieved successfully', data: presentPayments(payments) });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.verify = async (req, res, next) => {
  try {
    const payment = await paymentsService.verifyPayment(req.params.id, req.user.id);
    logger.info(`${TAG} Payment ${req.params.id} verified by user ${req.user.id}`);
    res.status(200).json({
      success: true,
      message: 'Payment verified; project marked as accepted',
      data: presentPayment(payment),
    });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.reject = async (req, res, next) => {
  try {
    const payment = await paymentsService.rejectPayment(req.params.id, req.user.id);
    logger.info(`${TAG} Payment ${req.params.id} rejected by user ${req.user.id}`);
    res.status(200).json({ success: true, message: 'Payment rejected', data: presentPayment(payment) });
  } catch (error) {
    next(toHttpError(error));
  }
};

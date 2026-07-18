// Shapes a raw `payments` row for API responses. Never returns the raw
// disk-relative `proof_of_payment_url` value stored internally -- proof-of-
// payment files contain financial PII (bank account numbers, GCash/Maya
// transaction screenshots) and must only be reachable through the
// authenticated GET /projects/:id/payments/:paymentId/proof route (see
// payments.service.js's resolveProofForAccess, which re-checks project
// ownership or ADMIN/STAFF before streaming the file from disk). This
// presenter swaps the raw path for that route's URL instead, so nothing in
// an API response ever points at the (now unauthenticated-inaccessible)
// static upload path.
function presentPayment(payment) {
  if (!payment) return payment;
  const { proof_of_payment_url, ...rest } = payment;
  return {
    ...rest,
    proof_of_payment_url: proof_of_payment_url
      ? `/projects/${payment.project_id}/payments/${payment.id}/proof`
      : null,
  };
}

function presentPayments(payments) {
  return (payments || []).map(presentPayment);
}

module.exports = { presentPayment, presentPayments };

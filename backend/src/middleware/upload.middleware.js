const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Local disk storage under backend/uploads/{thumbnails,banners,payment-proofs}/.
// backend/uploads/ is already gitignored (see .gitignore's "Uploads (multer
// runtime files)" section) -- no new ignore rule needed.
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const DIRS = {
  thumbnails: path.join(UPLOAD_ROOT, 'thumbnails'),
  banners: path.join(UPLOAD_ROOT, 'banners'),
  paymentProofs: path.join(UPLOAD_ROOT, 'payment-proofs'),
};
Object.values(DIRS).forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
// Proof-of-payment can plausibly be a screenshot OR a bank/e-wallet PDF receipt.
const PROOF_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, 'application/pdf']);

function storageFor(dir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });
}

function fileFilterFor(allowedMimeTypes, label) {
  return (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error(`Unsupported file type for ${label}. Allowed: ${[...allowedMimeTypes].join(', ')}`));
      return;
    }
    cb(null, true);
  };
}

const uploadThumbnail = multer({
  storage: storageFor(DIRS.thumbnails),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilterFor(IMAGE_MIME_TYPES, 'thumbnail'),
});

const uploadBanner = multer({
  storage: storageFor(DIRS.banners),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilterFor(IMAGE_MIME_TYPES, 'banner'),
});

const uploadPaymentProof = multer({
  storage: storageFor(DIRS.paymentProofs),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilterFor(PROOF_MIME_TYPES, 'proof of payment'),
});

// Thumbnails/banners are public marketing assets (meant to be visible in the
// client portal/package catalog), so they're served statically at /uploads
// (mounted in app.js) and this returns a root-relative path (e.g.
// "/uploads/banners/xyz.png") so the frontend can prefix whatever API origin
// it's configured with.
//
// payment-proofs is DELIBERATELY NOT served through this static path (see
// app.js) -- proof-of-payment files can contain financial PII (bank account
// numbers, GCash/Maya transaction screenshots), so they must only be
// reachable through the authenticated GET /projects/:id/payments/:paymentId/proof
// route, which re-checks ownership (or ADMIN/STAFF) before streaming the
// file. relativeUploadPath() is still used to compute the on-disk storage
// path recorded in payments.proof_of_payment_url (an internal bookkeeping
// value); it is never returned to API consumers as-is for payments -- see
// utils/paymentPresenter.js.
function relativeUploadPath(absolutePath) {
  const rel = path.relative(path.join(__dirname, '..', '..'), absolutePath);
  return '/' + rel.split(path.sep).join('/');
}

// Resolves a stored payment proof path back to an absolute path on disk for
// streaming via the authenticated proof route. Only the filename component
// is trusted (defense in depth against path traversal) -- even though the
// stored value is always generated internally by relativeUploadPath()/
// multer and never comes from user input, this guarantees the resolved path
// can never escape the payment-proofs directory regardless of what's in the
// DB column.
function resolvePaymentProofPath(storedValue) {
  const filename = path.basename(storedValue);
  return path.join(DIRS.paymentProofs, filename);
}

// Multer/file-filter errors arrive via a callback, not a thrown exception,
// and don't carry the `statusCode` property the existing global
// errorHandler middleware expects. This wrapper normalizes both success and
// failure into that same convention (never a raw crash, never a second
// error-handling path) instead of inventing a new one.
function wrapUpload(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        err.statusCode = err.statusCode || 400;
        next(err);
        return;
      }
      next();
    });
  };
}

module.exports = {
  uploadThumbnail,
  uploadBanner,
  uploadPaymentProof,
  relativeUploadPath,
  resolvePaymentProofPath,
  wrapUpload,
  DIRS,
};

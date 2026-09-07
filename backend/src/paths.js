const path = require('path');

// On Vercel's serverless runtime the deployment bundle is read-only; only
// /tmp is writable. This is now only used as a local-dev fallback for floor
// plan image uploads when BLOB_READ_WRITE_TOKEN isn't set — see storage.js.
// Vercel always sets VERCEL=1 at runtime.
const isVercel = !!process.env.VERCEL;

const uploadsDir =
  process.env.UPLOADS_DIR || (isVercel ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads'));

module.exports = { uploadsDir };

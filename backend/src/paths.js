const path = require('path');

// On Vercel's serverless runtime the deployment bundle is read-only; only
// /tmp is writable, and it does not persist reliably across invocations or
// cold starts. UPLOADS_DIR / DB_PATH let deployment configs point there,
// while local dev keeps everything inside the project folder.
//
// If those env vars are left unset on Vercel, opening the sqlite file (or
// writing an upload) inside the read-only bundle throws at module load,
// which crashes every request — including the admin auto-seed in db.js —
// before it can produce a real error response. Vercel always sets VERCEL=1
// at runtime, so fall back to /tmp automatically in that case rather than
// depending on the deployment being configured correctly.
const isVercel = !!process.env.VERCEL;

const uploadsDir =
  process.env.UPLOADS_DIR || (isVercel ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads'));
const dbPath =
  process.env.DB_PATH || (isVercel ? '/tmp/data.sqlite3' : path.join(__dirname, '..', 'data.sqlite3'));

module.exports = { uploadsDir, dbPath };

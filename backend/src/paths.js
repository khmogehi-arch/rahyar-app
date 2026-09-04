const path = require('path');

// On Vercel's serverless runtime the deployment bundle is read-only; only
// /tmp is writable, and it does not persist reliably across invocations or
// cold starts. UPLOADS_DIR / DB_PATH let deployment configs point there,
// while local dev keeps everything inside the project folder.
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite3');

module.exports = { uploadsDir, dbPath };

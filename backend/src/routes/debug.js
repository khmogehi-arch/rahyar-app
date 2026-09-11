const express = require('express');
const { uploadsDir } = require('../paths');

const router = express.Router();

// Diagnostic endpoint for the "admin login fails after deploy" class of bugs:
// reports whether Postgres/Blob env vars are configured and whether the
// admin user actually exists — without leaking the username or password.
// Wrapped defensively so a broken DB module reports a JSON error here
// instead of crashing the whole function.
router.get('/seed-status', async (req, res) => {
  let db;
  try {
    db = require('../db');
  } catch (err) {
    console.error('debug/seed-status: failed to load db module', err);
    return res.status(500).json({
      ok: false,
      stage: 'db-load',
      error: err.message,
    });
  }

  try {
    const { rows: countRows } = await db.query('SELECT COUNT(*)::int AS count FROM users');
    const userCount = countRows[0].count;
    const adminEnvConfigured = Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
    // seed-status previously only reported "user exists" — that passes even when
    // the hash that got created can never be logged into, e.g. a trailing
    // newline pasted into the Vercel dashboard for ADMIN_USERNAME/PASSWORD
    // (db.js now trims before hashing, but this still flags the mistake so it
    // gets fixed at the source in the dashboard) or JWT_SECRET missing, which
    // makes every login 500 regardless of the password being correct.
    const hasSurroundingWhitespace = (v) => typeof v === 'string' && v !== v.trim();
    const trimmedAdminUsername = process.env.ADMIN_USERNAME ? process.env.ADMIN_USERNAME.trim() : null;
    let adminUserExists = null;
    if (trimmedAdminUsername) {
      const { rows } = await db.query('SELECT id FROM users WHERE username = $1', [trimmedAdminUsername]);
      adminUserExists = Boolean(rows[0]);
    }

    res.json({
      ok: true,
      environment: {
        vercel: Boolean(process.env.VERCEL),
        databaseConfigured: Boolean(db.connectionInfo.usedEnvVar),
        // Which env var actually supplied the connection string in use (db.js
        // prefers a pooled candidate over DATABASE_URL when one is available)
        // and whether it looks like Neon's pooled (PgBouncer, "-pooler" host)
        // endpoint — the required setup for Vercel's serverless functions.
        databaseEnvVarUsed: db.connectionInfo.usedEnvVar,
        databaseUsesPooledConnection: db.connectionInfo.usedEnvVar ? db.connectionInfo.isPooled : null,
        blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
        uploadsDir,
      },
      admin: {
        envConfigured: adminEnvConfigured,
        userExists: adminUserExists,
        usernameHasSurroundingWhitespace: hasSurroundingWhitespace(process.env.ADMIN_USERNAME),
        passwordHasSurroundingWhitespace: hasSurroundingWhitespace(process.env.ADMIN_PASSWORD),
        passwordLength: process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.trim().length : null,
      },
      jwtSecretConfigured: Boolean(process.env.JWT_SECRET),
      userCount,
    });
  } catch (err) {
    console.error('debug/seed-status: query failed', err);
    res.status(500).json({
      ok: false,
      stage: 'db-query',
      error: err.message,
    });
  }
});

// Lets the admin-panel confirm it's actually reaching THIS backend deployment
// (and from what origin) rather than a stale preview URL baked into an old
// build. Open the browser devtools Network tab while hitting this from the
// admin panel: if it 404s or times out, the frontend's VITE_API_URL points
// somewhere else entirely; if it succeeds, "origin" below should match the
// admin panel's real domain.
router.get('/request-info', (req, res) => {
  res.json({
    origin: req.headers.origin || null,
    host: req.headers.host || null,
    forwardedHost: req.headers['x-forwarded-host'] || null,
    userAgent: req.headers['user-agent'] || null,
    vercelDeploymentUrl: process.env.VERCEL_URL || null,
    vercelEnv: process.env.VERCEL_ENV || null,
  });
});

module.exports = router;

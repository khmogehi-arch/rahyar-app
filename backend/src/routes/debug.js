const express = require('express');
const { uploadsDir, dbPath } = require('../paths');

const router = express.Router();

// Diagnostic endpoint for the "admin login fails after deploy" class of bugs
// (see the /tmp fallback fix in paths.js): reports whether the sqlite file
// could be opened, whether the auto-seed env vars are set, and whether the
// admin user actually exists — without leaking the username or password.
// Wrapped defensively so a broken DB/native module reports a JSON error
// here instead of crashing the whole function.
router.get('/seed-status', (req, res) => {
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
    const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
    const adminEnvConfigured = Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
    const adminUserExists = process.env.ADMIN_USERNAME
      ? Boolean(db.prepare('SELECT id FROM users WHERE username = ?').get(process.env.ADMIN_USERNAME))
      : null;

    res.json({
      ok: true,
      environment: {
        vercel: Boolean(process.env.VERCEL),
        dbPath,
        uploadsDir,
      },
      admin: {
        envConfigured: adminEnvConfigured,
        userExists: adminUserExists,
      },
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

module.exports = router;

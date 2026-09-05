const express = require('express');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { uploadsDir, dbPath } = require('../paths');

const router = express.Router();

// TEMPORARY debug endpoint to diagnose the admin-login-on-Vercel issue.
// Never returns raw secrets (ADMIN_PASSWORD/JWT_SECRET values or password
// hashes) — only whether they're set, their length, and derived facts that
// are safe to expose (paths, username, user counts, a hash/env match
// boolean). Remove this route once the admin login issue is confirmed fixed.
router.get('/seed-status', (req, res) => {
  const envVar = (name, { showValue = false } = {}) => {
    const raw = process.env[name];
    const set = raw !== undefined && raw !== '';
    const info = { set };
    if (set) {
      info.length = raw.length;
      info.hasSurroundingWhitespace = raw !== raw.trim();
      if (showValue) info.value = raw;
    }
    return info;
  };

  let dbFileExists = false;
  let dbFileSizeBytes = null;
  try {
    const stat = fs.statSync(dbPath);
    dbFileExists = true;
    dbFileSizeBytes = stat.size;
  } catch {
    dbFileExists = false;
  }

  let userCount = null;
  let usernames = [];
  let adminUserExists = false;
  let adminPasswordMatchesEnv = null;
  try {
    userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
    usernames = db.prepare('SELECT username FROM users ORDER BY id').all().map((r) => r.username);

    const adminUsername = process.env.ADMIN_USERNAME;
    if (adminUsername) {
      const user = db.prepare('SELECT password_hash FROM users WHERE username = ?').get(adminUsername);
      adminUserExists = !!user;
      if (user && process.env.ADMIN_PASSWORD) {
        adminPasswordMatchesEnv = bcrypt.compareSync(process.env.ADMIN_PASSWORD, user.password_hash);
      }
    }
  } catch (err) {
    return res.status(500).json({ error: 'خطا در خواندن پایگاه‌داده', detail: err.message });
  }

  res.json({
    runtime: {
      vercel: !!process.env.VERCEL,
      nodeEnv: process.env.NODE_ENV || null,
    },
    env: {
      ADMIN_USERNAME: envVar('ADMIN_USERNAME', { showValue: true }),
      ADMIN_PASSWORD: envVar('ADMIN_PASSWORD'),
      DB_PATH: envVar('DB_PATH', { showValue: true }),
      UPLOADS_DIR: envVar('UPLOADS_DIR', { showValue: true }),
      JWT_SECRET: envVar('JWT_SECRET'),
    },
    resolvedPaths: {
      dbPath,
      uploadsDir,
      dbFileExists,
      dbFileSizeBytes,
    },
    db: {
      userCount,
      usernames,
      adminUserExists,
      adminPasswordMatchesEnv,
    },
  });
});

module.exports = router;

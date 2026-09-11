const express = require('express');
const db = require('../db');

const router = express.Router();

// Neon (Free plan) suspends an idle compute after a few minutes and wakes it
// on the next query in well under a second — that alone is harmless and
// already handled by db.js's retries. This endpoint exists for the separate,
// longer-horizon risk: a Neon project that sees literally no traffic for
// weeks can have its branch data reset or the project itself reclaimed under
// Free-plan inactivity limits. A weekly ping (see vercel.json's `crons`)
// keeps the project "active" so that never comes into play, regardless of
// how the admin/visitor apps happen to be used that week.
router.get('/keepalive', async (req, res) => {
  // Vercel automatically sends `Authorization: Bearer $CRON_SECRET` when it
  // invokes a scheduled Cron Job, if CRON_SECRET is set on the project — set
  // it (Vercel Dashboard → backend project → Settings → Environment
  // Variables) to stop this endpoint from being triggerable by anyone who
  // finds the URL. Left permissive when CRON_SECRET isn't configured so
  // local/dev setups without it still work.
  if (process.env.CRON_SECRET) {
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    if (req.headers.authorization !== expected) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }

  try {
    await db.query('SELECT 1');
    res.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[cron/keepalive] db ping failed', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  // Logged with a request id so a specific failed attempt can be found in
  // Vercel's function logs and matched against what the browser reported.
  // Never logs the password or password_hash itself.
  const reqId = Math.random().toString(36).slice(2, 8);
  const origin = req.headers.origin || null;

  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      console.warn(`[auth/login:${reqId}] rejected: missing credentials`, { origin });
      return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است' });
    }

    if (!process.env.JWT_SECRET) {
      console.error(`[auth/login:${reqId}] JWT_SECRET is not configured`, { origin });
      return res.status(500).json({ error: 'پیکربندی سرور ناقص است (JWT_SECRET)' });
    }

    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];
    const passwordMatches = user ? bcrypt.compareSync(password, user.password_hash) : false;

    if (!user || !passwordMatches) {
      console.warn(`[auth/login:${reqId}] rejected: bad credentials`, {
        origin,
        usernameProvided: username,
        userFound: Boolean(user),
      });
      return res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }

    const token = jwt.sign({ sub: user.id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: '12h',
    });

    console.log(`[auth/login:${reqId}] success`, { origin, username: user.username });
    return res.json({ token, username: user.username });
  } catch (err) {
    console.error(`[auth/login:${reqId}] unexpected error`, { origin, error: err.message });
    return res.status(500).json({ error: 'خطای داخلی سرور هنگام ورود', requestId: reqId });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.user.username });
});

module.exports = router;

require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

async function main() {
  const username = (process.env.ADMIN_USERNAME || 'admin').trim();
  const password = (process.env.ADMIN_PASSWORD || 'change-this-password').trim();

  const { rows } = await db.query('SELECT id FROM users WHERE username = $1', [username]);
  const existing = rows[0];
  const hash = bcrypt.hashSync(password, 10);

  if (existing) {
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, existing.id]);
    console.log(`Updated password for existing staff user "${username}".`);
  } else {
    await db.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, hash]);
    console.log(`Created staff user "${username}".`);
  }

  await db.pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

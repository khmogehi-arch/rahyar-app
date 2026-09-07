const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// SQLite on Vercel's serverless runtime lived in /tmp, which is wiped on
// every cold start and isn't shared across concurrent function instances —
// that made building/floor/scale data disappear unpredictably between
// requests. A real Postgres database (e.g. Neon, reachable over the
// network from any instance) is what makes writes actually durable. See
// README for how to connect one via the Vercel Storage tab.
const connectionString = process.env.DATABASE_URL;

const isLocalConnection = connectionString && /localhost|127\.0\.0\.1/.test(connectionString);

const pool = connectionString
  ? new Pool({
      connectionString,
      // Neon (and most managed Postgres) require TLS but present a cert
      // chain `rejectUnauthorized` won't validate in Node by default.
      ssl: isLocalConnection ? false : { rejectUnauthorized: false },
    })
  : null;

const schemaReady = (async () => {
  if (!pool) {
    throw new Error(
      'DATABASE_URL تنظیم نشده است — یک دیتابیس Postgres (مثلاً Neon از تب Storage در Vercel) وصل کنید.'
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS buildings (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS floors (
      id SERIAL PRIMARY KEY,
      building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      floor_order INTEGER NOT NULL DEFAULT 0,
      floor_plan_image_url TEXT,
      scale_meters_per_pixel DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id SERIAL PRIMARY KEY,
      floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('entrance','poi','junction','elevator')),
      label TEXT,
      x DOUBLE PRECISION NOT NULL,
      y DOUBLE PRECISION NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS edges (
      id SERIAL PRIMARY KEY,
      from_node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      to_node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      distance_meters DOUBLE PRECISION NOT NULL,
      instruction TEXT,
      direction TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS qrcodes (
      id SERIAL PRIMARY KEY,
      node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS beacons (
      id SERIAL PRIMARY KEY,
      node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      uuid TEXT NOT NULL,
      major INTEGER NOT NULL,
      minor INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS destinations (
      id SERIAL PRIMARY KEY,
      node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL,
      category TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_floors_building ON floors(building_id);
    CREATE INDEX IF NOT EXISTS idx_nodes_floor ON nodes(floor_id);
    CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_node_id);
    CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_node_id);
    CREATE INDEX IF NOT EXISTS idx_destinations_floor ON destinations(floor_id);
  `);

  // Same auto-seed behavior as before: a fresh (or freshly-migrated)
  // database with no users gets the staff account from env vars so the
  // admin panel is always loggable-in without a manual `npm run seed`.
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM users');
    if (rows[0].count === 0) {
      const username = process.env.ADMIN_USERNAME.trim();
      const password = process.env.ADMIN_PASSWORD.trim();
      const hash = bcrypt.hashSync(password, 10);
      await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, hash]);
    }
  }
})();

// Attach a handler now so a failed init (e.g. missing DATABASE_URL) doesn't
// surface as an unhandled rejection — every query() call below still awaits
// and re-throws it, so callers see the real error.
schemaReady.catch((err) => {
  console.error('[db] schema init failed', err.message);
});

async function query(text, params) {
  await schemaReady;
  return pool.query(text, params);
}

module.exports = { query, pool, schemaReady };

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// SQLite on Vercel's serverless runtime lived in /tmp, which is wiped on
// every cold start and isn't shared across concurrent function instances —
// that made building/floor/scale data disappear unpredictably between
// requests. A real Postgres database (e.g. Neon, reachable over the
// network from any instance) is what makes writes actually durable. See
// README for how to connect one via the Vercel Storage tab.
// Vercel's Neon integration auto-populates several Postgres env vars
// (DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL, DATABASE_URL_UNPOOLED,
// ...) and which of them actually holds the pooled (PgBouncer, host contains
// "-pooler") connection string can vary. Rather than assume DATABASE_URL is
// the pooled one, prefer whichever candidate actually is — a direct
// connection here is what makes cold starts race Neon's compute wake-up and
// hit "Authentication timed out".
const POOLED_CANDIDATE_ENV_VARS = ['DATABASE_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL'];
const isPooledConnectionString = (value) => Boolean(value) && /-pooler\./.test(value);
const pooledEnvVar = POOLED_CANDIDATE_ENV_VARS.find((name) => isPooledConnectionString(process.env[name]));
const usedEnvVar = pooledEnvVar || (process.env.DATABASE_URL ? 'DATABASE_URL' : null);
const connectionString = usedEnvVar ? process.env[usedEnvVar] : undefined;

const isLocalConnection = connectionString && /localhost|127\.0\.0\.1/.test(connectionString);

// Neon suspends idle computes; waking one on a cold start can take a few
// seconds, and pg's own default (0 = wait forever) would otherwise let a
// genuinely dead connection hang until Vercel's own function timeout kills
// it with a much less useful error. 15s gives cold starts room to wake up
// without doing that.
const pool = connectionString
  ? new Pool({
      connectionString,
      // Neon (and most managed Postgres) require TLS but present a cert
      // chain `rejectUnauthorized` won't validate in Node by default.
      ssl: isLocalConnection ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    })
  : null;

if (connectionString && !isLocalConnection && !isPooledConnectionString(connectionString)) {
  // None of the pooled candidates matched, so we fell back to DATABASE_URL
  // as-is even though it doesn't look pooled either.
  console.warn(
    `[db] ${usedEnvVar} does not look like a Neon pooled connection (expected "-pooler" in the host). ` +
      'On Vercel serverless, use the pooled connection string (or set POSTGRES_PRISMA_URL/POSTGRES_URL to it) ' +
      'to avoid cold-start connection timeouts.'
  );
}

async function withRetries(fn, { attempts = 3, baseDelayMs = 1000 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === attempts) throw err;
      console.error(`[db] connection attempt ${attempt}/${attempts} failed: ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }
  }
}

async function initSchema() {
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
}

const schemaReady = (async () => {
  if (!pool) {
    throw new Error(
      'DATABASE_URL تنظیم نشده است — یک دیتابیس Postgres (مثلاً Neon از تب Storage در Vercel) وصل کنید.'
    );
  }

  // Cold starts race Neon waking a suspended compute against its own
  // authentication timeout — the first attempt can lose that race even
  // though the connection is perfectly healthy once the compute is up, so a
  // couple of retries clears most of these without any user-visible impact.
  await withRetries(initSchema, { attempts: 3, baseDelayMs: 1000 });
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

module.exports = { query, pool, schemaReady, connectionInfo: { usedEnvVar, isPooled: isPooledConnectionString(connectionString) } };

const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');
const { dbPath } = require('./paths');

// better-sqlite3 is a native addon: its compiled binary has to match the
// exact OS/arch/libc of whatever runs it, which serverless platforms don't
// guarantee at build time, and a mismatch crashes the whole Node process
// (not a catchable JS error) instead of throwing. node:sqlite ships inside
// Node itself, so there's no separate binary that can go out of sync with
// the runtime.
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS buildings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS floors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    building_id INTEGER NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    floor_order INTEGER NOT NULL DEFAULT 0,
    floor_plan_image_url TEXT,
    scale_meters_per_pixel REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('entrance','poi','junction','elevator')),
    label TEXT,
    x REAL NOT NULL,
    y REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    to_node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    distance_meters REAL NOT NULL,
    instruction TEXT,
    direction TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS qrcodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS beacons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    uuid TEXT NOT NULL,
    major INTEGER NOT NULL,
    minor INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS destinations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    category TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_floors_building ON floors(building_id);
  CREATE INDEX IF NOT EXISTS idx_nodes_floor ON nodes(floor_id);
  CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_node_id);
  CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_node_id);
  CREATE INDEX IF NOT EXISTS idx_destinations_floor ON destinations(floor_id);
`);

// On a serverless deployment (e.g. Vercel) the SQLite file lives on ephemeral
// storage and is wiped on every cold start, so `npm run seed` can't be run
// once against the deployed instance. Instead, seed the staff user from env
// vars automatically whenever the users table is empty — this keeps a fresh
// cold start always loggable-in with whatever ADMIN_USERNAME/ADMIN_PASSWORD
// were configured on the hosting platform. Local dev can still use `npm run
// seed` explicitly, or just rely on this same auto-seed.
if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
  const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  if (userCount === 0) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(
      process.env.ADMIN_USERNAME,
      hash
    );
  }
}

module.exports = db;

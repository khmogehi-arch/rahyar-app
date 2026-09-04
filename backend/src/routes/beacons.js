const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// Optional MVP feature: registering a beacon's identifiers against an elevator
// node. This is data entry only — no live BLE scanning or positioning is
// implemented anywhere in this project (out of scope, see spec section 7).
const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT bc.*, n.label AS node_label, n.floor_id
       FROM beacons bc JOIN nodes n ON n.id = bc.node_id
       ORDER BY bc.id`
    )
    .all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { nodeId, uuid, major, minor } = req.body || {};
  if (!nodeId || !uuid || major == null || minor == null) {
    return res.status(400).json({ error: 'nodeId، uuid، major و minor الزامی است' });
  }
  const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(nodeId);
  if (!node) return res.status(404).json({ error: 'نقطه یافت نشد' });
  if (node.type !== 'elevator') {
    return res.status(400).json({ error: 'بیکن فقط به نقطه از نوع آسانسور متصل می‌شود' });
  }
  const result = db
    .prepare('INSERT INTO beacons (node_id, uuid, major, minor) VALUES (?, ?, ?, ?)')
    .run(nodeId, uuid, major, minor);
  res.status(201).json(db.prepare('SELECT * FROM beacons WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const beacon = db.prepare('SELECT * FROM beacons WHERE id = ?').get(req.params.id);
  if (!beacon) return res.status(404).json({ error: 'بیکن یافت نشد' });
  const { uuid, major, minor } = req.body || {};
  db.prepare('UPDATE beacons SET uuid = ?, major = ?, minor = ? WHERE id = ?').run(
    uuid ?? beacon.uuid,
    major ?? beacon.major,
    minor ?? beacon.minor,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM beacons WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM beacons WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'بیکن یافت نشد' });
  res.status(204).end();
});

module.exports = router;

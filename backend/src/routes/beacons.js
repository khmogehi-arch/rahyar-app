const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// Optional MVP feature: registering a beacon's identifiers against an elevator
// node. This is data entry only — no live BLE scanning or positioning is
// implemented anywhere in this project (out of scope, see spec section 7).
const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT bc.*, n.label AS node_label, n.floor_id
     FROM beacons bc JOIN nodes n ON n.id = bc.node_id
     ORDER BY bc.id`
  );
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { nodeId, uuid, major, minor } = req.body || {};
  if (!nodeId || !uuid || major == null || minor == null) {
    return res.status(400).json({ error: 'nodeId، uuid، major و minor الزامی است' });
  }
  const { rows: nodeRows } = await db.query('SELECT * FROM nodes WHERE id = $1', [nodeId]);
  const node = nodeRows[0];
  if (!node) return res.status(404).json({ error: 'نقطه یافت نشد' });
  if (node.type !== 'elevator') {
    return res.status(400).json({ error: 'بیکن فقط به نقطه از نوع آسانسور متصل می‌شود' });
  }
  const { rows } = await db.query(
    'INSERT INTO beacons (node_id, uuid, major, minor) VALUES ($1, $2, $3, $4) RETURNING *',
    [nodeId, uuid, major, minor]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { rows: existingRows } = await db.query('SELECT * FROM beacons WHERE id = $1', [req.params.id]);
  const beacon = existingRows[0];
  if (!beacon) return res.status(404).json({ error: 'بیکن یافت نشد' });
  const { uuid, major, minor } = req.body || {};
  const { rows } = await db.query(
    'UPDATE beacons SET uuid = $1, major = $2, minor = $3 WHERE id = $4 RETURNING *',
    [uuid ?? beacon.uuid, major ?? beacon.major, minor ?? beacon.minor, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM beacons WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'بیکن یافت نشد' });
  res.status(204).end();
});

module.exports = router;

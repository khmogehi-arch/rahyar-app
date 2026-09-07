const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Admin: full CRUD
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT d.*, n.label AS node_label
     FROM destinations d JOIN nodes n ON n.id = d.node_id
     ORDER BY d.id`
  );
  res.json(rows);
});

router.post('/', requireAuth, async (req, res) => {
  const { nodeId, floorId, displayName, category } = req.body || {};
  if (!nodeId || !floorId || !displayName) {
    return res.status(400).json({ error: 'nodeId، floorId و نام نمایشی الزامی است' });
  }
  const { rows } = await db.query(
    'INSERT INTO destinations (node_id, floor_id, display_name, category) VALUES ($1, $2, $3, $4) RETURNING *',
    [nodeId, floorId, displayName, category || null]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', requireAuth, async (req, res) => {
  const { rows: existingRows } = await db.query('SELECT * FROM destinations WHERE id = $1', [
    req.params.id,
  ]);
  const dest = existingRows[0];
  if (!dest) return res.status(404).json({ error: 'مقصد یافت نشد' });
  const { displayName, category } = req.body || {};
  const { rows } = await db.query(
    'UPDATE destinations SET display_name = $1, category = $2 WHERE id = $3 RETURNING *',
    [displayName ?? dest.display_name, category ?? dest.category, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM destinations WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'مقصد یافت نشد' });
  res.status(204).end();
});

// Public: destinations for a building, for the visitor app's destination picker
router.get('/public', async (req, res) => {
  const { buildingId } = req.query;
  if (!buildingId) return res.status(400).json({ error: 'buildingId الزامی است' });

  const { rows } = await db.query(
    `SELECT d.id, d.display_name, d.category, d.node_id, d.floor_id
     FROM destinations d
     JOIN floors f ON f.id = d.floor_id
     WHERE f.building_id = $1
     ORDER BY d.category, d.display_name`,
    [buildingId]
  );

  res.json(rows);
});

module.exports = router;

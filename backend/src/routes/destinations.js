const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Admin: full CRUD
router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT d.*, n.label AS node_label
       FROM destinations d JOIN nodes n ON n.id = d.node_id
       ORDER BY d.id`
    )
    .all();
  res.json(rows);
});

router.post('/', requireAuth, (req, res) => {
  const { nodeId, floorId, displayName, category } = req.body || {};
  if (!nodeId || !floorId || !displayName) {
    return res.status(400).json({ error: 'nodeId، floorId و نام نمایشی الزامی است' });
  }
  const result = db
    .prepare(
      'INSERT INTO destinations (node_id, floor_id, display_name, category) VALUES (?, ?, ?, ?)'
    )
    .run(nodeId, floorId, displayName, category || null);
  res.status(201).json(db.prepare('SELECT * FROM destinations WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', requireAuth, (req, res) => {
  const dest = db.prepare('SELECT * FROM destinations WHERE id = ?').get(req.params.id);
  if (!dest) return res.status(404).json({ error: 'مقصد یافت نشد' });
  const { displayName, category } = req.body || {};
  db.prepare('UPDATE destinations SET display_name = ?, category = ? WHERE id = ?').run(
    displayName ?? dest.display_name,
    category ?? dest.category,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM destinations WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM destinations WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'مقصد یافت نشد' });
  res.status(204).end();
});

// Public: destinations for a building, for the visitor app's destination picker
router.get('/public', (req, res) => {
  const { buildingId } = req.query;
  if (!buildingId) return res.status(400).json({ error: 'buildingId الزامی است' });

  const rows = db
    .prepare(
      `SELECT d.id, d.display_name, d.category, d.node_id, d.floor_id
       FROM destinations d
       JOIN floors f ON f.id = d.floor_id
       WHERE f.building_id = ?
       ORDER BY d.category, d.display_name`
    )
    .all(buildingId);

  res.json(rows);
});

module.exports = router;

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const VALID_TYPES = ['entrance', 'poi', 'junction', 'elevator'];

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { floorId } = req.query;
  if (!floorId) return res.status(400).json({ error: 'floorId الزامی است' });
  const { rows } = await db.query('SELECT * FROM nodes WHERE floor_id = $1 ORDER BY id', [floorId]);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { floorId, type, label, x, y } = req.body || {};
  if (!floorId || !VALID_TYPES.includes(type) || x == null || y == null) {
    return res.status(400).json({ error: 'floorId، نوع معتبر و مختصات x/y الزامی است' });
  }
  const { rows } = await db.query(
    'INSERT INTO nodes (floor_id, type, label, x, y) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [floorId, type, label || null, x, y]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { rows: existingRows } = await db.query('SELECT * FROM nodes WHERE id = $1', [req.params.id]);
  const node = existingRows[0];
  if (!node) return res.status(404).json({ error: 'نقطه یافت نشد' });
  const { type, label, x, y } = req.body || {};
  if (type && !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'نوع نامعتبر است' });
  }
  const { rows } = await db.query(
    'UPDATE nodes SET type = $1, label = $2, x = $3, y = $4 WHERE id = $5 RETURNING *',
    [type ?? node.type, label ?? node.label, x ?? node.x, y ?? node.y, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM nodes WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'نقطه یافت نشد' });
  res.status(204).end();
});

module.exports = router;

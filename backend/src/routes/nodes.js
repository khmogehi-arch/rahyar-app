const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const VALID_TYPES = ['entrance', 'poi', 'junction', 'elevator'];

router.use(requireAuth);

router.get('/', (req, res) => {
  const { floorId } = req.query;
  if (!floorId) return res.status(400).json({ error: 'floorId الزامی است' });
  const nodes = db.prepare('SELECT * FROM nodes WHERE floor_id = ? ORDER BY id').all(floorId);
  res.json(nodes);
});

router.post('/', (req, res) => {
  const { floorId, type, label, x, y } = req.body || {};
  if (!floorId || !VALID_TYPES.includes(type) || x == null || y == null) {
    return res.status(400).json({ error: 'floorId، نوع معتبر و مختصات x/y الزامی است' });
  }
  const result = db
    .prepare('INSERT INTO nodes (floor_id, type, label, x, y) VALUES (?, ?, ?, ?, ?)')
    .run(floorId, type, label || null, x, y);
  const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(node);
});

router.put('/:id', (req, res) => {
  const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(req.params.id);
  if (!node) return res.status(404).json({ error: 'نقطه یافت نشد' });
  const { type, label, x, y } = req.body || {};
  if (type && !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'نوع نامعتبر است' });
  }
  db.prepare('UPDATE nodes SET type = ?, label = ?, x = ?, y = ? WHERE id = ?').run(
    type ?? node.type,
    label ?? node.label,
    x ?? node.x,
    y ?? node.y,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM nodes WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM nodes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'نقطه یافت نشد' });
  res.status(204).end();
});

module.exports = router;

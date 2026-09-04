const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  const buildings = db.prepare('SELECT * FROM buildings ORDER BY id').all();
  res.json(buildings);
});

router.get('/:id', (req, res) => {
  const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(req.params.id);
  if (!building) return res.status(404).json({ error: 'ساختمان یافت نشد' });
  const floors = db
    .prepare('SELECT * FROM floors WHERE building_id = ? ORDER BY floor_order')
    .all(building.id);
  res.json({ ...building, floors });
});

router.post('/', (req, res) => {
  const { name, address } = req.body || {};
  if (!name) return res.status(400).json({ error: 'نام ساختمان الزامی است' });
  const result = db
    .prepare('INSERT INTO buildings (name, address) VALUES (?, ?)')
    .run(name, address || null);
  const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(building);
});

router.put('/:id', (req, res) => {
  const { name, address } = req.body || {};
  const building = db.prepare('SELECT * FROM buildings WHERE id = ?').get(req.params.id);
  if (!building) return res.status(404).json({ error: 'ساختمان یافت نشد' });
  db.prepare('UPDATE buildings SET name = ?, address = ? WHERE id = ?').run(
    name ?? building.name,
    address ?? building.address,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM buildings WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM buildings WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'ساختمان یافت نشد' });
  res.status(204).end();
});

module.exports = router;

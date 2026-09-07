const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM buildings ORDER BY id');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows: buildingRows } = await db.query('SELECT * FROM buildings WHERE id = $1', [req.params.id]);
  const building = buildingRows[0];
  if (!building) return res.status(404).json({ error: 'ساختمان یافت نشد' });
  const { rows: floors } = await db.query(
    'SELECT * FROM floors WHERE building_id = $1 ORDER BY floor_order',
    [building.id]
  );
  res.json({ ...building, floors });
});

router.post('/', async (req, res) => {
  const { name, address } = req.body || {};
  if (!name) return res.status(400).json({ error: 'نام ساختمان الزامی است' });
  const { rows } = await db.query(
    'INSERT INTO buildings (name, address) VALUES ($1, $2) RETURNING *',
    [name, address || null]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { rows: existingRows } = await db.query('SELECT * FROM buildings WHERE id = $1', [req.params.id]);
  const building = existingRows[0];
  if (!building) return res.status(404).json({ error: 'ساختمان یافت نشد' });
  const { name, address } = req.body || {};
  const { rows } = await db.query(
    'UPDATE buildings SET name = $1, address = $2 WHERE id = $3 RETURNING *',
    [name ?? building.name, address ?? building.address, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM buildings WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'ساختمان یافت نشد' });
  res.status(204).end();
});

module.exports = router;

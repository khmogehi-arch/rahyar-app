const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const { floorId } = req.query;
  if (floorId) {
    const { rows } = await db.query(
      `SELECT e.* FROM edges e
       JOIN nodes n ON n.id = e.from_node_id
       WHERE n.floor_id = $1
       ORDER BY e.id`,
      [floorId]
    );
    return res.json(rows);
  }
  const { rows } = await db.query('SELECT * FROM edges ORDER BY id');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { fromNodeId, toNodeId, distanceMeters, instruction, direction } = req.body || {};
  if (!fromNodeId || !toNodeId || distanceMeters == null || distanceMeters <= 0) {
    return res.status(400).json({ error: 'گره مبدا، گره مقصد و فاصله (متر) الزامی است' });
  }
  if (fromNodeId === toNodeId) {
    return res.status(400).json({ error: 'گره مبدا و مقصد نمی‌توانند یکسان باشند' });
  }
  const { rows } = await db.query(
    `INSERT INTO edges (from_node_id, to_node_id, distance_meters, instruction, direction)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [fromNodeId, toNodeId, distanceMeters, instruction || null, direction || null]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { rows: existingRows } = await db.query('SELECT * FROM edges WHERE id = $1', [req.params.id]);
  const edge = existingRows[0];
  if (!edge) return res.status(404).json({ error: 'یال یافت نشد' });
  const { distanceMeters, instruction, direction } = req.body || {};
  const { rows } = await db.query(
    'UPDATE edges SET distance_meters = $1, instruction = $2, direction = $3 WHERE id = $4 RETURNING *',
    [
      distanceMeters ?? edge.distance_meters,
      instruction ?? edge.instruction,
      direction ?? edge.direction,
      req.params.id,
    ]
  );
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM edges WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'یال یافت نشد' });
  res.status(204).end();
});

module.exports = router;

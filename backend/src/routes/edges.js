const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  const { floorId } = req.query;
  if (floorId) {
    const edges = db
      .prepare(
        `SELECT e.* FROM edges e
         JOIN nodes n ON n.id = e.from_node_id
         WHERE n.floor_id = ?
         ORDER BY e.id`
      )
      .all(floorId);
    return res.json(edges);
  }
  res.json(db.prepare('SELECT * FROM edges ORDER BY id').all());
});

router.post('/', (req, res) => {
  const { fromNodeId, toNodeId, distanceMeters, instruction, direction } = req.body || {};
  if (!fromNodeId || !toNodeId || distanceMeters == null || distanceMeters <= 0) {
    return res.status(400).json({ error: 'گره مبدا، گره مقصد و فاصله (متر) الزامی است' });
  }
  if (fromNodeId === toNodeId) {
    return res.status(400).json({ error: 'گره مبدا و مقصد نمی‌توانند یکسان باشند' });
  }
  const result = db
    .prepare(
      `INSERT INTO edges (from_node_id, to_node_id, distance_meters, instruction, direction)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(fromNodeId, toNodeId, distanceMeters, instruction || null, direction || null);
  const edge = db.prepare('SELECT * FROM edges WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(edge);
});

router.put('/:id', (req, res) => {
  const edge = db.prepare('SELECT * FROM edges WHERE id = ?').get(req.params.id);
  if (!edge) return res.status(404).json({ error: 'یال یافت نشد' });
  const { distanceMeters, instruction, direction } = req.body || {};
  db.prepare('UPDATE edges SET distance_meters = ?, instruction = ?, direction = ? WHERE id = ?').run(
    distanceMeters ?? edge.distance_meters,
    instruction ?? edge.instruction,
    direction ?? edge.direction,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM edges WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM edges WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'یال یافت نشد' });
  res.status(204).end();
});

module.exports = router;

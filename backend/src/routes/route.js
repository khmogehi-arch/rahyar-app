const express = require('express');
const db = require('../db');
const { shortestPath } = require('../utils/dijkstra');

// Public: computes the step-by-step route ONCE, at the moment a destination
// is chosen. There is no live tracking or re-scanning — see spec section 5.
const router = express.Router();

router.get('/', async (req, res) => {
  const fromNodeId = Number(req.query.from);
  const toNodeId = Number(req.query.to);

  if (!fromNodeId || !toNodeId) {
    return res.status(400).json({ error: 'from و to الزامی است' });
  }

  const [{ rows: fromRows }, { rows: toRows }] = await Promise.all([
    db.query('SELECT * FROM nodes WHERE id = $1', [fromNodeId]),
    db.query('SELECT * FROM nodes WHERE id = $1', [toNodeId]),
  ]);
  const fromNode = fromRows[0];
  const toNode = toRows[0];
  if (!fromNode || !toNode) {
    return res.status(404).json({ error: 'نقطه مبدا یا مقصد یافت نشد' });
  }

  const { rows: edges } = await db.query(
    `SELECT e.* FROM edges e
     JOIN nodes n ON n.id = e.from_node_id
     JOIN floors f1 ON f1.id = n.floor_id
     JOIN floors f2 ON f2.id = (SELECT floor_id FROM nodes WHERE id = e.to_node_id)
     WHERE f1.building_id = (SELECT building_id FROM floors WHERE id = $1)`,
    [fromNode.floor_id]
  );

  const result = shortestPath(edges, fromNodeId, toNodeId);
  if (!result) {
    return res.status(404).json({ error: 'مسیری بین این دو نقطه یافت نشد' });
  }

  const steps = await Promise.all(
    result.edges.map(async (edge) => {
      const { rows } = await db.query('SELECT * FROM nodes WHERE id = $1', [edge.to_node_id]);
      const toN = rows[0];
      return {
        distanceMeters: edge.distance_meters,
        instruction: edge.instruction,
        direction: edge.direction,
        floorId: toN.floor_id,
        arrivalNodeId: toN.id,
        arrivalNodeLabel: toN.label,
      };
    })
  );

  res.json({
    totalDistanceMeters: result.totalDistanceMeters,
    steps,
  });
});

module.exports = router;

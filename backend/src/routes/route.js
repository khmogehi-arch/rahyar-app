const express = require('express');
const db = require('../db');
const { shortestPath } = require('../utils/dijkstra');

// Public: computes the step-by-step route ONCE, at the moment a destination
// is chosen. There is no live tracking or re-scanning — see spec section 5.
const router = express.Router();

router.get('/', (req, res) => {
  const fromNodeId = Number(req.query.from);
  const toNodeId = Number(req.query.to);

  if (!fromNodeId || !toNodeId) {
    return res.status(400).json({ error: 'from و to الزامی است' });
  }

  const fromNode = db.prepare('SELECT * FROM nodes WHERE id = ?').get(fromNodeId);
  const toNode = db.prepare('SELECT * FROM nodes WHERE id = ?').get(toNodeId);
  if (!fromNode || !toNode) {
    return res.status(404).json({ error: 'نقطه مبدا یا مقصد یافت نشد' });
  }

  const edges = db
    .prepare(
      `SELECT e.* FROM edges e
       JOIN nodes n ON n.id = e.from_node_id
       JOIN floors f1 ON f1.id = n.floor_id
       JOIN floors f2 ON f2.id = (SELECT floor_id FROM nodes WHERE id = e.to_node_id)
       WHERE f1.building_id = (SELECT building_id FROM floors WHERE id = ?)`
    )
    .all(fromNode.floor_id);

  const result = shortestPath(edges, fromNodeId, toNodeId);
  if (!result) {
    return res.status(404).json({ error: 'مسیری بین این دو نقطه یافت نشد' });
  }

  const steps = result.edges.map((edge) => {
    const toN = db.prepare('SELECT * FROM nodes WHERE id = ?').get(edge.to_node_id);
    return {
      distanceMeters: edge.distance_meters,
      instruction: edge.instruction,
      direction: edge.direction,
      floorId: toN.floor_id,
      arrivalNodeId: toN.id,
      arrivalNodeLabel: toN.label,
    };
  });

  res.json({
    totalDistanceMeters: result.totalDistanceMeters,
    steps,
  });
});

module.exports = router;

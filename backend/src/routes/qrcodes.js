const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Admin: list all QR codes with their entrance node info
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT q.*, n.label AS node_label, n.floor_id AS floor_id, n.type AS node_type
     FROM qrcodes q JOIN nodes n ON n.id = q.node_id
     ORDER BY q.id`
  );
  res.json(rows);
});

// Admin: generate (or return existing) QR token for an entrance node
router.post('/', requireAuth, async (req, res) => {
  const { nodeId } = req.body || {};
  if (!nodeId) return res.status(400).json({ error: 'nodeId الزامی است' });

  const { rows: nodeRows } = await db.query('SELECT * FROM nodes WHERE id = $1', [nodeId]);
  const node = nodeRows[0];
  if (!node) return res.status(404).json({ error: 'نقطه یافت نشد' });
  if (node.type !== 'entrance') {
    return res.status(400).json({ error: 'QR فقط برای نقاط از نوع ورودی ساخته می‌شود' });
  }

  const { rows: existingRows } = await db.query('SELECT * FROM qrcodes WHERE node_id = $1', [nodeId]);
  if (existingRows[0]) return res.status(200).json(existingRows[0]);

  const token = nanoid(12);
  const { rows } = await db.query('INSERT INTO qrcodes (node_id, token) VALUES ($1, $2) RETURNING *', [
    nodeId,
    token,
  ]);
  res.status(201).json(rows[0]);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM qrcodes WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'QR یافت نشد' });
  res.status(204).end();
});

// Public: resolve a scanned token to entrance node + building info (visitor app entry point)
router.get('/resolve/:token', async (req, res) => {
  const { rows } = await db.query(
    `SELECT q.token, n.id AS node_id, n.floor_id, f.building_id, f.name AS floor_name,
            b.name AS building_name
     FROM qrcodes q
     JOIN nodes n ON n.id = q.node_id
     JOIN floors f ON f.id = n.floor_id
     JOIN buildings b ON b.id = f.building_id
     WHERE q.token = $1`,
    [req.params.token]
  );

  if (!rows[0]) return res.status(404).json({ error: 'کد QR نامعتبر است' });
  res.json(rows[0]);
});

module.exports = router;

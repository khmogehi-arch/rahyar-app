const express = require('express');
const { nanoid } = require('nanoid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Admin: list all QR codes with their entrance node info
router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT q.*, n.label AS node_label, n.floor_id AS floor_id, n.type AS node_type
       FROM qrcodes q JOIN nodes n ON n.id = q.node_id
       ORDER BY q.id`
    )
    .all();
  res.json(rows);
});

// Admin: generate (or return existing) QR token for an entrance node
router.post('/', requireAuth, (req, res) => {
  const { nodeId } = req.body || {};
  if (!nodeId) return res.status(400).json({ error: 'nodeId الزامی است' });

  const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(nodeId);
  if (!node) return res.status(404).json({ error: 'نقطه یافت نشد' });
  if (node.type !== 'entrance') {
    return res.status(400).json({ error: 'QR فقط برای نقاط از نوع ورودی ساخته می‌شود' });
  }

  const existing = db.prepare('SELECT * FROM qrcodes WHERE node_id = ?').get(nodeId);
  if (existing) return res.status(200).json(existing);

  const token = nanoid(12);
  const result = db
    .prepare('INSERT INTO qrcodes (node_id, token) VALUES (?, ?)')
    .run(nodeId, token);
  const qr = db.prepare('SELECT * FROM qrcodes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(qr);
});

router.delete('/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM qrcodes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'QR یافت نشد' });
  res.status(204).end();
});

// Public: resolve a scanned token to entrance node + building info (visitor app entry point)
router.get('/resolve/:token', (req, res) => {
  const row = db
    .prepare(
      `SELECT q.token, n.id AS node_id, n.floor_id, f.building_id, f.name AS floor_name,
              b.name AS building_name
       FROM qrcodes q
       JOIN nodes n ON n.id = q.node_id
       JOIN floors f ON f.id = n.floor_id
       JOIN buildings b ON b.id = f.building_id
       WHERE q.token = ?`
    )
    .get(req.params.token);

  if (!row) return res.status(404).json({ error: 'کد QR نامعتبر است' });
  res.json(row);
});

module.exports = router;

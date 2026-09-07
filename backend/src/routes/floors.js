const express = require('express');
const multer = require('multer');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { saveFloorPlanImage } = require('../storage');

const router = express.Router();

// Buffered in memory rather than written to disk directly, since the image
// then needs to go to Vercel Blob (or the local-dev disk fallback) — see
// storage.js.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    cb(new Error('فقط فایل تصویر مجاز است'));
  },
});

router.use(requireAuth);

router.post('/', async (req, res) => {
  const { buildingId, name, order } = req.body || {};
  if (!buildingId || !name) {
    return res.status(400).json({ error: 'ساختمان و نام طبقه الزامی است' });
  }
  const { rows } = await db.query(
    'INSERT INTO floors (building_id, name, floor_order) VALUES ($1, $2, $3) RETURNING *',
    [buildingId, name, order ?? 0]
  );
  res.status(201).json(rows[0]);
});

router.get('/:id', async (req, res) => {
  const { rows: floorRows } = await db.query('SELECT * FROM floors WHERE id = $1', [req.params.id]);
  const floor = floorRows[0];
  if (!floor) return res.status(404).json({ error: 'طبقه یافت نشد' });
  const { rows: nodes } = await db.query('SELECT * FROM nodes WHERE floor_id = $1', [floor.id]);
  res.json({ ...floor, nodes });
});

router.put('/:id', async (req, res) => {
  const { rows: floorRows } = await db.query('SELECT * FROM floors WHERE id = $1', [req.params.id]);
  const floor = floorRows[0];
  if (!floor) return res.status(404).json({ error: 'طبقه یافت نشد' });
  const { name, order } = req.body || {};
  const { rows } = await db.query(
    'UPDATE floors SET name = $1, floor_order = $2 WHERE id = $3 RETURNING *',
    [name ?? floor.name, order ?? floor.floor_order, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await db.query('DELETE FROM floors WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'طبقه یافت نشد' });
  res.status(204).end();
});

// Upload / replace the floor plan image
router.post('/:id/plan-image', upload.single('image'), async (req, res) => {
  const { rows: floorRows } = await db.query('SELECT * FROM floors WHERE id = $1', [req.params.id]);
  const floor = floorRows[0];
  if (!floor) return res.status(404).json({ error: 'طبقه یافت نشد' });
  if (!req.file) return res.status(400).json({ error: 'فایل تصویر ارسال نشده است' });

  const url = await saveFloorPlanImage(req.file);
  const { rows } = await db.query(
    'UPDATE floors SET floor_plan_image_url = $1 WHERE id = $2 RETURNING *',
    [url, req.params.id]
  );
  res.json(rows[0]);
});

// Set scale: click two points a known real-world distance apart on the plan.
router.post('/:id/scale', async (req, res) => {
  const { rows: floorRows } = await db.query('SELECT * FROM floors WHERE id = $1', [req.params.id]);
  const floor = floorRows[0];
  if (!floor) return res.status(404).json({ error: 'طبقه یافت نشد' });

  const { point1, point2, realDistanceMeters } = req.body || {};
  if (!point1 || !point2 || !realDistanceMeters || realDistanceMeters <= 0) {
    return res.status(400).json({ error: 'دو نقطه و فاصله واقعی (متر) الزامی است' });
  }

  const pixelDistance = Math.hypot(point2.x - point1.x, point2.y - point1.y);
  if (pixelDistance === 0) {
    return res.status(400).json({ error: 'دو نقطه نباید یکسان باشند' });
  }

  const scaleMetersPerPixel = realDistanceMeters / pixelDistance;
  const { rows } = await db.query(
    'UPDATE floors SET scale_meters_per_pixel = $1 WHERE id = $2 RETURNING *',
    [scaleMetersPerPixel, req.params.id]
  );

  res.json(rows[0]);
});

module.exports = router;

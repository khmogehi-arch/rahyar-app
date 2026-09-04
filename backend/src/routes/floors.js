const express = require('express');
const path = require('path');
const multer = require('multer');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `floorplan-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    cb(new Error('فقط فایل تصویر مجاز است'));
  },
});

router.use(requireAuth);

router.post('/', (req, res) => {
  const { buildingId, name, order } = req.body || {};
  if (!buildingId || !name) {
    return res.status(400).json({ error: 'ساختمان و نام طبقه الزامی است' });
  }
  const result = db
    .prepare('INSERT INTO floors (building_id, name, floor_order) VALUES (?, ?, ?)')
    .run(buildingId, name, order ?? 0);
  const floor = db.prepare('SELECT * FROM floors WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(floor);
});

router.get('/:id', (req, res) => {
  const floor = db.prepare('SELECT * FROM floors WHERE id = ?').get(req.params.id);
  if (!floor) return res.status(404).json({ error: 'طبقه یافت نشد' });
  const nodes = db.prepare('SELECT * FROM nodes WHERE floor_id = ?').all(floor.id);
  res.json({ ...floor, nodes });
});

router.put('/:id', (req, res) => {
  const floor = db.prepare('SELECT * FROM floors WHERE id = ?').get(req.params.id);
  if (!floor) return res.status(404).json({ error: 'طبقه یافت نشد' });
  const { name, order } = req.body || {};
  db.prepare('UPDATE floors SET name = ?, floor_order = ? WHERE id = ?').run(
    name ?? floor.name,
    order ?? floor.floor_order,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM floors WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM floors WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'طبقه یافت نشد' });
  res.status(204).end();
});

// Upload / replace the floor plan image
router.post('/:id/plan-image', upload.single('image'), (req, res) => {
  const floor = db.prepare('SELECT * FROM floors WHERE id = ?').get(req.params.id);
  if (!floor) return res.status(404).json({ error: 'طبقه یافت نشد' });
  if (!req.file) return res.status(400).json({ error: 'فایل تصویر ارسال نشده است' });

  const url = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE floors SET floor_plan_image_url = ? WHERE id = ?').run(url, req.params.id);
  res.json(db.prepare('SELECT * FROM floors WHERE id = ?').get(req.params.id));
});

// Set scale: click two points a known real-world distance apart on the plan.
router.post('/:id/scale', (req, res) => {
  const floor = db.prepare('SELECT * FROM floors WHERE id = ?').get(req.params.id);
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
  db.prepare('UPDATE floors SET scale_meters_per_pixel = ? WHERE id = ?').run(
    scaleMetersPerPixel,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM floors WHERE id = ?').get(req.params.id));
});

module.exports = router;

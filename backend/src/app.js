const express = require('express');
const cors = require('cors');
const fs = require('fs');

const { uploadsDir } = require('./paths');
const authRoutes = require('./routes/auth');
const buildingRoutes = require('./routes/buildings');
const floorRoutes = require('./routes/floors');
const nodeRoutes = require('./routes/nodes');
const edgeRoutes = require('./routes/edges');
const qrcodeRoutes = require('./routes/qrcodes');
const beaconRoutes = require('./routes/beacons');
const destinationRoutes = require('./routes/destinations');
const routeRoutes = require('./routes/route');
const debugRoutes = require('./routes/debug');

fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/floors', floorRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/edges', edgeRoutes);
app.use('/api/qrcodes', qrcodeRoutes);
app.use('/api/beacons', beaconRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/route', routeRoutes);
app.use('/api/debug', debugRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'یافت نشد' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'خطای داخلی سرور' });
});

module.exports = app;

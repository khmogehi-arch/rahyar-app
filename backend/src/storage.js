const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { uploadsDir } = require('./paths');

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

function randomFilename(originalname) {
  const ext = path.extname(originalname) || '.png';
  return `floorplan-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
}

// Persists an uploaded floor-plan image and returns a public URL for it.
// Vercel's filesystem is read-only outside /tmp, and /tmp doesn't survive
// between invocations/instances, so production must set
// BLOB_READ_WRITE_TOKEN (Vercel Blob — see README). Local dev without it
// falls back to writing into ./uploads, served statically by app.js.
async function saveFloorPlanImage(file) {
  const filename = randomFilename(file.originalname);

  if (useBlob) {
    const { put } = require('@vercel/blob');
    const blob = await put(filename, file.buffer, {
      access: 'public',
      contentType: file.mimetype,
    });
    return blob.url;
  }

  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, filename), file.buffer);
  return `/uploads/${filename}`;
}

module.exports = { saveFloorPlanImage };

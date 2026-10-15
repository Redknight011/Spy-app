
const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000');
  next();
});

cloudinary.config({
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_CLOUD_KEY || '').trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim()
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'redknight_spy', resource_type: 'auto' }
});
const upload = multer({ storage });

const SECRET = process.env.SECRET || 'redknight_secret_final';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Redknight123';

function checkAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'no token' });
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth.trim();
  if (!token) return res.status(401).json({ error: 'no token' });
  try {
    jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

let fileDB = [];

app.post(['/get-token', '/api/get-token'], (req, res) => {
  if (!req.body || req.body.password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'wrong password' });
  }
  const token = jwt.sign({ user: 'redknight' }, SECRET, { expiresIn: '30d' });
  res.json({ token });
});

app.post(['/upload', '/api/upload'], checkAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'no file uploaded' });
  }
  const data = {
    originalName: req.file.originalname,
    url: req.file.path,
    public_id: req.file.filename,
    date: new Date().toISOString()
  };
  fileDB.push(data);
  res.json({ message: 'Success', data });
});

app.get(['/files', '/api/files'], checkAuth, async (req, res) => {
  if (fileDB.length > 0) {
    return res.json(fileDB);
  }
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'redknight_spy/',
      max_results: 100
    });
    if (result && Array.isArray(result.resources) && result.resources.length > 0) {
      const resources = result.resources.map((item) => ({
        originalName: item.original_filename || item.public_id,
        url: item.secure_url,
        public_id: item.public_id,
        date: item.created_at
      }));
      return res.json(resources);
    }
  } catch {
    // Fallback to in-memory fileDB when Cloudinary listing is unavailable
  }
  return res.json(fileDB);
});

app.get(['/', '/api'], (req, res) => {
  res.json({ status: 'Redknight Cloud Ready - Fixed!' });
});

app.use((err, req, res, next) => {
  res.status(err.status || err.http_code || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

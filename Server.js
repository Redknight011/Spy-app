const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'redknight_spy', resource_type: 'auto' }
});
const upload = multer({ storage });

const SECRET = process.env.SECRET || "redknight_secret_final";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Redknight123";

function checkAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'no token - use Bearer <token>' });
  try { jwt.verify(auth.split(' ')[1], SECRET); next(); }
  catch { return res.status(401).json({ error: 'invalid token' }); }
}

let fileDB = [];

app.post('/api/get-token', (req, res) => {
  if (req.body.password!== ADMIN_PASSWORD) return res.status(401).json({ error: 'wrong password' });
  const token = jwt.sign({ user: 'redknight' }, SECRET, { expiresIn: '30d' });
  res.json({ token, note: "Use this token in header: Authorization: Bearer <token>" });
});

app.post('/api/upload', checkAuth, upload.single('file'), (req, res) => {
  const data = { originalName: req.file.originalname, url: req.file.path, public_id: req.file.filename, date: new Date().toISOString() };
  fileDB.push(data);
  res.json({ message: 'Permanent upload success', data });
});

app.get('/api/files', checkAuth, (req, res) => res.json(fileDB));
app.get('/', (req,res) => res.json({ status: "Redknight Cloud Ready", cloud: "sannsxn2" }));

module.exports = app;
if (require.main === module) app.listen(3000, ()=>console.log("3000"));

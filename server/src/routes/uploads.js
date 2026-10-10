// Evidence files (invoices, payment proof, site-visit photos) stored in MongoDB GridFS.
// Works on serverless hosts like Vercel, where the local disk is temporary.
const express = require('express');
const crypto = require('crypto');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { requireAuth, allow } = require('../middleware/auth');
const { STAFF_ROLES } = require('../config/constants');

const TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};
// Vercel limits request bodies to ~4.5 MB, so keep each file under 4 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 4 },
  fileFilter: (req, file, cb) => cb(null, !!TYPES[path.extname(file.originalname).toLowerCase()]),
});

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'evidence' });

function save(file, userId) {
  return new Promise((resolve, reject) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    const stream = bucket().openUploadStream(name, {
      metadata: { contentType: TYPES[ext], originalName: file.originalname.slice(0, 120), uploadedBy: userId },
    });
    stream.on('error', reject);
    stream.on('finish', () => resolve(`/api/files/${stream.id}`));
    stream.end(file.buffer);
  });
}

const uploadRouter = express.Router();
uploadRouter.post('/', requireAuth, allow(...STAFF_ROLES), upload.array('files', 4), async (req, res, next) => {
  try {
    if (!req.files?.length) return res.status(400).json({ message: 'Upload JPG, PNG, WEBP or PDF files (max 4 MB each)' });
    const urls = [];
    for (const f of req.files) urls.push(await save(f, req.user._id));
    res.json({ urls });
  } catch (e) {
    next(e);
  }
});

// Files are confidential: only logged-in staff, token passed as ?t= so links open in a new tab
const fileRouter = express.Router();
fileRouter.get('/:id', async (req, res) => {
  try {
    const p = jwt.verify(String(req.query.t || ''), process.env.JWT_SECRET);
    if (!STAFF_ROLES.includes(p.role)) throw new Error('forbidden');
  } catch (e) {
    return res.status(401).send('Login required');
  }
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).send('Not found');
  const id = new mongoose.Types.ObjectId(req.params.id);
  const [doc] = await bucket().find({ _id: id }).toArray();
  if (!doc) return res.status(404).send('Not found');
  res.setHeader('Content-Type', doc.metadata?.contentType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  bucket().openDownloadStream(id).on('error', () => res.status(404).end()).pipe(res);
});

module.exports = { uploadRouter, fileRouter };

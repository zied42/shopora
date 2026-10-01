import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { ah, requireAuth } from '../middleware/auth';
import { uploadsDir } from '../lib/paths';
import type { Store } from '../store/types';

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const prefix = file.mimetype.startsWith('video/') ? 'vid' : file.mimetype === 'application/pdf' ? 'doc' : 'img';
    cb(null, `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only image and PDF files are allowed') as never);
  },
});

const uploadVideo = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed') as never);
  },
});

function contentTypeFor(name: string): string {
  const ext = path.extname(name).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.mov') return 'video/quicktime';
  if (ext === '.m4v') return 'video/x-m4v';
  if (ext === '.ogg') return 'video/ogg';
  return 'application/octet-stream';
}

/** One-time migration: copy every file still present on local disk into the
    persistent store so legacy uploads survive the next restart. */
export async function persistExistingUploads(store: Store): Promise<void> {
  let names: string[] = [];
  try {
    names = fs.readdirSync(uploadsDir);
  } catch {
    return;
  }
  let persisted = 0;
  for (const name of names) {
    try {
      if (await store.getUploadFile(name)) continue;
      const data = fs.readFileSync(path.join(uploadsDir, name));
      await store.saveUploadFile(name, data, contentTypeFor(name));
      persisted++;
    } catch {
      // skip files that cannot be read or stored
    }
  }
  if (persisted > 0) console.log(`[uploads] persisted ${persisted} legacy file(s) into the store`);
}

export function uploadRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth);

  router.post('/', upload.single('file'), ah(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    try {
      const data = fs.readFileSync(req.file.path);
      await store.saveUploadFile(req.file.filename, data, req.file.mimetype || 'application/octet-stream');
    } catch {
      // Persistence store unavailable: the file stays only on local disk
      // (and will be lost on the next server restart), the URL still works meanwhile.
    }
    res.status(201).json({ success: true, data: { url } });
  }));

  router.post('/video', uploadVideo.single('file'), ah(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No video uploaded' });
      return;
    }
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    try {
      const data = fs.readFileSync(req.file.path);
      await store.saveUploadFile(req.file.filename, data, req.file.mimetype || 'video/mp4');
    } catch {
      // Persistence store unavailable: the file stays only on local disk.
    }
    res.status(201).json({ success: true, data: { url } });
  }));

  return router;
}
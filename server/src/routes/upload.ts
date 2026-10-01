import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { ah, requireAuth } from '../middleware/auth';
import { uploadsDir } from '../lib/paths';
import type { Store } from '../store/types';
import { env } from '../config/env';

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const extensions: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'application/pdf': '.pdf', 'video/mp4': '.mp4', 'video/webm': '.webm' };
    const ext = extensions[file.mimetype] ?? '.bin';
    const prefix = file.mimetype.startsWith('video/') ? 'vid' : file.mimetype === 'application/pdf' ? 'doc' : 'img';
    cb(null, `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image and PDF files are allowed') as never);
  },
});

const uploadVideo = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['video/mp4', 'video/webm'].includes(file.mimetype)) cb(null, true);
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

function matchesFileSignature(mime: string, data: Buffer): boolean {
  if (mime === 'image/jpeg') return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (mime === 'image/png') return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === 'image/gif') return data.subarray(0, 4).toString() === 'GIF8';
  if (mime === 'image/webp') return data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP';
  if (mime === 'application/pdf') return data.subarray(0, 5).toString() === '%PDF-';
  if (mime === 'video/mp4') return data.subarray(4, 8).toString() === 'ftyp';
  if (mime === 'video/webm') return data.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return false;
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
    const uploadData = fs.readFileSync(req.file.path);
    if (!matchesFileSignature(req.file.mimetype, uploadData)) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, error: 'File content does not match an allowed file type' });
      return;
    }
    const url = `${env.API_BASE_URL}/uploads/${req.file.filename}`;
    try {
      await store.saveUploadFile(req.file.filename, uploadData, req.file.mimetype || 'application/octet-stream');
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
    const uploadData = fs.readFileSync(req.file.path);
    if (!matchesFileSignature(req.file.mimetype, uploadData)) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, error: 'File content does not match an allowed file type' });
      return;
    }
    const url = `${env.API_BASE_URL}/uploads/${req.file.filename}`;
    try {
      await store.saveUploadFile(req.file.filename, uploadData, req.file.mimetype || 'video/mp4');
    } catch {
      // Persistence store unavailable: the file stays only on local disk.
    }
    res.status(201).json({ success: true, data: { url } });
  }));

  return router;
}

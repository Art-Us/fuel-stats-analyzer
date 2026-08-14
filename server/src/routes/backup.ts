import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { exportBackupController, importBackupController } from '../controllers/backupController.js';

const router = Router();

const tempDir = path.resolve(process.cwd(), 'inputs', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `backup-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

/**
 * @openapi
 * /api/backup/export:
 *   get:
 *     summary: Eksportuje pełną kopię zapasową danych i zdjęć do archiwum ZIP
 *     tags: [Backup]
 *     responses:
 *       200:
 *         description: Plik ZIP zawierający pliki zdjęć, raport tekstowy i manifest JSON
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/export', exportBackupController);

/**
 * @openapi
 * /api/backup/import:
 *   post:
 *     summary: Przywraca dane i zdjęcia z przesłanego archiwum ZIP
 *     tags: [Backup]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               backup:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Wynik importu kopii zapasowej
 */
router.post('/import', upload.single('backup'), importBackupController);

export default router;

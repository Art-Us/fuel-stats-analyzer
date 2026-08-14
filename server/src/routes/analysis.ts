import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { analyzePhotosController } from '../controllers/analysisController.js';
import { sanitizeFilename } from '../utils/fileOrganizer.js';

const router = Router();

// Konfiguracja dyskowego zapisu plików w folderze inputs/temp/ z zachowaniem oryginalnej nazwy
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tempDir = path.resolve(process.cwd(), 'inputs', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (_req, file, cb) => {
    let originalName = file.originalname || 'photo.jpg';
    try {
      // Prawidłowe dekodowanie polskich znaków jeśli nagłówek nadszedł jako latin1
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch (_) {}
    const safeOriginal = sanitizeFilename(originalName);
    const uniquePrefix = `${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    cb(null, `${uniquePrefix}___${safeOriginal}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // limit 15MB na plik
  }
});

const uploadFields = upload.any();

/**
 * @openapi
 * /api/analyze-photos:
 *   post:
 *     summary: Analizuje zdjęcia paragonu i/lub licznika (EXIF + OCR + Ollama AI)
 *     tags: [Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               receipt:
 *                 type: string
 *                 format: binary
 *                 description: Zdjęcie paragonu lub dystrybutora (max 1 plik)
 *               dashboard:
 *                 type: string
 *                 format: binary
 *                 description: Zdjęcie licznika samochodowego (max 1 plik)
 *     responses:
 *       200:
 *         description: Przetworzone i zdekodowane dane z analizy zdjęć
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date:
 *                   type: string
 *                   nullable: true
 *                   example: "2026-07-23"
 *                 cost:
 *                   type: number
 *                   example: 185.50
 *                 liters:
 *                   type: number
 *                   example: 28.75
 *                 price_per_liter:
 *                   type: number
 *                   example: 6.45
 *                 mileage:
 *                   type: number
 *                   example: 134200
 *                 receipt_image_url:
 *                   type: string
 *                   nullable: true
 *                   example: "/uploads/receipt-1721721600000-123456789.jpg"
 *                 dashboard_image_url:
 *                   type: string
 *                   nullable: true
 *                   example: "/uploads/dashboard-1721721600000-987654321.jpg"
 *       400:
 *         description: Brak wymaganych plików lub nieprawidłowe dane
 *       500:
 *         description: Błąd wewnętrzny serwera podczas przetwarzania obrazów lub zapytania do AI
 */
router.post('/', uploadFields, analyzePhotosController);

export default router;

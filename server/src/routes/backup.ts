import { Router } from 'express';
import { exportBackupController } from '../controllers/backupController.js';

const router = Router();

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

export default router;

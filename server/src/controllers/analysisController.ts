import { Request, Response, NextFunction } from 'express';
import { extractExifDate, performOcr, analyzeTextWithOllama } from '../services/photoAnalysisService.js';
import { AnalyzePhotosResponse } from '../types/refueling.js';
import { AppError } from '../middleware/errorHandler.js';

export async function analyzePhotosController(
  req: Request,
  res: Response<AnalyzePhotosResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const receiptFile = files?.receipt?.[0];
    const dashboardFile = files?.dashboard?.[0];

    if (!receiptFile && !dashboardFile) {
      throw new AppError('Musisz przesłać co najmniej jedno zdjęcie w polu "receipt" lub "dashboard".', 400);
    }

    // 1. Ekstrakcja daty z metadanych EXIF
    let date: string | null = null;
    if (receiptFile) {
      date = await extractExifDate(receiptFile.path);
    }
    if (!date && dashboardFile) {
      date = await extractExifDate(dashboardFile.path);
    }

    // 2. Podwójny OCR przy pomocy Tesseract.js
    const receiptText = receiptFile ? await performOcr(receiptFile.path) : '';
    const dashboardText = dashboardFile ? await performOcr(dashboardFile.path) : '';

    // 3. Analiza zebranych tekstów przez model Ollama (qwen2.5:3b)
    const aiResult = await analyzeTextWithOllama(receiptText, dashboardText);

    // 4. Budowanie i zwrot gotowej odpowiedzi
    const responseData: AnalyzePhotosResponse = {
      date,
      cost: aiResult.cost,
      liters: aiResult.liters,
      price_per_liter: aiResult.price_per_liter,
      mileage: aiResult.mileage,
      receipt_image_url: receiptFile ? `/uploads/${receiptFile.filename}` : null,
      dashboard_image_url: dashboardFile ? `/uploads/${dashboardFile.filename}` : null
    };

    res.status(200).json(responseData);
  } catch (error) {
    next(error);
  }
}

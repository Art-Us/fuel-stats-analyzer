import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { extractExifDate, performOcr, analyzePhotosWithAi } from '../services/photoAnalysisService.js';
import { AnalyzePhotosResponse } from '../types/refueling.js';
import { AppError } from '../middleware/errorHandler.js';

export async function analyzePhotosController(
  req: Request,
  res: Response<AnalyzePhotosResponse>,
  next: NextFunction
): Promise<void> {
  const startTime = Date.now();
  console.log('\n--------------------------------------------------');
  console.log('[SERVER LOG] 📥 Nowe zapytanie POST /api/analyze-photos');

  try {
    let uploadedFiles: Express.Multer.File[] = [];
    if (Array.isArray(req.files)) {
      uploadedFiles = req.files;
    } else if (req.files && typeof req.files === 'object') {
      uploadedFiles = Object.values(req.files).flat();
    } else if (req.file) {
      uploadedFiles = [req.file];
    }

    // Obsługa istniejących już zdjęć z serwera (parametr body: existing_urls)
    let existingUrls: string[] = [];
    if (req.body?.existing_urls) {
      if (Array.isArray(req.body.existing_urls)) {
        existingUrls = req.body.existing_urls;
      } else if (typeof req.body.existing_urls === 'string') {
        existingUrls = [req.body.existing_urls];
      }
    }

    const existingFilePaths: string[] = [];
    for (const relUrl of existingUrls) {
      if (relUrl && typeof relUrl === 'string') {
        const cleanPath = relUrl.replace(/^\/+/, '');
        const absolutePath = path.resolve(process.cwd(), cleanPath);
        if (fs.existsSync(absolutePath)) {
          existingFilePaths.push(absolutePath);
        }
      }
    }

    const allFilePaths = [...uploadedFiles.map(f => f.path), ...existingFilePaths].slice(0, 3);

    console.log(`[SERVER LOG] 🖼️ Łącznie do analizy: ${allFilePaths.length} zdjęć (${uploadedFiles.length} nowych, ${existingFilePaths.length} istniejących na serwerze)`);

    if (allFilePaths.length === 0) {
      console.warn('[SERVER LOG] ⚠️ Brak jakichkolwiek plików zdjęć w żądaniu.');
      throw new AppError('Musisz przesłać co najmniej jedno zdjęcie (od 1 do 3 zdjęć).', 400);
    }

    // 1. Ekstrakcja daty z metadanych EXIF z przesłanych plików
    let date: string | null = null;
    for (const filePath of allFilePaths) {
      date = await extractExifDate(filePath);
      if (date) break;
    }
    console.log(`[SERVER LOG] 📅 Data z EXIF: ${date || 'Brak daty w metadanych'}`);

    // 2. Bezpośrednia analiza wizyjna (lub szybkie pominięcie AI przy zapisie formularza)
    let aiResult = { cost: 0, liters: 0, price_per_liter: 0, mileage: 0 };
    const skipAi = req.body?.skip_ai === 'true' || req.body?.skip_ai === true;

    if (!skipAi) {
      console.log(`[SERVER LOG] 🤖 Przekazuję ${allFilePaths.length} zdjęć bezpośrednio do Gemini Vision API...`);
      aiResult = await analyzePhotosWithAi(allFilePaths);
      console.log(`[SERVER LOG] ✨ Wynik z Gemini Vision AI:`, JSON.stringify(aiResult, null, 2));
    } else {
      console.log(`[SERVER LOG] ⚡ Pomijam Gemini Vision AI (tryb szybkiego przesłania plików przy zapisie).`);
    }

    const allImageUrls: string[] = [
      ...uploadedFiles.map(f => `/inputs/temp/${f.filename}`),
      ...existingUrls
    ].slice(0, 3);

    // 4. Budowanie i zwrot gotowej odpowiedzi
    const responseData: AnalyzePhotosResponse = {
      date,
      cost: aiResult.cost,
      liters: aiResult.liters,
      price_per_liter: aiResult.price_per_liter,
      mileage: aiResult.mileage,
      receipt_image_url: allImageUrls[0] || null,
      dashboard_image_url: allImageUrls[1] || null
    };

    console.log(`[SERVER LOG] ✅ Sukces! Analiza ${allFilePaths.length} zdjęć zakończona w ${Date.now() - startTime} ms. Zwracam HTTP 200.`);
    console.log('--------------------------------------------------\n');
    res.status(200).json(responseData);
  } catch (error: any) {
    console.error(`[SERVER ERROR] ❌ Błąd podczas analizy zdjęć (${Date.now() - startTime} ms):`, error?.message || error);
    console.log('--------------------------------------------------\n');
    next(error);
  }
}

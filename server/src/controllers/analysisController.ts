import { Request, Response, NextFunction } from 'express';
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
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const receiptFile = files?.receipt?.[0];
    const dashboardFile = files?.dashboard?.[0];

    console.log(`[SERVER LOG] 🖼️  Przesłane pliki: Paragon: ${receiptFile ? receiptFile.filename + ' (' + receiptFile.size + ' B)' : 'BRAK'}, Licznik: ${dashboardFile ? dashboardFile.filename + ' (' + dashboardFile.size + ' B)' : 'BRAK'}`);

    if (!receiptFile && !dashboardFile) {
      console.warn('[SERVER LOG] ⚠️ Brak jakichkolwiek plików zdjęć w żądaniu.');
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
    console.log(`[SERVER LOG] 📅 Data z EXIF: ${date || 'Brak daty w metadanych'}`);

    // 2. Podwójny OCR przy pomocy Tesseract.js
    console.log('[SERVER LOG] 🔍 Uruchamiam rozpoznawanie tekstu (Tesseract OCR)...');
    const receiptText = receiptFile ? await performOcr(receiptFile.path) : '';
    const dashboardText = dashboardFile ? await performOcr(dashboardFile.path) : '';
    console.log(`[SERVER LOG] 📝 Wyekstrahowany tekst z Tesseract OCR: Paragon (${receiptText.length} znaków), Licznik (${dashboardText.length} znaków)`);

    // 3. Analiza zebranego tekstu z OCR przez Gemini 1.5 Flash API
    console.log('[SERVER LOG] 🤖 Przekazuję wyekstrahowany tekst z OCR do Gemini 1.5 Flash API...');
    const aiResult = await analyzePhotosWithAi(
      receiptFile?.path,
      dashboardFile?.path,
      receiptText,
      dashboardText
    );
    console.log(`[SERVER LOG] ✨ Wynik z Gemini Vision AI:`, JSON.stringify(aiResult, null, 2));

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

    console.log(`[SERVER LOG] ✅ Sukces! Analiza zakończona w ${Date.now() - startTime} ms. Zwracam HTTP 200.`);
    console.log('--------------------------------------------------\n');
    res.status(200).json(responseData);
  } catch (error: any) {
    console.error(`[SERVER ERROR] ❌ Błąd podczas analizy zdjęć (${Date.now() - startTime} ms):`, error?.message || error);
    console.log('--------------------------------------------------\n');
    next(error);
  }
}

import exifr from 'exifr';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { AppError } from '../middleware/errorHandler.js';

export interface OllamaAnalysisResult {
  cost: number;
  liters: number;
  price_per_liter: number;
  mileage: number;
}

/**
 * Ekstrahuje datę z metadanych EXIF zdjęcia i formatuje do YYYY-MM-DD.
 */
export async function extractExifDate(filePath: string): Promise<string | null> {
  try {
    const output = await exifr.parse(filePath, ['DateTimeOriginal', 'CreateDate', 'ModifyDate']);
    if (!output) return null;

    const dateObj: Date | undefined = output.DateTimeOriginal || output.CreateDate || output.ModifyDate;
    if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return null;
    }

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn(`[EXIF Warning] Nie udało się odczytać EXIF z pliku ${filePath}:`, error);
    return null;
  }
}

/**
 * Zastępcza funkcja performOcr (wyłączona wg życzenia użytkownika).
 */
export async function performOcr(_filePath: string): Promise<string> {
  return '';
}

/**
 * Wysyła zdjęcia bezpośrednio do Google Gemini 1.5 Flash Vision API (bez używania Tesseract OCR).
 */
export async function analyzeWithGemini(
  filePaths: string[] | string
): Promise<OllamaAnalysisResult> {
  dotenv.config({ override: true });
  const rawKey = process.env.GEMINI_API_KEY || '';
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');

  if (!apiKey) {
    console.warn('[Gemini Warning] Brak klucza GEMINI_API_KEY w pliku .env lub jest pusty! Nie można użyć Gemini API.');
    return { cost: 0, liters: 0, price_per_liter: 0, mileage: 0 };
  }

  const pathsArray: string[] = Array.isArray(filePaths)
    ? filePaths
    : [filePaths].filter(Boolean) as string[];

  try {
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';
    console.log(`[Gemini API] ⚡ Rozpoczynam bezpośrednią analizę wizyjną dla ${pathsArray.length} zdjęć (model: ${geminiModel})...`);
    const parts: any[] = [];

    const prompt = `
Jesteś precyzyjnym analitykiem wizyjnym danych dotyczących tankowania pojazdu.
Przeanalizuj bezpośrednio dołączone zdjęcia (paragon, dystrybutor, licznik przebiegu z deski rozdzielczej) i wyciągnij z nich wartości numeryczne:
- cost: łączna kwota do zapłaty w PLN (np. 185.50 lub 307.18)
- liters: ilość zatankowanego paliwa w litrach (np. 28.75 lub 40.74)
- price_per_liter: cena za 1 litr paliwa w PLN (np. 6.45 lub 7.54)
- mileage: stan licznika / przebieg pojazdu w km z deski rozdzielczej (np. 134200)

Uważnie sprawdź cyfry na zdjęciu. Jeśli dana wartość nie występuje na żadnym ze zdjęć, zwróć dla niej 0.

ZWRÓĆ WYŁĄCZNIE CZYSTY OBIEKT JSON BEZ ŻADNEGO MARKDOWNU:
{
  "cost": 0,
  "liters": 0,
  "price_per_liter": 0,
  "mileage": 0
}
`;
    parts.push({ text: prompt });

    // Dołączenie przesłanych zdjęć w formacie Base64 bezpośrednio dla modelu wizyjnego Gemini Flash
    for (const filePath of pathsArray) {
      if (filePath && fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
        parts.push({
          inlineData: {
            mimeType,
            data: buffer.toString('base64')
          }
        });
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

    const response = await axios.post(
      url,
      {
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      },
      { timeout: 25000 }
    );

    const rawResponse: string = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleanedText = rawResponse
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleanedText);

    return {
      cost: typeof parsed.cost === 'number' && !isNaN(parsed.cost) ? parsed.cost : 0,
      liters: typeof parsed.liters === 'number' && !isNaN(parsed.liters) ? parsed.liters : 0,
      price_per_liter: typeof parsed.price_per_liter === 'number' && !isNaN(parsed.price_per_liter) ? parsed.price_per_liter : 0,
      mileage: typeof parsed.mileage === 'number' && !isNaN(parsed.mileage) ? parsed.mileage : 0
    };
  } catch (error: any) {
    const status = error?.response?.status;
    const errorDataStr = JSON.stringify(error?.response?.data || error?.message || '');

    console.error('[Gemini API Error] Błąd podczas analizy przez Gemini:', errorDataStr);

    // Wykrywanie przekroczenia limitu zapytań Gemini API Free Tier (429 Rate Limit / Quota Exceeded)
    if (status === 429 || errorDataStr.includes('Quota exceeded') || errorDataStr.includes('RESOURCE_EXHAUSTED')) {
      const retryMatch = errorDataStr.match(/retry in ([0-9.]+)s/i);
      const retrySecs = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;
      throw new AppError(
        `Przekroczono limit zapytań darmowego API Gemini. Spróbuj ponownie za ok. ${retrySecs} sekund.`,
        429,
        { retryAfter: retrySecs, quotaExceeded: true }
      );
    }

    return { cost: 0, liters: 0, price_per_liter: 0, mileage: 0 };
  }
}

/**
 * Główna funkcja orkiestrująca analizę zdjęć bezpośrednio przez Gemini Vision API.
 */
export async function analyzePhotosWithAi(
  filePaths: string[] | string
): Promise<OllamaAnalysisResult> {
  console.log('[AI Service] Wywołuję bezpośrednią analizę wizyjną zdjęć przez Gemini 1.5 Flash API...');
  return await analyzeWithGemini(filePaths);
}

export async function analyzeTextWithOllama(): Promise<OllamaAnalysisResult> {
  return { cost: 0, liters: 0, price_per_liter: 0, mileage: 0 };
}

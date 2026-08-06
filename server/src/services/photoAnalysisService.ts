import exifr from 'exifr';
import { createWorker } from 'tesseract.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

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
 * Przeprowadza rozpoznawanie tekstu (OCR) na wskazanym pliku przy użyciu Tesseract.js.
 */
export async function performOcr(filePath: string): Promise<string> {
  let worker: any = null;
  try {
    if (!fs.existsSync(filePath)) {
      return '';
    }
    // Inicjalizacja tesseract z obsługą języka polskiego i angielskiego
    worker = await createWorker('pol+eng', 1, {
      logger: () => {},
      errorHandler: (err) => console.warn('[Tesseract Worker Warning]', err?.message || err)
    });
    const ret = await worker.recognize(filePath);
    await worker.terminate();
    return ret.data?.text || '';
  } catch (error: any) {
    console.warn(`[OCR Warning] Nie udało się wykonać OCR dla pliku ${filePath}:`, error?.message || error);
    if (worker) {
      try {
        await worker.terminate();
      } catch (_) {}
    }
    return '';
  }
}

/**
 * Wysyła zebrany tekst z OCR (oraz opcjonalnie zdjęcia) do Google Gemini 1.5 Flash API.
 */
export async function analyzeWithGemini(
  receiptFilePath?: string,
  dashboardFilePath?: string,
  receiptText?: string,
  dashboardText?: string
): Promise<OllamaAnalysisResult> {
  const rawKey = process.env.GEMINI_API_KEY || '';
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');

  if (!apiKey) {
    console.warn('[Gemini Warning] Brak klucza GEMINI_API_KEY w pliku .env lub jest pusty! Nie można użyć Gemini API.');
    return { cost: 0, liters: 0, price_per_liter: 0, mileage: 0 };
  }

  try {
    console.log('[Gemini API] 🤖 Rozpoczynam analizę tekstu z Tesseract OCR ze wsparciem zdjęć referencyjnych...');
    const parts: any[] = [];

    const prompt = `
Jesteś precyzyjnym analitykiem danych dotyczących tankowania pojazdu.
Oto surowy tekst wyekstrahowany ze zdjęć przez silnik Tesseract OCR:

1. ODCZYTANY TEKST Z PARAGONU (Tesseract OCR):
"""
${receiptText || 'BRAK TEKSTU'}
"""

2. ODCZYTANY TEKST Z LICZNIKA (Tesseract OCR):
"""
${dashboardText || 'BRAK TEKSTU'}
"""

Zadanie:
Przeanalizuj powyższy tekst z Tesseract OCR oraz dołączone zdjęcia referencyjne, aby bezbłędnie wyciągnąć wartości numeryczne:
- cost: łączna kwota do zapłaty w PLN (np. 185.50 lub 307.18)
- liters: ilość zatankowanego paliwa w litrach (np. 28.75 lub 40.74)
- price_per_liter: cena za 1 litr paliwa w PLN (np. 6.45 lub 7.54)
- mileage: aktualny stan licznika / przebieg w km z deski rozdzielczej (np. 134200)

Uwaga: Tesseract OCR potrafi zamieniać cyfry na znaki (np. 0 na O, 8 na B, spacji w kwotach). Wykorzystaj odczytany tekst OCR oraz dołączony obraz, aby skorygować błędy OCR i podać w 100% dokładne liczby.

Jeśli dana wartość nie występuje w tekście ani na zdjęciu, zwróć dla niej 0.

ZWRÓĆ WYŁĄCZNIE CZYSTY OBIEKT JSON BEZ ŻADNEGO MARKDOWNU:
{
  "cost": 0,
  "liters": 0,
  "price_per_liter": 0,
  "mileage": 0
}
`;
    parts.push({ text: prompt });

    // Dołączenie zdjęcia paragonu jako materiał referencyjny dla Gemini
    if (receiptFilePath && fs.existsSync(receiptFilePath)) {
      const receiptBuffer = fs.readFileSync(receiptFilePath);
      const ext = path.extname(receiptFilePath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: receiptBuffer.toString('base64')
        }
      });
    }

    // Dołączenie zdjęcia licznika jako materiał referencyjny dla Gemini
    if (dashboardFilePath && fs.existsSync(dashboardFilePath)) {
      const dashboardBuffer = fs.readFileSync(dashboardFilePath);
      const ext = path.extname(dashboardFilePath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: dashboardBuffer.toString('base64')
        }
      });
    }

    const geminiModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

    const response = await axios.post(
      url,
      {
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      },
      { timeout: 20000 }
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
    console.error('[Gemini API Error] Błąd podczas analizy przez Gemini:', error?.response?.data || error?.message || error);
    return { cost: 0, liters: 0, price_per_liter: 0, mileage: 0 };
  }
}

/**
 * Główna funkcja orkiestrująca: Wykonuje bezpośrednio szybką analizę przez Gemini 1.5 Flash API.
 */
export async function analyzePhotosWithAi(
  receiptFilePath?: string,
  dashboardFilePath?: string,
  receiptText?: string,
  dashboardText?: string
): Promise<OllamaAnalysisResult> {
  console.log('[AI Service] Wywołuję analizę zdjęć bezpośrednio przez Gemini 1.5 Flash API...');
  return await analyzeWithGemini(receiptFilePath, dashboardFilePath, receiptText, dashboardText);
}

export async function analyzeTextWithOllama(
  receiptText: string,
  dashboardText: string
): Promise<OllamaAnalysisResult> {
  return analyzePhotosWithAi(undefined, undefined, receiptText, dashboardText);
}


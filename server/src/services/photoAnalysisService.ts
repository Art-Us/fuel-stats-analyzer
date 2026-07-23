import exifr from 'exifr';
import { createWorker } from 'tesseract.js';
import axios from 'axios';

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
  let worker;
  try {
    // Inicjalizacja tesseract z obsługą języka polskiego i angielskiego
    worker = await createWorker('pol+eng');
    const ret = await worker.recognize(filePath);
    await worker.terminate();
    return ret.data?.text || '';
  } catch (error) {
    console.error(`[OCR Error] Błąd podczas analizy pliku ${filePath}:`, error);
    if (worker) {
      try {
        await worker.terminate();
      } catch (_) {}
    }
    return '';
  }
}

/**
 * Wysyła zebrany tekst z OCR (paragon i licznik) do lokalnego modelu Ollama (qwen2.5:3b)
 * i wymusza zwrot czystego obiektu JSON.
 */
export async function analyzeTextWithOllama(
  receiptText: string,
  dashboardText: string
): Promise<OllamaAnalysisResult> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
  const model = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

  const prompt = `
Jesteś precyzyjnym analitykiem OCR dla danych dotyczących tankowania pojazdu.
Twoim zadaniem jest przetworzenie poniższych dwóch fragmentów tekstu ze zdjęć i wyciągnięcie kluczowych wartości numerycznych.

1. TEKST Z PARAGONU LUB DYSTRYBUTORA (receiptText):
"""
${receiptText || 'BRAK TEKSTU'}
"""

2. TEKST Z LICZNIKA DESKI ROZDZIELCZEJ (dashboardText):
"""
${dashboardText || 'BRAK TEKSTU'}
"""

Zasady ekstrakcji:
- z receiptText wyciągnij:
  - cost: łączna kwota do zapłaty (liczba zmiennoprzecinkowa, np. 185.50)
  - liters: zatankowana ilość paliwa w litrach (liczba zmiennoprzecinkowa, np. 28.75)
  - price_per_liter: cena za 1 litr paliwa (liczba zmiennoprzecinkowa, np. 6.45)
- z dashboardText wyciągnij:
  - mileage: aktualny stan licznika / przebieg w km (liczba całkowita lub zmiennoprzecinkowa, np. 134200)

Jeśli dana wartość nie występuje w tekście lub tekst jest nieczytelny, zwróć wartość 0 dla tego pola.

ZWRÓĆ WYŁĄCZNIE CZYSTY OBIEKT JSON BEZ ŻADNEGO INNEGO TEKSTU ANI MARKDOWN:
{
  "cost": 0,
  "liters": 0,
  "price_per_liter": 0,
  "mileage": 0
}
`;

  try {
    const response = await axios.post(
      ollamaUrl,
      {
        model: model,
        prompt: prompt,
        stream: false,
        format: 'json'
      },
      {
        timeout: 45000
      }
    );

    const rawResponse: string = response.data?.response || '';

    // Oczyszczenie odpowiedzi z ewentualnych znaczników markdown (np. ```json ... ```)
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
    console.error('[Ollama API Error] Błąd podczas komunikacji z Ollamą:', error?.message || error);
    return {
      cost: 0,
      liters: 0,
      price_per_liter: 0,
      mileage: 0
    };
  }
}

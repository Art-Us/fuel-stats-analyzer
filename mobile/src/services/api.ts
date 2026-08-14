import axios from 'axios';
import { Platform } from 'react-native';
import {
  Refueling,
  CreateRefuelingDTO,
  AnalyzeResponse,
  StatsResponse,
  PeriodType,
  CarInfo,
} from '../types/api';

// Native API Base URL (Android Emulator uses 10.0.2.2:3000, iOS / Web uses localhost:3000)
// Change API_BASE_URL to LAN IP (e.g., 'http://192.168.1.50:3000/api') when testing on physical device via Expo Go
// export const API_BASE_URL = Platform.OS === 'android'
//   ? 'http://10.0.2.2:3000/api'
//   : 'http://localhost:3000/api';

export const API_BASE_URL = 'http://192.168.10.238:3000/api';

export const getImageUrl = (relativeUrl?: string | null): string | null => {
  if (!relativeUrl) return null;
  if (
    relativeUrl.startsWith('http://') ||
    relativeUrl.startsWith('https://') ||
    relativeUrl.startsWith('file://') ||
    relativeUrl.startsWith('content://') ||
    relativeUrl.startsWith('ph://')
  ) {
    return relativeUrl;
  }
  const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
  const cleanPath = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
  return `${baseUrl}${cleanPath}`;
};


const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getRefuelings = async (period: PeriodType = 'all'): Promise<Refueling[]> => {
  const response = await api.get<Refueling[]>('/refuelings', {
    params: { period },
  });
  return response.data;
};

export const createRefueling = async (data: CreateRefuelingDTO): Promise<Refueling> => {
  const response = await api.post<Refueling>('/refuelings', data);
  return response.data;
};

export interface MobileImageFile {
  uri: string;
  name?: string;
  type?: string;
  fileSize?: number;
  width?: number;
  height?: number;
}

export const analyzePhotos = async (
  receiptOrPhotos?: (MobileImageFile | null)[] | MobileImageFile | null,
  dashboardImageOrExistingUrls?: MobileImageFile | (string | null)[] | null,
  existingUrlsParam?: (string | null)[],
  skipAi?: boolean
): Promise<AnalyzeResponse> => {
  const formData = new FormData();
  let photoList: MobileImageFile[] = [];
  let existingUrls: string[] = [];

  if (Array.isArray(dashboardImageOrExistingUrls)) {
    existingUrls = dashboardImageOrExistingUrls.filter((u): u is string => typeof u === 'string' && !!u);
  } else if (Array.isArray(existingUrlsParam)) {
    existingUrls = existingUrlsParam.filter((u): u is string => typeof u === 'string' && !!u);
  }

  const dashboardImage = (!Array.isArray(dashboardImageOrExistingUrls) && dashboardImageOrExistingUrls) ? dashboardImageOrExistingUrls : null;

  // ── DIAGNOSTYKA: lista wejściowych zdjęć ──────────────────────────────────
  console.log('[DIAG] ▶ analyzePhotos() wywołana (skipAi:', !!skipAi, ')');
  console.log('[DIAG] 📦 receiptOrPhotos (typ):', Array.isArray(receiptOrPhotos) ? `Array(${(receiptOrPhotos as any[]).length})` : typeof receiptOrPhotos);
  console.log('[DIAG] 📦 dashboardImage:', dashboardImage ? dashboardImage.uri : 'null');
  console.log('[DIAG] 📦 existingUrls:', existingUrls);

  if (Array.isArray(receiptOrPhotos)) {
    photoList = receiptOrPhotos.filter((p): p is MobileImageFile => p !== null && !!p.uri);
  } else {
    if (receiptOrPhotos && receiptOrPhotos.uri) photoList.push(receiptOrPhotos);
    if (dashboardImage && dashboardImage.uri) photoList.push(dashboardImage);
  }

  console.log(`[DIAG] 🖼️  Efektywna lista zdjęć (${photoList.length} szt.):`);
  photoList.forEach((p, i) => {
    console.log(`[DIAG]   [${i}] uri="${p.uri}" | name="${p.name}" | type="${p.type}"`);
  });

  // ── Budowanie FormData ─────────────────────────────────────────────────────
  photoList.slice(0, 3).forEach((photo, index) => {
    const filename = photo.name || photo.uri.split('/').pop() || `photo_${index + 1}.jpg`;
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpeg';
    const mimeType = (photo.type && photo.type !== 'image/jpg')
      ? photo.type
      : (ext === 'png' ? 'image/png' : 'image/jpeg');
    console.log(`[DIAG] 📎 Dodaję do FormData[${index}]: name="${filename}", type="${mimeType}", uri="${photo.uri.substring(0, 80)}..."`);
    formData.append('photos', {
      uri: photo.uri,
      name: filename,
      type: mimeType,
    } as any);
  });

  existingUrls.forEach((url) => {
    console.log(`[DIAG] 📎 Dodaję existing_urls do FormData: "${url}"`);
    formData.append('existing_urls', url);
  });

  if (skipAi) {
    formData.append('skip_ai', 'true');
  }

  // ── Test połączenia przed wysłaniem ───────────────────────────────────────
  const targetUrl = `${API_BASE_URL}/analyze-photos`;
  console.log(`[DIAG] 🌐 Docelowy URL: ${targetUrl}`);
  console.log(`[DIAG] 🔌 Próba wstępnego testu połączenia HEAD...`);
  try {
    const ping = await fetch(targetUrl.replace('/api/analyze-photos', '/'), { method: 'GET' });
    console.log(`[DIAG] ✅ Serwer odpowiada (ping status: ${ping.status}) — połączenie działa`);
  } catch (pingErr: any) {
    console.error(`[DIAG] ❌ PING NIEUDANY — serwer jest nieosiągalny!`);
    console.error(`[DIAG]    Błąd pingu:`, pingErr?.message, '| name:', pingErr?.name);
    console.error(`[DIAG]    URL API: ${API_BASE_URL}`);
    console.error(`[DIAG]    Sprawdź: 1) czy PC i telefon są w tej samej sieci Wi-Fi`);
    console.error(`[DIAG]             2) czy serwer nasłuchuje na 0.0.0.0 (nie tylko localhost)`);
    console.error(`[DIAG]             3) czy zapora systemu Windows nie blokuje portu 3000`);
    console.error(`[DIAG]             4) czy app.json zawiera "usesCleartextTraffic": true`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  console.log(`[MOBILE LOG] 🚀 Wysyłam ${photoList.length} zdjęć do: ${API_BASE_URL}/analyze-photos`);

  try {
    console.log(`[DIAG] ⏳ Wywołuję fetch()...`);
    const response = await fetch(targetUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log(`[MOBILE LOG] 📥 Odpowiedź serwera Status: ${response.status}`);

    if (!response.ok) {
      let errMessage = `Błąd serwera (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) {
          errMessage = errJson.error;
        }
      } catch (_) {
        const errText = await response.text();
        if (errText) errMessage = errText;
      }
      console.error(`[MOBILE LOG] ❌ Błąd HTTP ${response.status}:`, errMessage);
      throw new Error(errMessage);
    }

    const data = await response.json();
    if (skipAi) {
      console.log(`[MOBILE LOG] 📤 Przesłano pliki zdjęć na serwer:`, JSON.stringify(data));
    } else {
      console.log(`[MOBILE LOG] ✅ Pomyślnie odebrano dane z AI:`, JSON.stringify(data));
    }
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('[DIAG] ❌ fetch() rzucił wyjątek:');
    console.error('[DIAG]    err.name    :', err?.name);
    console.error('[DIAG]    err.message :', err?.message);
    console.error('[DIAG]    err.code    :', err?.code);
    console.error('[DIAG]    err.type    :', err?.type);
    console.error(`[MOBILE LOG] ❌ Wyjątek podczas wysyłania/analizy:`, err);
    if (err.name === 'AbortError') {
      throw new Error('Przekroczono czas oczekiwania na analizę Tesseract + AI (Timeout 90s).');
    }
    throw err;
  }
};

export const uploadPhotosFast = async (
  photos: MobileImageFile[],
  existingUrls?: (string | null)[]
): Promise<AnalyzeResponse> => {
  return analyzePhotos(photos, existingUrls, undefined, true);
};

export const getStats = async (period: PeriodType = 'all'): Promise<StatsResponse> => {
  const response = await api.get<StatsResponse>('/stats', {
    params: { period },
  });
  return response.data;
};

export const getRefuelingById = async (id: number): Promise<Refueling> => {
  const response = await api.get<Refueling>(`/refuelings/${id}`);
  return response.data;
};

export const updateRefueling = async (
  id: number,
  data: Partial<CreateRefuelingDTO>
): Promise<Refueling> => {
  const response = await api.put<Refueling>(`/refuelings/${id}`, data);
  return response.data;
};

export const deleteRefueling = async (id: number): Promise<{ message: string; id: number }> => {
  const response = await api.delete<{ message: string; id: number }>(`/refuelings/${id}`);
  return response.data;
};

export const deleteRefuelingPhoto = async (id: number, type: 'receipt' | 'dashboard'): Promise<Refueling> => {
  const response = await api.delete<Refueling>(`/refuelings/${id}/images/${type}`);
  return response.data;
};

export const getCarInfo = async (): Promise<CarInfo> => {
  const response = await api.get<CarInfo>('/car');
  return response.data;
};

export const updateCarInfo = async (name: string, gemini_api_key?: string): Promise<CarInfo> => {
  const response = await api.put<CarInfo>('/car', { name, gemini_api_key });
  return response.data;
};

export const getExportBackupUrl = (): string => `${API_BASE_URL}/backup/export`;

export default api;

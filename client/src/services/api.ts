import axios from 'axios';
import {
  Refueling,
  CreateRefuelingDTO,
  AnalyzeResponse,
  StatsResponse,
  PeriodType
} from '../types/api';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Pobiera listę tankowań z backendu (GET /api/refuelings)
 */
export const getRefuelings = async (period: PeriodType = 'all'): Promise<Refueling[]> => {
  const response = await api.get<Refueling[]>('/refuelings', {
    params: { period },
  });
  return response.data;
};

/**
 * Wysyła nowe tankowanie do backendu (POST /api/refuelings)
 */
export const createRefueling = async (data: CreateRefuelingDTO): Promise<Refueling> => {
  const response = await api.post<Refueling>('/refuelings', data);
  return response.data;
};

/**
 * Wysyła zdjęcia paragonu i/lub licznika do analizy przez AI (POST /api/analyze-photos)
 */
export const analyzePhotos = async (
  receiptFile?: File | null,
  dashboardFile?: File | null
): Promise<AnalyzeResponse> => {
  const formData = new FormData();
  if (receiptFile) {
    formData.append('receipt', receiptFile);
  }
  if (dashboardFile) {
    formData.append('dashboard', dashboardFile);
  }

  const response = await api.post<AnalyzeResponse>('/analyze-photos', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Pobiera podsumowanie i statystyki tankowań dla podanego okresu (GET /api/stats?period=...)
 */
export const getStats = async (period: PeriodType = 'all'): Promise<StatsResponse> => {
  const response = await api.get<StatsResponse>('/stats', {
    params: { period },
  });
  return response.data;
};

/**
 * Pobiera pojedyncze tankowanie po ID (GET /api/refuelings/:id)
 */
export const getRefuelingById = async (id: number): Promise<Refueling> => {
  const response = await api.get<Refueling>(`/refuelings/${id}`);
  return response.data;
};

/**
 * Aktualizuje wpis tankowania (PUT /api/refuelings/:id)
 */
export const updateRefueling = async (
  id: number,
  data: Partial<CreateRefuelingDTO>
): Promise<Refueling> => {
  const response = await api.put<Refueling>(`/refuelings/${id}`, data);
  return response.data;
};

/**
 * Usuwa wpis tankowania z bazy (DELETE /api/refuelings/:id)
 */
export const deleteRefueling = async (id: number): Promise<{ message: string; id: number }> => {
  const response = await api.delete<{ message: string; id: number }>(`/refuelings/${id}`);
  return response.data;
};

/**
 * Pobiera dane samochodu: nazwę i najnowszy przebieg (GET /api/car)
 */
export const getCarInfo = async (): Promise<{ name: string; latest_mileage: number | null }> => {
  const response = await api.get<{ name: string; latest_mileage: number | null }>('/car');
  return response.data;
};

/**
 * Aktualizuje nazwę samochodu (PUT /api/car)
 */
export const updateCarInfo = async (name: string): Promise<{ name: string; latest_mileage: number | null }> => {
  const response = await api.put<{ name: string; latest_mileage: number | null }>('/car', { name });
  return response.data;
};

export default api;

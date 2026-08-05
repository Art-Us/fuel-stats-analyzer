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
}

export const analyzePhotos = async (
  receiptImage?: MobileImageFile | null,
  dashboardImage?: MobileImageFile | null
): Promise<AnalyzeResponse> => {
  const formData = new FormData();

  if (receiptImage && receiptImage.uri) {
    const filename = receiptImage.name || receiptImage.uri.split('/').pop() || 'receipt.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = receiptImage.type || (match ? `image/${match[1]}` : 'image/jpeg');
    formData.append('receipt', {
      uri: receiptImage.uri,
      name: filename,
      type,
    } as any);
  }

  if (dashboardImage && dashboardImage.uri) {
    const filename = dashboardImage.name || dashboardImage.uri.split('/').pop() || 'dashboard.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = dashboardImage.type || (match ? `image/${match[1]}` : 'image/jpeg');
    formData.append('dashboard', {
      uri: dashboardImage.uri,
      name: filename,
      type,
    } as any);
  }

  const response = await api.post<AnalyzeResponse>('/analyze-photos', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
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

export const getCarInfo = async (): Promise<CarInfo> => {
  const response = await api.get<CarInfo>('/car');
  return response.data;
};

export const updateCarInfo = async (name: string): Promise<CarInfo> => {
  const response = await api.put<CarInfo>('/car', { name });
  return response.data;
};

export default api;

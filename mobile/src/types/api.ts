export interface RefuelingStats {
  distance?: number | null;
  fuel_consumption_l_per_100km?: number | null;
  cost_per_km?: number | null;
}

export interface Refueling {
  id: number;
  date: string;
  cost: number;
  liters: number;
  price_per_liter: number;
  mileage: number;
  receipt_image_url?: string | null;
  dashboard_image_url?: string | null;
  created_at?: string;
  stats?: RefuelingStats;
}

export interface CreateRefuelingDTO {
  date: string;
  cost: number;
  liters: number;
  price_per_liter?: number;
  mileage: number;
  receipt_image_url?: string | null;
  dashboard_image_url?: string | null;
}

export interface AnalyzeResponse {
  date?: string | null;
  cost?: number | null;
  liters?: number | null;
  price_per_liter?: number | null;
  mileage?: number | null;
  receipt_image_url?: string | null;
  dashboard_image_url?: string | null;
}

export type PeriodType = 'week' | 'month' | 'year' | 'all';

export interface StatsResponse {
  period: PeriodType;
  total_refuelings: number;
  total_liters: number;
  total_cost: number;
  average_price_per_liter: number;
  period_distance: number;
  average_fuel_consumption: number | null;
  average_price_per_km: number | null;
}

export interface CarInfo {
  id: number;
  name: string;
  latest_mileage: number | null;
}

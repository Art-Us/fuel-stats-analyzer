export interface Refueling {
  id: number;
  date: string; // Format ISO, np. "2026-07-23T08:30:00Z"
  cost: number;
  liters: number;
  price_per_liter: number;
  mileage: number;
  receipt_image_url: string | null;
  dashboard_image_url: string | null;
  created_at: string;
}

export interface RefuelingStats {
  distance: number | null; // Dystans przejechany od poprzedniego tankowania (km)
  fuel_consumption_l_per_100km: number | null; // Zużycie paliwa w l/100km
  cost_per_km: number | null; // Koszt przejechania 1 km
}

export interface RefuelingWithStats extends Refueling {
  stats: RefuelingStats;
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

export interface UpdateRefuelingDTO {
  date?: string;
  cost?: number;
  liters?: number;
  price_per_liter?: number;
  mileage?: number;
  receipt_image_url?: string | null;
  dashboard_image_url?: string | null;
}

export interface AnalyzePhotosResponse {
  date: string | null;
  cost: number;
  liters: number;
  price_per_liter: number;
  mileage: number;
  receipt_image_url: string | null;
  dashboard_image_url: string | null;
}

export type StatsPeriod = 'week' | 'month' | 'year' | 'all';
export type RefuelingPeriod = 'week' | 'month' | 'year' | 'all';

export interface StatsResponse {
  period: StatsPeriod;
  total_refuelings: number;
  total_liters: number;
  total_cost: number;
  average_price_per_liter: number;
  period_distance: number;
  average_fuel_consumption: number | null;
  average_price_per_km: number | null;
}

export interface CalendarStatsResponse {
  year: number;
  month: number | null;
  week: number | null;
  description: string;
  start_date: string;
  end_date: string;
  total_refuelings: number;
  total_liters: number;
  total_cost: number;
  average_price_per_liter: number;
  period_distance: number;
  average_fuel_consumption: number | null;
  average_price_per_km: number | null;
}

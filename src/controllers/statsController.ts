import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db.js';
import { Refueling, StatsPeriod, StatsResponse, CalendarStatsResponse } from '../types/refueling.js';
import { getCalendarDateRange } from '../utils/calendarUtils.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getStatsController(
  req: Request<{}, {}, {}, { period?: string }>,
  res: Response<StatsResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const rawPeriod = (req.query.period || 'all').toLowerCase();

    if (!['week', 'month', 'year', 'all'].includes(rawPeriod)) {
      throw new AppError('Nieprawidłowy parametr period. Dozwolone wartości to: week, month, year, all.', 400);
    }

    const period = rawPeriod as StatsPeriod;
    const db = await getDatabase();

    let whereClause = '';
    if (period === 'week') {
      whereClause = "WHERE date >= datetime('now', '-7 days')";
    } else if (period === 'month') {
      whereClause = "WHERE date >= datetime('now', '-1 month')";
    } else if (period === 'year') {
      whereClause = "WHERE date >= datetime('now', '-1 year')";
    }

    // Pobieramy wpisy z wybranego okresu w kolejności chronologicznej
    const periodRefuelings = await db.all<Refueling[]>(
      `SELECT * FROM refuelings ${whereClause} ORDER BY date ASC, mileage ASC, id ASC`
    );

    const total_refuelings = periodRefuelings.length;

    if (total_refuelings === 0) {
      res.status(200).json({
        period,
        total_refuelings: 0,
        total_liters: 0,
        total_cost: 0,
        average_price_per_liter: 0,
        period_distance: 0,
        average_fuel_consumption: null,
        average_price_per_km: null
      });
      return;
    }

    const totalLitersRaw = periodRefuelings.reduce((acc, curr) => acc + curr.liters, 0);
    const totalCostRaw = periodRefuelings.reduce((acc, curr) => acc + curr.cost, 0);

    const total_liters = Number(totalLitersRaw.toFixed(2));
    const total_cost = Number(totalCostRaw.toFixed(2));

    const average_price_per_liter = total_liters > 0
      ? Number((total_cost / total_liters).toFixed(2))
      : 0;

    // Najnowszy wpis w danym okresie
    const latestRefueling = periodRefuelings[periodRefuelings.length - 1];
    // Najstarszy wpis w danym okresie
    const oldestRefueling = periodRefuelings[0];

    // Szukamy wpisu bezpośrednio przed najstarszym wpisem z okresu (aby zwiększyć dokładność dystansu)
    const priorRefueling = await db.get<Refueling>(
      `SELECT * FROM refuelings 
       WHERE (date < ? OR (date = ? AND id < ?))
       ORDER BY date DESC, mileage DESC, id DESC 
       LIMIT 1`,
      [oldestRefueling.date, oldestRefueling.date, oldestRefueling.id]
    );

    const startMileage = priorRefueling ? priorRefueling.mileage : oldestRefueling.mileage;
    const rawDistance = latestRefueling.mileage - startMileage;
    const period_distance = rawDistance > 0 ? Number(rawDistance.toFixed(2)) : 0;

    let average_fuel_consumption: number | null = null;
    let average_price_per_km: number | null = null;

    if (period_distance > 0) {
      average_fuel_consumption = Number(((total_liters / period_distance) * 100).toFixed(2));
      average_price_per_km = Number((total_cost / period_distance).toFixed(2));
    }

    res.status(200).json({
      period,
      total_refuelings,
      total_liters,
      total_cost,
      average_price_per_liter,
      period_distance,
      average_fuel_consumption,
      average_price_per_km
    });
  } catch (error) {
    next(error);
  }
}

export async function getCalendarStatsController(
  req: Request<{}, {}, {}, { year?: string; month?: string; week?: string }>,
  res: Response<CalendarStatsResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { year, month, week } = req.query;
    const dateRange = getCalendarDateRange(year, month, week);

    const db = await getDatabase();

    const periodRefuelings = await db.all<Refueling[]>(
      `SELECT * FROM refuelings 
       WHERE date >= ? AND date <= ?
       ORDER BY date ASC, mileage ASC, id ASC`,
      [dateRange.isoStartDate, dateRange.isoEndDate]
    );

    const parsedYear = parseInt(year!, 10);
    const parsedMonth = month !== undefined ? parseInt(month, 10) : null;
    const parsedWeek = week !== undefined ? parseInt(week, 10) : null;

    const total_refuelings = periodRefuelings.length;

    if (total_refuelings === 0) {
      res.status(200).json({
        year: parsedYear,
        month: parsedMonth,
        week: parsedWeek,
        description: dateRange.description,
        start_date: dateRange.isoStartDate,
        end_date: dateRange.isoEndDate,
        total_refuelings: 0,
        total_liters: 0,
        total_cost: 0,
        average_price_per_liter: 0,
        period_distance: 0,
        average_fuel_consumption: null,
        average_price_per_km: null
      });
      return;
    }

    const totalLitersRaw = periodRefuelings.reduce((acc, curr) => acc + curr.liters, 0);
    const totalCostRaw = periodRefuelings.reduce((acc, curr) => acc + curr.cost, 0);

    const total_liters = Number(totalLitersRaw.toFixed(2));
    const total_cost = Number(totalCostRaw.toFixed(2));

    const average_price_per_liter = total_liters > 0
      ? Number((total_cost / total_liters).toFixed(2))
      : 0;

    const latestRefueling = periodRefuelings[periodRefuelings.length - 1];
    const oldestRefueling = periodRefuelings[0];

    const priorRefueling = await db.get<Refueling>(
      `SELECT * FROM refuelings 
       WHERE (date < ? OR (date = ? AND id < ?))
       ORDER BY date DESC, mileage DESC, id DESC 
       LIMIT 1`,
      [oldestRefueling.date, oldestRefueling.date, oldestRefueling.id]
    );

    const startMileage = priorRefueling ? priorRefueling.mileage : oldestRefueling.mileage;
    const rawDistance = latestRefueling.mileage - startMileage;
    const period_distance = rawDistance > 0 ? Number(rawDistance.toFixed(2)) : 0;

    let average_fuel_consumption: number | null = null;
    let average_price_per_km: number | null = null;

    if (period_distance > 0) {
      average_fuel_consumption = Number(((total_liters / period_distance) * 100).toFixed(2));
      average_price_per_km = Number((total_cost / period_distance).toFixed(2));
    }

    res.status(200).json({
      year: parsedYear,
      month: parsedMonth,
      week: parsedWeek,
      description: dateRange.description,
      start_date: dateRange.isoStartDate,
      end_date: dateRange.isoEndDate,
      total_refuelings,
      total_liters,
      total_cost,
      average_price_per_liter,
      period_distance,
      average_fuel_consumption,
      average_price_per_km
    });
  } catch (error) {
    next(error);
  }
}


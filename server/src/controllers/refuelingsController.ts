import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db.js';
import { Refueling, CreateRefuelingDTO, UpdateRefuelingDTO, RefuelingWithStats } from '../types/refueling.js';
import { calculateRefuelingStats } from '../utils/calculations.js';
import { getCalendarDateRange } from '../utils/calendarUtils.js';
import { AppError } from '../middleware/errorHandler.js';
import { organizeRefuelingPhotos, removePhotoFile, extractOriginalFilename } from '../utils/fileOrganizer.js';

async function filterUniquePhotos(
  db: any,
  receiptUrl?: string | null,
  dashboardUrl?: string | null,
  excludeId?: number
): Promise<{ receipt_image_url: string | null; dashboard_image_url: string | null }> {
  let effectiveReceiptUrl = receiptUrl || null;
  let effectiveDashboardUrl = dashboardUrl || null;

  const isDuplicateInDb = async (url: string): Promise<boolean> => {
    const filename = extractOriginalFilename(path.basename(url));
    const query = `
      SELECT id, date, receipt_image_url, dashboard_image_url
      FROM refuelings
      WHERE (
        receipt_image_url LIKE ? OR receipt_image_url LIKE ? OR
        dashboard_image_url LIKE ? OR dashboard_image_url LIKE ?
      )
      ${excludeId ? 'AND id != ?' : ''}
      LIMIT 1
    `;
    const params = [
      `%/${filename}`,
      `%___${filename}`,
      `%/${filename}`,
      `%___${filename}`,
      ...(excludeId ? [excludeId] : [])
    ];

    const match = await db.get<Refueling>(query, params);
    if (match) {
      const matchDate = new Date(match.date).toISOString().split('T')[0];
      console.warn(`[PHOTO DUPLICATE] ⚠️ Zdjęcie "${filename}" zostało pominięte (już wykorzystane w tankowaniu z ${matchDate}, ID: ${match.id}).`);
      return true;
    }
    return false;
  };

  if (effectiveReceiptUrl && await isDuplicateInDb(effectiveReceiptUrl)) {
    effectiveReceiptUrl = null;
  }

  if (effectiveDashboardUrl && await isDuplicateInDb(effectiveDashboardUrl)) {
    effectiveDashboardUrl = null;
  }

  // Sprawdzenie czy oba zdjęcia w tym samym wpisie nie są identyczne
  if (effectiveReceiptUrl && effectiveDashboardUrl) {
    const f1 = extractOriginalFilename(path.basename(effectiveReceiptUrl));
    const f2 = extractOriginalFilename(path.basename(effectiveDashboardUrl));
    if (f1 === f2) {
      console.warn(`[PHOTO DUPLICATE] ⚠️ Zdjęcie 2 ("${f2}") zostało pominięte (identyczne jak zdjęcie 1).`);
      effectiveDashboardUrl = null;
    }
  }

  return {
    receipt_image_url: effectiveReceiptUrl,
    dashboard_image_url: effectiveDashboardUrl
  };
}

export async function createRefueling(
  req: Request<{}, {}, CreateRefuelingDTO>,
  res: Response<RefuelingWithStats>,
  next: NextFunction
): Promise<void> {
  try {
    const { date, cost, liters, price_per_liter, mileage, receipt_image_url, dashboard_image_url } = req.body;

    if (!date || cost === undefined || liters === undefined || mileage === undefined) {
      throw new AppError('Wszystkie wymagane pola (date, cost, liters, mileage) muszą być podane.', 400);
    }

    if (isNaN(new Date(date).getTime())) {
      throw new AppError('Pole date musi być prawidłową datą w formacie ISO (np. 2026-07-23T10:00:00Z).', 400);
    }

    if (cost <= 0 || liters <= 0 || mileage < 0) {
      throw new AppError('Wartości cost i liters muszą być większe od 0, a mileage nie może być ujemny.', 400);
    }

    const db = await getDatabase();

    // Filtrowanie duplikatów zdjęć - pomijamy zdjęcia, które już zostały użyte w innych tankowaniach
    const filteredPhotos = await filterUniquePhotos(db, receipt_image_url, dashboard_image_url);

    const calculatedPricePerLiter = price_per_liter && price_per_liter > 0
      ? price_per_liter
      : Number((cost / liters).toFixed(3));

    // Przeniesienie plików zdjęć z tymczasowego /uploads/ do dedykowanego podkatalogu w inputs/YYYY-MM-DD_N/
    const photoResult = organizeRefuelingPhotos(date, filteredPhotos.receipt_image_url, filteredPhotos.dashboard_image_url);

    const result = await db.run(
      `INSERT INTO refuelings (date, cost, liters, price_per_liter, mileage, receipt_image_url, dashboard_image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        date,
        cost,
        liters,
        calculatedPricePerLiter,
        mileage,
        photoResult.receipt_image_url,
        photoResult.dashboard_image_url
      ]
    );

    const createdId = result.lastID;
    if (!createdId) {
      throw new AppError('Nie udało się utworzyć rekordu tankowania.', 500);
    }

    const newRefueling = await db.get<Refueling>('SELECT * FROM refuelings WHERE id = ?', [createdId]);
    if (!newRefueling) {
      throw new AppError('Nie znaleziono utworzonego rekordu.', 500);
    }

    // Pobranie poprzedniego rekordu na podstawie daty i przebiegu
    const previousRefueling = await db.get<Refueling>(
      `SELECT * FROM refuelings 
       WHERE (date < ? OR (date = ? AND id < ?))
       ORDER BY date DESC, mileage DESC, id DESC 
       LIMIT 1`,
      [newRefueling.date, newRefueling.date, newRefueling.id]
    );

    const stats = calculateRefuelingStats(newRefueling, previousRefueling || null);

    res.status(201).json({
      ...newRefueling,
      stats
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllRefuelings(
  req: Request<{}, {}, {}, { period?: string }>,
  res: Response<RefuelingWithStats[]>,
  next: NextFunction
): Promise<void> {
  try {
    const rawPeriod = (req.query.period || 'all').toLowerCase();

    if (!['week', 'month', 'year', 'all'].includes(rawPeriod)) {
      throw new AppError('Nieprawidłowy parametr period. Dozwolone wartości to: week, month, year, all.', 400);
    }

    const db = await getDatabase();

    // Pobieramy wszystkie tankowania posortowane po dacie malejąco (ORDER BY date DESC)
    const allRefuelings = await db.all<Refueling[]>(
      'SELECT * FROM refuelings ORDER BY date DESC, mileage DESC, id DESC'
    );

    // Aby prawidłowo powiązać wpisy z ich historycznymi poprzednikami, odwracamy kolejność na chronologiczną (ASC)
    const ascRefuelings = [...allRefuelings].reverse();

    const withStatsMap = new Map<number, RefuelingWithStats>();
    for (let i = 0; i < ascRefuelings.length; i++) {
      const current = ascRefuelings[i];
      const previous = i > 0 ? ascRefuelings[i - 1] : null;
      const stats = calculateRefuelingStats(current, previous);
      withStatsMap.set(current.id, { ...current, stats });
    }

    let result: RefuelingWithStats[] = allRefuelings.map(r => withStatsMap.get(r.id)!);

    // Filtrowanie według wybranego okresu czasu
    if (rawPeriod !== 'all') {
      const now = Date.now();
      let msThreshold = 0;

      if (rawPeriod === 'week') {
        msThreshold = 7 * 24 * 60 * 60 * 1000;
      } else if (rawPeriod === 'month') {
        msThreshold = 30 * 24 * 60 * 60 * 1000;
      } else if (rawPeriod === 'year') {
        msThreshold = 365 * 24 * 60 * 60 * 1000;
      }

      const thresholdTime = now - msThreshold;

      result = result.filter(r => {
        const itemTime = new Date(r.date).getTime();
        return !isNaN(itemTime) && itemTime >= thresholdTime;
      });
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getRefuelingById(
  req: Request<{ id: string }>,
  res: Response<RefuelingWithStats>,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError('Nieprawidłowy identyfikator ID.', 400);
    }

    const db = await getDatabase();
    const refueling = await db.get<Refueling>('SELECT * FROM refuelings WHERE id = ?', [id]);

    if (!refueling) {
      throw new AppError(`Nie znaleziono tankowania o ID ${id}.`, 404);
    }

    const previousRefueling = await db.get<Refueling>(
      `SELECT * FROM refuelings 
       WHERE (date < ? OR (date = ? AND id < ?))
       ORDER BY date DESC, mileage DESC, id DESC 
       LIMIT 1`,
      [refueling.date, refueling.date, refueling.id]
    );

    const stats = calculateRefuelingStats(refueling, previousRefueling || null);

    res.status(200).json({
      ...refueling,
      stats
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRefueling(
  req: Request<{ id: string }, {}, UpdateRefuelingDTO>,
  res: Response<RefuelingWithStats>,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError('Nieprawidłowy identyfikator ID.', 400);
    }

    const db = await getDatabase();
    const existing = await db.get<Refueling>('SELECT * FROM refuelings WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError(`Nie znaleziono tankowania o ID ${id}.`, 404);
    }

    const { date, cost, liters, price_per_liter, mileage, receipt_image_url, dashboard_image_url } = req.body;

    const newDate = date ?? existing.date;
    const newCost = cost !== undefined ? cost : existing.cost;
    const newLiters = liters !== undefined ? liters : existing.liters;
    const newMileage = mileage !== undefined ? mileage : existing.mileage;

    if (date && isNaN(new Date(date).getTime())) {
      throw new AppError('Pole date musi być prawidłową datą w formacie ISO.', 400);
    }
    if (newCost <= 0 || newLiters <= 0 || newMileage < 0) {
      throw new AppError('Wartości cost i liters muszą być większe od 0, a mileage nie może być ujemne.', 400);
    }

    const targetReceiptUrl = receipt_image_url !== undefined ? receipt_image_url : existing.receipt_image_url;
    const targetDashboardUrl = dashboard_image_url !== undefined ? dashboard_image_url : existing.dashboard_image_url;

    // Filtrowanie duplikatów zdjęć (z wyłączeniem obecnego wpisu)
    const filteredPhotos = await filterUniquePhotos(db, targetReceiptUrl, targetDashboardUrl, id);

    // Wyciągamy istniejący subfolder z istniejących URLi (np. /inputs/2026-08-06_1/...)
    let existingSubfolder: string | null = null;
    const sampleUrl = existing.receipt_image_url || existing.dashboard_image_url;
    if (sampleUrl && sampleUrl.startsWith('/inputs/')) {
      const parts = sampleUrl.split('/');
      if (parts[2]) existingSubfolder = parts[2];
    }

    const photoResult = organizeRefuelingPhotos(
      newDate,
      filteredPhotos.receipt_image_url,
      filteredPhotos.dashboard_image_url,
      existingSubfolder
    );

    const newPricePerLiter = price_per_liter !== undefined
      ? price_per_liter
      : Number((newCost / newLiters).toFixed(3));

    await db.run(
      `UPDATE refuelings 
       SET date = ?, cost = ?, liters = ?, price_per_liter = ?, mileage = ?, receipt_image_url = ?, dashboard_image_url = ?
       WHERE id = ?`,
      [newDate, newCost, newLiters, newPricePerLiter, newMileage, photoResult.receipt_image_url, photoResult.dashboard_image_url, id]
    );

    const updated = await db.get<Refueling>('SELECT * FROM refuelings WHERE id = ?', [id]);
    if (!updated) {
      throw new AppError('Błąd podczas pobierania zaktualizowanego rekordu.', 500);
    }

    const previousRefueling = await db.get<Refueling>(
      `SELECT * FROM refuelings 
       WHERE (date < ? OR (date = ? AND id < ?))
       ORDER BY date DESC, mileage DESC, id DESC 
       LIMIT 1`,
      [updated.date, updated.date, updated.id]
    );

    const stats = calculateRefuelingStats(updated, previousRefueling || null);

    res.status(200).json({
      ...updated,
      stats
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteRefueling(
  req: Request<{ id: string }>,
  res: Response<{ message: string; id: number }>,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError('Nieprawidłowy identyfikator ID.', 400);
    }

    const db = await getDatabase();
    const existing = await db.get<Refueling>('SELECT * FROM refuelings WHERE id = ?', [id]);

    if (!existing) {
      throw new AppError(`Nie znaleziono tankowania o ID ${id}.`, 404);
    }

    // Usunięcie powiązanych plików zdjęć z dysku
    try {
      removePhotoFile(existing.receipt_image_url);
    } catch (_) {}
    try {
      removePhotoFile(existing.dashboard_image_url);
    } catch (_) {}

    // Usunięcie całego podfolderu tankowania z inputs/ jeśli jeszcze istnieje
    const sampleUrl = existing.receipt_image_url || existing.dashboard_image_url;
    if (sampleUrl && sampleUrl.startsWith('/inputs/')) {
      const parts = sampleUrl.split('/');
      if (parts[2]) {
        const folderPath = path.resolve(process.cwd(), 'inputs', parts[2]);
        try {
          if (fs.existsSync(folderPath)) {
            fs.rmSync(folderPath, { recursive: true, force: true });
            console.log(`[FILE ORGANIZER] 🗑️ Usunięto podfolder tankowania przy usuwaniu z bazy: ${folderPath}`);
          }
        } catch (folderErr) {
          console.error('[FILE ORGANIZER Error] Błąd podczas czyszczenia podfolderu:', folderErr);
        }
      }
    }

    await db.run('DELETE FROM refuelings WHERE id = ?', [id]);

    res.status(200).json({
      message: `Tankowanie o ID ${id} zostało pomyślnie usunięte.`,
      id
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteRefuelingPhotoController(
  req: Request<{ id: string; type: string }>,
  res: Response<RefuelingWithStats>,
  next: NextFunction
): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const photoType = req.params.type;

    if (isNaN(id)) {
      throw new AppError('Nieprawidłowe ID tankowania.', 400);
    }

    const db = await getDatabase();
    const existing = await db.get<Refueling>('SELECT * FROM refuelings WHERE id = ?', [id]);
    if (!existing) {
      throw new AppError(`Nie znaleziono tankowania o ID ${id}.`, 404);
    }

    if (photoType === 'receipt') {
      if (existing.receipt_image_url) {
        removePhotoFile(existing.receipt_image_url);
      }
      await db.run('UPDATE refuelings SET receipt_image_url = NULL WHERE id = ?', [id]);
    } else if (photoType === 'dashboard') {
      if (existing.dashboard_image_url) {
        removePhotoFile(existing.dashboard_image_url);
      }
      await db.run('UPDATE refuelings SET dashboard_image_url = NULL WHERE id = ?', [id]);
    } else {
      throw new AppError('Nieprawidłowy typ zdjęcia (dozwolone: receipt, dashboard).', 400);
    }

    const updated = await db.get<Refueling>('SELECT * FROM refuelings WHERE id = ?', [id]);
    const previousRefueling = await db.get<Refueling>(
      `SELECT * FROM refuelings 
       WHERE (date < ? OR (date = ? AND id < ?))
       ORDER BY date DESC, mileage DESC, id DESC 
       LIMIT 1`,
      [updated!.date, updated!.date, updated!.id]
    );

    const stats = calculateRefuelingStats(updated!, previousRefueling || null);

    res.status(200).json({
      ...updated!,
      stats
    });
  } catch (error) {
    next(error);
  }
}

export async function getCalendarRefuelings(
  req: Request<{}, {}, {}, { year?: string; month?: string; week?: string }>,
  res: Response<RefuelingWithStats[]>,
  next: NextFunction
): Promise<void> {
  try {
    const { year, month, week } = req.query;
    const dateRange = getCalendarDateRange(year, month, week);

    const db = await getDatabase();

    const allRefuelings = await db.all<Refueling[]>(
      'SELECT * FROM refuelings ORDER BY date DESC, mileage DESC, id DESC'
    );

    const ascRefuelings = [...allRefuelings].reverse();
    const withStatsMap = new Map<number, RefuelingWithStats>();

    for (let i = 0; i < ascRefuelings.length; i++) {
      const current = ascRefuelings[i];
      const previous = i > 0 ? ascRefuelings[i - 1] : null;
      const stats = calculateRefuelingStats(current, previous);
      withStatsMap.set(current.id, { ...current, stats });
    }

    const startTime = dateRange.startDate.getTime();
    const endTime = dateRange.endDate.getTime();

    const filtered = allRefuelings.filter(r => {
      const itemTime = new Date(r.date).getTime();
      return !isNaN(itemTime) && itemTime >= startTime && itemTime <= endTime;
    });

    const result: RefuelingWithStats[] = filtered.map(r => withStatsMap.get(r.id)!);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}


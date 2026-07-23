import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db.js';

export interface CarResponse {
  name: string;
  latest_mileage: number | null;
}

export async function getCarController(
  _req: Request,
  res: Response<CarResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const db = await getDatabase();
    const setting = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['car_name']);
    const carName = setting ? setting.value : 'Mój Samochód';

    const latestRefueling = await db.get<{ mileage: number }>(
      'SELECT mileage FROM refuelings ORDER BY date DESC, mileage DESC, id DESC LIMIT 1'
    );

    res.status(200).json({
      name: carName,
      latest_mileage: latestRefueling ? latestRefueling.mileage : null
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCarController(
  req: Request<{}, {}, { name?: string }>,
  res: Response<CarResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { name } = req.body;
    const db = await getDatabase();

    if (name && typeof name === 'string' && name.trim().length > 0) {
      await db.run(
        `INSERT INTO settings (key, value) VALUES ('car_name', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [name.trim()]
      );
    }

    const setting = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['car_name']);
    const carName = setting ? setting.value : 'Mój Samochód';

    const latestRefueling = await db.get<{ mileage: number }>(
      'SELECT mileage FROM refuelings ORDER BY date DESC, mileage DESC, id DESC LIMIT 1'
    );

    res.status(200).json({
      name: carName,
      latest_mileage: latestRefueling ? latestRefueling.mileage : null
    });
  } catch (error) {
    next(error);
  }
}

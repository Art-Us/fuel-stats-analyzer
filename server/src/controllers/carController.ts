import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../db.js';

export interface CarResponse {
  name: string;
  latest_mileage: number | null;
  gemini_api_key?: string | null;
}

export async function getCarController(
  _req: Request,
  res: Response<CarResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const db = await getDatabase();
    const nameSetting = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['car_name']);
    const carName = nameSetting ? nameSetting.value : 'Mój Samochód';

    const apiKeySetting = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['gemini_api_key']);
    const geminiApiKey = apiKeySetting ? apiKeySetting.value : '';

    const latestRefueling = await db.get<{ mileage: number }>(
      'SELECT mileage FROM refuelings ORDER BY date DESC, mileage DESC, id DESC LIMIT 1'
    );

    res.status(200).json({
      name: carName,
      latest_mileage: latestRefueling ? latestRefueling.mileage : null,
      gemini_api_key: geminiApiKey || ''
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCarController(
  req: Request<{}, {}, { name?: string; gemini_api_key?: string }>,
  res: Response<CarResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { name, gemini_api_key } = req.body;
    const db = await getDatabase();

    if (name !== undefined && typeof name === 'string' && name.trim().length > 0) {
      await db.run(
        `INSERT INTO settings (key, value) VALUES ('car_name', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [name.trim()]
      );
    }

    if (gemini_api_key !== undefined) {
      const cleanKey = typeof gemini_api_key === 'string' ? gemini_api_key.trim() : '';
      await db.run(
        `INSERT INTO settings (key, value) VALUES ('gemini_api_key', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [cleanKey]
      );
    }

    const nameSetting = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['car_name']);
    const carName = nameSetting ? nameSetting.value : 'Mój Samochód';

    const apiKeySetting = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['gemini_api_key']);
    const savedApiKey = apiKeySetting ? apiKeySetting.value : '';

    const latestRefueling = await db.get<{ mileage: number }>(
      'SELECT mileage FROM refuelings ORDER BY date DESC, mileage DESC, id DESC LIMIT 1'
    );

    res.status(200).json({
      name: carName,
      latest_mileage: latestRefueling ? latestRefueling.mileage : null,
      gemini_api_key: savedApiKey || ''
    });
  } catch (error) {
    next(error);
  }
}

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import refuelingsRouter from '../src/routes/refuelings.js';
import statsRouter from '../src/routes/stats.js';
import carRouter from '../src/routes/car.js';
import backupRouter from '../src/routes/backup.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { getDatabase } from '../src/db.js';
import { removePhotoFile } from '../src/utils/fileOrganizer.js';

const app = express();
app.use(express.json());
app.use('/api/refuelings', refuelingsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/car', carRouter);
app.use('/api/backup', backupRouter);
app.use(errorHandler);

describe('API Refuelings & Stats Endpoints', () => {
  const createdRefuelingIds: number[] = [];
  const createdPhotoUrls: string[] = [];

  const trackCreated = (body: any) => {
    if (body?.id) createdRefuelingIds.push(body.id);
    if (body?.receipt_image_url) createdPhotoUrls.push(body.receipt_image_url);
    if (body?.dashboard_image_url) createdPhotoUrls.push(body.dashboard_image_url);
  };

  beforeAll(async () => {
    // Upewniamy się, że baza danych SQLite jest gotowa
    await getDatabase();
  });

  afterAll(async () => {
    // Usuwamy wszystkie dane dodane w trakcie testów
    const db = await getDatabase();
    if (createdRefuelingIds.length > 0) {
      const placeholders = createdRefuelingIds.map(() => '?').join(',');
      await db.run(`DELETE FROM refuelings WHERE id IN (${placeholders})`, ...createdRefuelingIds);
    }
    for (const url of createdPhotoUrls) {
      removePhotoFile(url);
    }
  });

  it('GET /api/refuelings powinien zwrócić status 200 oraz tablicę', async () => {
    const res = await request(app).get('/api/refuelings');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/refuelings powinien utworzyć wpis i wyliczyć statystyki', async () => {
    const newRefueling = {
      date: new Date().toISOString(),
      cost: 200.00,
      liters: 30.00,
      mileage: 200000
    };

    const res = await request(app)
      .post('/api/refuelings')
      .send(newRefueling);

    trackCreated(res.body);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.cost).toBe(200.00);
    expect(res.body.liters).toBe(30.00);
    expect(res.body.price_per_liter).toBe(6.667);
    expect(res.body.stats).toBeDefined();
  });

  it('GET /api/refuelings?period=month powinien zwrócić przefiltrowaną listę', async () => {
    const res = await request(app).get('/api/refuelings?period=month');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/refuelings z błędnym parametrem period powinien zwrócić błąd 400', async () => {
    const res = await request(app).get('/api/refuelings?period=invalid_period');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Nieprawidłowy parametr period');
  });

  it('GET /api/stats?period=week powinien zwrócić poprawne podsumowanie dla tygodnia', async () => {
    const res = await request(app).get('/api/stats?period=week');
    expect(res.status).toBe(200);
    expect(res.body.period).toBe('week');
  });

  it('GET /api/stats?period=all powinien zwrócić poprawne podsumowanie', async () => {
    const res = await request(app).get('/api/stats?period=all');
    expect(res.status).toBe(200);
    expect(res.body.period).toBe('all');
    expect(res.body.total_refuelings).toBeGreaterThan(0);
    expect(res.body.total_cost).toBeGreaterThan(0);
    expect(res.body.total_liters).toBeGreaterThan(0);
  });

  it('GET /api/refuelings/calendar?year=2026&month=7 powinien zwrócić tankowania z lipca 2026', async () => {
    const res = await request(app).get('/api/refuelings/calendar?year=2026&month=7');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/stats/calendar?year=2026&month=7 powinien zwrócić statystyki z lipca 2026', async () => {
    const res = await request(app).get('/api/stats/calendar?year=2026&month=7');
    expect(res.status).toBe(200);
    expect(res.body.year).toBe(2026);
    expect(res.body.month).toBe(7);
    expect(res.body.description).toBeDefined();
  });

  it('GET /api/stats/calendar?year=2021&month=5&week=1 powinien obsłużyć 1. tydzień maja 2021', async () => {
    const res = await request(app).get('/api/stats/calendar?year=2021&month=5&week=1');
    expect(res.status).toBe(200);
    expect(res.body.year).toBe(2021);
    expect(res.body.month).toBe(5);
    expect(res.body.week).toBe(1);
    expect(res.body.description).toContain('Tydzień 1 miesiąca 5/2021');
  });

  it('GET /api/stats/calendar?year=2022&month=1 powinien obsłużyć cały styczeń 2022', async () => {
    const res = await request(app).get('/api/stats/calendar?year=2022&month=1');
    expect(res.status).toBe(200);
    expect(res.body.year).toBe(2022);
    expect(res.body.month).toBe(1);
    expect(res.body.description).toContain('Miesiąc 1/2022');
  });

  it('GET /api/stats/calendar?year=2024 powinien obsłużyć cały rok 2024', async () => {
    const res = await request(app).get('/api/stats/calendar?year=2024');
    expect(res.status).toBe(200);
    expect(res.body.year).toBe(2024);
    expect(res.body.month).toBeNull();
    expect(res.body.description).toContain('Rok 2024');
  });

  it('GET /api/stats z nieprawidłowym okresem powinien zwrócić błąd 400', async () => {
    const res = await request(app).get('/api/stats?period=invalid_period');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Nieprawidłowy parametr period');
  });

  it('POST /api/refuelings powinien pominąć drugie identyczne zdjęcie w jednym tankowaniu', async () => {
    const res = await request(app)
      .post('/api/refuelings')
      .send({
        date: new Date().toISOString(),
        cost: 150,
        liters: 25,
        mileage: 210000,
        receipt_image_url: '/inputs/temp/1723400000___paragon_unique_1.jpg',
        dashboard_image_url: '/inputs/temp/1723400000___paragon_unique_1.jpg'
      });

    trackCreated(res.body);

    expect(res.status).toBe(201);
    expect(res.body.receipt_image_url).toBeDefined();
    expect(res.body.dashboard_image_url).toBeNull();
  });

  it('POST /api/refuelings powinien pominąć zdjęcie, które zostało już wcześniej wykorzystane', async () => {
    const uniquePhotoName = `photo_dup_test_${Date.now()}.jpg`;

    // Pierwsze dodanie - powinno dołączyć zdjęcie
    const res1 = await request(app)
      .post('/api/refuelings')
      .send({
        date: new Date().toISOString(),
        cost: 150,
        liters: 25,
        mileage: 210100,
        receipt_image_url: `/inputs/test_folder/${uniquePhotoName}`
      });

    trackCreated(res1.body);

    expect(res1.status).toBe(201);
    expect(res1.body.receipt_image_url).toContain(uniquePhotoName);

    // Próba dodania drugiego tankowania z tą samą nazwą zdjęcia - tankowanie się zapisze, ale duplikat zdjęcia zostanie pominięty
    const res2 = await request(app)
      .post('/api/refuelings')
      .send({
        date: new Date().toISOString(),
        cost: 160,
        liters: 26,
        mileage: 210600,
        receipt_image_url: `/inputs/other_folder/${uniquePhotoName}`
      });

    trackCreated(res2.body);

    expect(res2.status).toBe(201);
    expect(res2.body.receipt_image_url).toBeNull();
  });

  it('PUT /api/car powinien zaktualizować nazwę samochodu oraz klucz Gemini API', async () => {
    const updateRes = await request(app)
      .put('/api/car')
      .send({
        name: 'Testowa Skoda Octavia',
        gemini_api_key: 'AIzaSy_TEST_KEY_123'
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe('Testowa Skoda Octavia');
    expect(updateRes.body.gemini_api_key).toBe('AIzaSy_TEST_KEY_123');

    const getRes = await request(app).get('/api/car');
    expect(getRes.status).toBe(200);
    expect(getRes.body.name).toBe('Testowa Skoda Octavia');
    expect(getRes.body.gemini_api_key).toBe('AIzaSy_TEST_KEY_123');
  });

  it('GET /api/backup/export powinien wygenerować archiwum ZIP z nagłówkami', async () => {
    const res = await request(app).get('/api/backup/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
    expect(res.headers['content-disposition']).toContain('attachment; filename="fuel_app_backup_');
  });

  it('POST /api/backup/import powinien pomyślnie zaimportować bazę z pliku ZIP', async () => {
    // 1. Pobieramy eksport ZIP
    const exportRes = await request(app)
      .get('/api/backup/export')
      .responseType('blob');

    expect(exportRes.status).toBe(200);

    // 2. Importujemy pobrany plik ZIP
    const importRes = await request(app)
      .post('/api/backup/import')
      .attach('backup', exportRes.body, 'test_backup.zip');

    expect(importRes.status).toBe(200);
    expect(importRes.body.message).toContain('pomyślnie');
  });
});

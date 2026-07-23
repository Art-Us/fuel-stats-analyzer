import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import refuelingsRouter from '../src/routes/refuelings.js';
import statsRouter from '../src/routes/stats.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { getDatabase } from '../src/db.js';

const app = express();
app.use(express.json());
app.use('/api/refuelings', refuelingsRouter);
app.use('/api/stats', statsRouter);
app.use(errorHandler);

describe('API Refuelings & Stats Endpoints', () => {
  beforeAll(async () => {
    // Upewniamy się, że baza danych SQLite jest gotowa
    await getDatabase();
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

  it('GET /api/stats z nieprawidłowym okresem powinien zwrócić błąd 400', async () => {
    const res = await request(app).get('/api/stats?period=invalid_period');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Nieprawidłowy parametr period');
  });
});

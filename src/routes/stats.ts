import { Router } from 'express';
import { getStatsController, getCalendarStatsController } from '../controllers/statsController.js';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     StatsResponse:
 *       type: object
 *       properties:
 *         period:
 *           type: string
 *           enum: [week, month, year, all]
 *           example: "week"
 *         total_refuelings:
 *           type: integer
 *           description: Całkowita liczba tankowań w danym okresie
 *           example: 4
 *         total_liters:
 *           type: number
 *           description: Suma zatankowanych litrów paliwa
 *           example: 120.50
 *         total_cost:
 *           type: number
 *           description: Całkowita kwota wydana na paliwo w danym okresie
 *           example: 780.00
 *         average_price_per_liter:
 *           type: number
 *           description: Średnia cena za 1 litr paliwa
 *           example: 6.47
 *         period_distance:
 *           type: number
 *           description: Całkowity dystans pokonany w danym okresie (km)
 *           example: 1850.00
 *         average_fuel_consumption:
 *           type: number
 *           nullable: true
 *           description: Średnie zużycie paliwa w l/100km w tym okresie
 *           example: 6.51
 *         average_price_per_km:
 *           type: number
 *           nullable: true
 *           description: Średni koszt przejechania 1 km w tym okresie
 *           example: 0.42
 *     CalendarStatsResponse:
 *       type: object
 *       properties:
 *         year:
 *           type: integer
 *           example: 2026
 *         month:
 *           type: integer
 *           nullable: true
 *           example: 5
 *         week:
 *           type: integer
 *           nullable: true
 *           example: 2
 *         description:
 *           type: string
 *           example: "Miesiąc 5/2026 (od 1 do 31)"
 *         start_date:
 *           type: string
 *           format: date-time
 *         end_date:
 *           type: string
 *           format: date-time
 *         total_refuelings:
 *           type: integer
 *           example: 2
 *         total_liters:
 *           type: number
 *           example: 85.00
 *         total_cost:
 *           type: number
 *           example: 550.00
 *         average_price_per_liter:
 *           type: number
 *           example: 6.47
 *         period_distance:
 *           type: number
 *           example: 1300.00
 *         average_fuel_consumption:
 *           type: number
 *           nullable: true
 *           example: 6.54
 *         average_price_per_km:
 *           type: number
 *           nullable: true
 *           example: 0.42
 */

/**
 * @openapi
 * /api/stats:
 *   get:
 *     summary: Pobiera podsumowanie i statystyki tankowań dla wybranego okresu czasu (krocząco od dzisiaj)
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year, all]
 *           default: all
 *         description: Przedział czasowy (week - ostatni tydzień, month - ostatni miesiąc, year - ostatni rok, all - od początku)
 *     responses:
 *       200:
 *         description: Obiekt ze statystykami zbiorczymi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsResponse'
 *       400:
 *         description: Nieprawidłowy parametr query 'period'
 */
router.get('/', getStatsController);

/**
 * @openapi
 * /api/stats/calendar:
 *   get:
 *     summary: Pobiera statystyki dla konkretnego roku, miesiąca lub tygodnia kalendarzowego
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         example: 2026
 *         description: Rok (np. 2026, 2025)
 *       - in: query
 *         name: month
 *         required: false
 *         schema:
 *           type: integer
 *         example: 5
 *         description: Numer miesiąca (1 - 12, np. 5 dla maja)
 *       - in: query
 *         name: week
 *         required: false
 *         schema:
 *           type: integer
 *         example: 2
 *         description: Numer tygodnia w miesiącu (1 - 5)
 *     responses:
 *       200:
 *         description: Obiekt ze statystykami dla wskazanego okresu kalendarzowego
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalendarStatsResponse'
 *       400:
 *         description: Błąd w parametrach kalendarza
 */
router.get('/calendar', getCalendarStatsController);

export default router;

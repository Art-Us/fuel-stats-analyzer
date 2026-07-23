import { Router } from 'express';
import { getStatsController } from '../controllers/statsController.js';

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
 *           enum: [month, year, all]
 *           example: "month"
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
 */

/**
 * @openapi
 * /api/stats:
 *   get:
 *     summary: Pobiera podsumowanie i statystyki tankowań dla wybranego okresu czasu
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [month, year, all]
 *           default: all
 *         description: Przedział czasowy (month - ostatni miesiąc, year - ostatni rok, all - od początku)
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

export default router;

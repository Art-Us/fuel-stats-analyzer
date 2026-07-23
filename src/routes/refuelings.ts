import { Router } from 'express';
import {
  createRefueling,
  getAllRefuelings,
  getRefuelingById,
  updateRefueling,
  deleteRefueling
} from '../controllers/refuelingsController.js';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     RefuelingStats:
 *       type: object
 *       properties:
 *         distance:
 *           type: number
 *           nullable: true
 *           description: Dystans przejechany od poprzedniego tankowania (km)
 *           example: 450.5
 *         fuel_consumption_l_per_100km:
 *           type: number
 *           nullable: true
 *           description: Wyliczone średnie zużycie paliwa w l/100km
 *           example: 6.88
 *         cost_per_km:
 *           type: number
 *           nullable: true
 *           description: Wyliczony koszt przejechania 1 km
 *           example: 0.44
 *     Refueling:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         date:
 *           type: string
 *           format: date-time
 *           example: "2026-07-23T08:30:00Z"
 *         cost:
 *           type: number
 *           example: 200.00
 *         liters:
 *           type: number
 *           example: 31.00
 *         price_per_liter:
 *           type: number
 *           example: 6.45
 *         mileage:
 *           type: number
 *           example: 124500.0
 *         receipt_image_url:
 *           type: string
 *           nullable: true
 *           example: "/uploads/receipt_1.jpg"
 *         dashboard_image_url:
 *           type: string
 *           nullable: true
 *           example: "/uploads/dashboard_1.jpg"
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2026-07-23 08:30:00"
 *         stats:
 *           $ref: '#/components/schemas/RefuelingStats'
 *     CreateRefuelingDTO:
 *       type: object
 *       required:
 *         - date
 *         - cost
 *         - liters
 *         - mileage
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *           example: "2026-07-23T08:30:00Z"
 *         cost:
 *           type: number
 *           example: 200.00
 *         liters:
 *           type: number
 *           example: 31.00
 *         price_per_liter:
 *           type: number
 *           example: 6.45
 *         mileage:
 *           type: number
 *           example: 124500.0
 *         receipt_image_url:
 *           type: string
 *           nullable: true
 *           example: "/uploads/receipt_1.jpg"
 *         dashboard_image_url:
 *           type: string
 *           nullable: true
 *           example: "/uploads/dashboard_1.jpg"
 *     UpdateRefuelingDTO:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date-time
 *         cost:
 *           type: number
 *         liters:
 *           type: number
 *         price_per_liter:
 *           type: number
 *         mileage:
 *           type: number
 *         receipt_image_url:
 *           type: string
 *           nullable: true
 *         dashboard_image_url:
 *           type: string
 *           nullable: true
 */

/**
 * @openapi
 * /api/refuelings:
 *   post:
 *     summary: Dodaje nowy wpis tankowania
 *     tags: [Refuelings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRefuelingDTO'
 *     responses:
 *       201:
 *         description: Wpis pomyślnie dodany wraz z wyliczonymi wskaźnikami
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Refueling'
 *       400:
 *         description: Błąd walidacji danych wejściowych
 *   get:
 *     summary: Pobiera historię tankowań posortowaną po dacie malejąco (z opcjonalnym filtrowaniem po okresie)
 *     tags: [Refuelings]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, year, all]
 *           default: all
 *         description: Filtruje wpisy tankowań za wyznaczony okres czasu (week, month, year, all)
 *     responses:
 *       200:
 *         description: Lista tankowań z wyliczonymi wskaźnikami (dystans, l/100km, koszt/km)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Refueling'
 */
router.post('/', createRefueling);
router.get('/', getAllRefuelings);

/**
 * @openapi
 * /api/refuelings/{id}:
 *   get:
 *     summary: Pobiera szczegóły pojedynczego tankowania
 *     tags: [Refuelings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID tankowania
 *     responses:
 *       200:
 *         description: Szczegóły tankowania
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Refueling'
 *       404:
 *         description: Tankowanie o podanym ID nie istnieje
 *   put:
 *     summary: Aktualizuje wpis tankowania
 *     tags: [Refuelings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRefuelingDTO'
 *     responses:
 *       200:
 *         description: Zaktualizowany rekord
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Refueling'
 *       404:
 *         description: Tankowanie o podanym ID nie istnieje
 *   delete:
 *     summary: Usuwa rekord tankowania
 *     tags: [Refuelings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Komunikat potwierdzający usunięcie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 id:
 *                   type: integer
 *       404:
 *         description: Rekord nie został znaleziony
 */
router.get('/:id', getRefuelingById);
router.put('/:id', updateRefueling);
router.delete('/:id', deleteRefueling);

export default router;

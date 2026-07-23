import { Router } from 'express';
import { getCarController, updateCarController } from '../controllers/carController.js';

const router = Router();

/**
 * @openapi
 * /api/car:
 *   get:
 *     summary: Pobiera dane samochodu (nazwę oraz automatycznie odświeżany przebieg)
 *     tags: [Car]
 *     responses:
 *       200:
 *         description: Obiekt z nazwą i najnowszym przebiegiem samochodu
 *   put:
 *     summary: Aktualizuje nazwę samochodu
 *     tags: [Car]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Toyota Corolla"
 *     responses:
 *       200:
 *         description: Zaktualizowane dane samochodu
 */
router.get('/', getCarController);
router.put('/', updateCarController);

export default router;

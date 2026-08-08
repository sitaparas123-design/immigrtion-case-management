import { Router } from 'express';
import { getPayments, createPayment } from '../controllers/paymentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getPayments);
router.post('/', createPayment);

export default router;

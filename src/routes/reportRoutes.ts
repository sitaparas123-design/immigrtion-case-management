import { Router } from 'express';
import { getReportStats } from '../controllers/reportController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/stats', getReportStats);

export default router;

import { Router } from 'express';
import { getAppointments, createAppointment } from '../controllers/appointmentController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getAppointments);
router.post('/', createAppointment);

export default router;

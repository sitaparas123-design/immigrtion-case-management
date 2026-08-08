import { Router } from 'express';
import { getClients, createClient } from '../controllers/clientController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getClients);
router.post('/', createClient);

export default router;

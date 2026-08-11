import { Router } from 'express';
import { getClients, createClient } from '../controllers/clientController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authMiddleware);

// Super Admin & Admin can view client list
router.get('/', roleMiddleware(['superadmin', 'admin', 'writer', 'reviewer']), getClients);

// ONLY Admin can create clients. Super Admin receives 403 Forbidden!
router.post('/', roleMiddleware(['admin']), createClient);

export default router;

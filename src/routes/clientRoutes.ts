import { Router } from 'express';
import { getClients, createClient, updateClient, deleteClient } from '../controllers/clientController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authMiddleware);

// Super Admin & Admin can view client list
router.get('/', roleMiddleware(['superadmin', 'admin', 'writer', 'reviewer', 'client']), getClients);

// Super Admin & Admin can create clients
router.post('/', roleMiddleware(['superadmin', 'admin']), createClient);

// Super Admin & Admin can edit client profile details
router.put('/:id', roleMiddleware(['superadmin', 'admin']), updateClient);

// Super Admin & Admin can clear/delete client profiles
router.delete('/:id', roleMiddleware(['superadmin', 'admin']), deleteClient);

export default router;

import { Router } from 'express';
import { getAdmins, createAdmin, updateAdmin, toggleAdminStatus } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = Router();

// Protect all /api/users endpoints for Super Admin ONLY
router.use(authMiddleware);
router.use(roleMiddleware(['superadmin']));

router.get('/', getAdmins);
router.post('/', createAdmin);
router.put('/:id', updateAdmin);
router.patch('/:id/status', toggleAdminStatus);

export default router;

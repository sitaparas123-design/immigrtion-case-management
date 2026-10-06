import { Router } from 'express';
import { getAdmins, createAdmin, updateAdmin, toggleAdminStatus } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = Router();

// Protect all /api/users endpoints
router.use(authMiddleware);

router.get('/', roleMiddleware(['superadmin', 'admin', 'writer', 'reviewer']), getAdmins);
router.post('/', roleMiddleware(['superadmin', 'admin']), createAdmin);
router.put('/:id', roleMiddleware(['superadmin', 'admin']), updateAdmin);
router.patch('/:id/status', roleMiddleware(['superadmin', 'admin']), toggleAdminStatus);

export default router;

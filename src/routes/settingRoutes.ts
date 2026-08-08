import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getSettings);
router.patch('/', updateSettings);

export default router;

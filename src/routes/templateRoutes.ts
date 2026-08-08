import { Router } from 'express';
import { getTemplates } from '../controllers/templateController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getTemplates);

export default router;

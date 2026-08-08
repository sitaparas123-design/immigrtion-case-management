import { Router } from 'express';
import { draftLegalText } from '../controllers/aiController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Apply auth middleware to protect AI routes
router.use(authMiddleware);

// POST /api/ai/draft - Generate legal text or audit
router.post('/draft', draftLegalText);

export default router;

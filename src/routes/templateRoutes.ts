import { Router } from 'express';
import { getTemplates, createTemplate, deleteTemplate, applyTemplateToCase } from '../controllers/templateController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getTemplates);
router.post('/', createTemplate);
router.delete('/:id', deleteTemplate);
router.post('/:id/apply', applyTemplateToCase);

export default router;

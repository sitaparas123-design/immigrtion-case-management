import { Router } from 'express';
import { getCases, getMyCase, createCase, updateStage, createRecommender } from '../controllers/caseController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/my-case', getMyCase);   // Client: get own case by JWT email
router.get('/', getCases);
router.post('/', createCase);
router.patch('/:caseNumber/stage', updateStage);
router.post('/:caseId/recommenders', createRecommender);

export default router;

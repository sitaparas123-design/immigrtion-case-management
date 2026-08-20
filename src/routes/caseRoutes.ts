import { Router } from 'express';
import { getCases, getMyCase, createCase, updateStage, createRecommender, intakeCase } from '../controllers/caseController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/my-case', getMyCase);   // Client: get own case by JWT email
router.get('/', roleMiddleware(['superadmin', 'admin', 'writer', 'reviewer']), getCases);
router.post('/', roleMiddleware(['superadmin', 'admin']), createCase);
router.post('/intake', roleMiddleware(['superadmin', 'admin']), intakeCase);
router.patch('/:caseNumber/stage', roleMiddleware(['superadmin', 'admin', 'writer', 'reviewer']), updateStage);
router.post('/:caseId/recommenders', roleMiddleware(['superadmin', 'admin', 'writer', 'reviewer']), createRecommender);

export default router;

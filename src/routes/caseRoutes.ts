import { Router } from 'express';
import { 
  getCases, 
  getMyCase, 
  getCaseById,
  createCase, 
  intakeCase,
  updateCase,
  updateStage, 
  deleteCase,
  createRecommender 
} from '../controllers/caseController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/my-case', getMyCase);   // Client: get own case by JWT email
router.get('/', roleMiddleware(['superadmin', 'admin', 'writer', 'reviewer', 'client']), getCases);
router.get('/:id', roleMiddleware(['superadmin', 'admin', 'writer', 'reviewer', 'client']), getCaseById);
router.post('/', roleMiddleware(['superadmin', 'admin']), createCase);
router.post('/intake', roleMiddleware(['superadmin', 'admin']), intakeCase);
router.put('/:id', roleMiddleware(['superadmin', 'admin', 'writer']), updateCase);
router.patch('/:id', roleMiddleware(['superadmin', 'admin', 'writer']), updateCase);
router.patch('/:caseNumber/stage', roleMiddleware(['superadmin', 'admin', 'writer', 'reviewer']), updateStage);
router.delete('/:id', roleMiddleware(['superadmin', 'admin']), deleteCase);
router.post('/:caseId/recommenders', roleMiddleware(['superadmin', 'admin', 'writer', 'reviewer']), createRecommender);

export default router;

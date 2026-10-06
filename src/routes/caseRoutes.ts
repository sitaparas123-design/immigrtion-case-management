import { Router } from 'express';
import { 
  getCases, 
  getMyCase, 
  getCaseById,
  createCase, 
  updateCase,
  updateStage, 
  deleteCase,
  createRecommender 
} from '../controllers/caseController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/my-case', getMyCase);   // Client: get own case by JWT email
router.get('/', getCases);
router.get('/:id', getCaseById);
router.post('/', createCase);
router.put('/:id', updateCase);
router.patch('/:id', updateCase);
router.patch('/:caseNumber/stage', updateStage);
router.delete('/:id', deleteCase);
router.post('/:caseId/recommenders', createRecommender);

export default router;


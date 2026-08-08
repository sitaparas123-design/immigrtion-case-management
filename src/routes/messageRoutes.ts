import { Router } from 'express';
import { getMessages, createMessage } from '../controllers/messageController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getMessages);
router.post('/', createMessage);

export default router;

import { Router } from 'express';
import { login, getMe, refreshToken, forgotPassword, resetPassword, loginAdmin, forgotAdminPassword, resetAdminPassword } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Administrator specific routes
router.post('/admin/login', loginAdmin);
router.post('/admin/forgot-password', forgotAdminPassword);
router.post('/admin/reset-password', resetAdminPassword);

export default router;

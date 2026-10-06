import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { z } from 'zod';
import { ROLE_PERMISSIONS } from '../config/permissions.js';
import { userStatusStore } from './userController.js';
import { generateOtp, verifyOtp, sendOtpEmail } from '../services/emailService.js';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6)
});

const DEFAULT_USERS: Record<string, { name: string; role: string }> = {
  'superadmin@babelglobal.com': { name: 'Super Administrator', role: 'superadmin' },
  'admin@babelglobal.com': { name: 'Case Administrator', role: 'admin' },
  'writer@babelglobal.com': { name: 'Petition Drafter 1', role: 'writer' },
  'reviewer@babelglobal.com': { name: 'Senior Reviewer', role: 'reviewer' },
  'client@babelglobal.com': { name: 'Dr. Alexander Vance', role: 'client' },
};

export const login = async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, error: 'Validation Failed', details: result.error.errors });
  }

  const { email, password } = result.data;

  try {
    let user = await prisma.user.findUnique({ where: { email } });

    // Auto-seed default user if missing
    if (!user && DEFAULT_USERS[email]) {
      const defUser = DEFAULT_USERS[email];
      const hashedPassword = await bcrypt.hash(password || '123456', 10);
      user = await prisma.user.create({
        data: {
          name: defUser.name,
          email,
          password: hashedPassword,
          role: defUser.role
        }
      });
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    let isMatch = await bcrypt.compare(password, user.password);

    // If password mismatch on default user, allow fallback (password123 / admin123) and update hash
    if (!isMatch && DEFAULT_USERS[email] && (password === 'password123' || password === 'admin123')) {
      const newHashed = await bcrypt.hash(password, 10);
      user = await prisma.user.update({
        where: { email },
        data: { password: newHashed }
      });
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Check client profile deactivation status
    if (user.role === 'client') {
      const clientRecord = await prisma.client.findUnique({ where: { email: user.email } });
      if (clientRecord && clientRecord.status === 'Inactive') {
        return res.status(403).json({ success: false, error: 'Your account has been deactivated. Please contact the administrator.' });
      }
    }

    if ((user as any).status === 'Inactive') {
      return res.status(403).json({ success: false, error: 'Your account is deactivated. Please contact Super Administrator.' });
    }

    const permissions = ROLE_PERMISSIONS[user.role.toLowerCase()] || [];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, permissions },
      process.env.JWT_SECRET || 'super-secret-jwt-key-replace-this',
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Authenticated user record not found' });
    }

    return res.json({
      success: true,
      user
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-jwt-key-replace-this', {
      ignoreExpiration: true
    }) as {
      id: string;
      email: string;
      role: string;
    };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const permissions = ROLE_PERMISSIONS[user.role.toLowerCase()] || [];
    const newToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, permissions },
      process.env.JWT_SECRET || 'super-secret-jwt-key-replace-this',
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token: newToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error: any) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email address is required' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    let user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Auto-seed default user if missing
    if (!user && DEFAULT_USERS[cleanEmail]) {
      const defUser = DEFAULT_USERS[cleanEmail];
      const hashedPassword = await bcrypt.hash('123456', 10);
      user = await prisma.user.create({
        data: {
          name: defUser.name,
          email: cleanEmail,
          password: hashedPassword,
          role: defUser.role
        }
      });
    }

    // Auto-link client record if candidate exists
    if (!user) {
      const clientRecord = await prisma.client.findUnique({ where: { email: cleanEmail } });
      if (clientRecord) {
        const hashedPassword = await bcrypt.hash('123456', 10);
        user = await prisma.user.create({
          data: {
            name: clientRecord.name,
            email: cleanEmail,
            password: hashedPassword,
            role: 'client'
          }
        });
      }
    }

    // For candidate demo convenience: if user is not found, auto-create candidate user so OTP flow works seamlessly
    if (!user) {
      const defaultName = cleanEmail.split('@')[0] || 'Candidate User';
      const hashedPassword = await bcrypt.hash('123456', 10);
      user = await prisma.user.create({
        data: {
          name: defaultName,
          email: cleanEmail,
          password: hashedPassword,
          role: 'client'
        }
      });
    }

    const otpCode = generateOtp(cleanEmail);
    const sent = await sendOtpEmail(cleanEmail, otpCode);

    return res.json({
      success: true,
      message: sent
        ? `Password reset OTP verification code sent to ${cleanEmail}. Check your email inbox.`
        : `Password reset OTP generated. Check your email or use test OTP code 123456 (or code: ${otpCode})`,
      otp: otpCode
    });
  } catch (error: any) {
    console.error('[AUTH DEBUG] Error in forgotPassword:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to process password reset request' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, password, otp } = req.body;
  if (!email || !password || !otp) {
    return res.status(400).json({ success: false, error: 'Email, password, and OTP code are required' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    let user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      return res.status(400).json({ success: false, error: 'No account found with this email address' });
    }

    if (!verifyOtp(cleanEmail, otp)) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP verification code' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email: cleanEmail },
      data: { password: passwordHash }
    });

    console.log(`[AUTH DEBUG] Password successfully updated for user: ${cleanEmail}`);
    return res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error: any) {
    console.error('[AUTH DEBUG] Error in resetPassword:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to reset password' });
  }
};

export const loginAdmin = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    let user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Auto-seed default admin user if missing
    if (!user && DEFAULT_USERS[cleanEmail]) {
      const defUser = DEFAULT_USERS[cleanEmail];
      const hashedPassword = await bcrypt.hash(password || 'password123', 10);
      user = await prisma.user.create({
        data: {
          name: defUser.name,
          email: cleanEmail,
          password: hashedPassword,
          role: defUser.role
        }
      });
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const currentRole = user.role.toLowerCase();
    if (currentRole !== 'admin' && currentRole !== 'superadmin') {
      return res.status(403).json({ success: false, error: 'Access denied: Not an administrator' });
    }

    let isMatch = await bcrypt.compare(password, user.password);

    // If password mismatch on default user, allow fallback (123456 / password123 / admin123) and update hash
    if (!isMatch && DEFAULT_USERS[cleanEmail] && (password === '123456' || password === 'password123' || password === 'admin123')) {
      const newHashed = await bcrypt.hash(password, 10);
      user = await prisma.user.update({
        where: { email: cleanEmail },
        data: { password: newHashed }
      });
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const status = userStatusStore[user.id] || (user as any).status || 'Active';
    if (status === 'Inactive') {
      return res.status(403).json({ success: false, error: 'Your administrator account has been deactivated. Please contact the Super Administrator.' });
    }

    const permissions = ROLE_PERMISSIONS[currentRole] || [];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: currentRole, permissions },
      process.env.JWT_SECRET || 'super-secret-jwt-key-replace-this',
      { expiresIn: '24h' }
    );

    console.log(`[AUTH DEBUG] Admin logged in: ${user.email} (${currentRole})`);
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: currentRole
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const forgotAdminPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email address is required' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    let user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Auto-seed default user if missing
    if (!user && DEFAULT_USERS[cleanEmail]) {
      const defUser = DEFAULT_USERS[cleanEmail];
      const hashedPassword = await bcrypt.hash('password123', 10);
      user = await prisma.user.create({
        data: {
          name: defUser.name,
          email: cleanEmail,
          password: hashedPassword,
          role: defUser.role
        }
      });
    }

    const adminRoles = ['admin', 'superadmin', 'writer', 'reviewer'];
    if (!user || !adminRoles.includes(user.role.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'No administrator account found with this email address' });
    }

    const otpCode = generateOtp(cleanEmail);
    const sent = await sendOtpEmail(cleanEmail, otpCode);

    return res.json({
      success: true,
      message: sent
        ? `Admin password reset OTP verification code sent to ${cleanEmail}. Check your email inbox.`
        : `Admin password reset OTP generated. Check your email or use test OTP code 123456 (or code: ${otpCode})`,
      otp: otpCode
    });
  } catch (error: any) {
    console.error('[AUTH DEBUG] Error in forgotAdminPassword:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to process admin password reset request' });
  }
};

export const resetAdminPassword = async (req: Request, res: Response) => {
  const { email, password, otp } = req.body;
  if (!email || !password || !otp) {
    return res.status(400).json({ success: false, error: 'Email, password, and OTP code are required' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    const adminRoles = ['admin', 'superadmin', 'writer', 'reviewer'];
    if (!user || !adminRoles.includes(user.role.toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Administrator account not found' });
    }

    if (!verifyOtp(cleanEmail, otp)) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP verification code' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { email: cleanEmail },
      data: { password: passwordHash }
    });

    console.log(`[AUTH DEBUG] Admin password successfully updated for: ${cleanEmail}`);
    return res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error: any) {
    console.error('[AUTH DEBUG] Error in resetAdminPassword:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to reset admin password' });
  }
};

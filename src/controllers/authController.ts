import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { z } from 'zod';

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
      const hashedPassword = await bcrypt.hash(password || 'password123', 10);
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

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
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

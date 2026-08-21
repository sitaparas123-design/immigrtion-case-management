import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { z } from 'zod';

const createAdminSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'writer', 'reviewer', 'superadmin']).optional().default('admin'),
  status: z.enum(['Active', 'Inactive']).optional().default('Active')
});

const updateAdminSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  password: z.string().min(6).optional().or(z.literal('')),
  role: z.enum(['admin', 'writer', 'reviewer', 'superadmin']).optional(),
  status: z.enum(['Active', 'Inactive']).optional()
});

// In-memory status store for user account activation state if column is omitted from DB schema
export const userStatusStore: Record<string, 'Active' | 'Inactive'> = {};

export const getAdmins = async (req: Request, res: Response) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ['admin', 'writer', 'reviewer', 'superadmin'] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedAdmins = admins.map(admin => ({
      ...admin,
      status: userStatusStore[admin.id] || (admin as any).status || 'Active'
    }));

    return res.json({ success: true, data: formattedAdmins });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createAdmin = async (req: Request, res: Response) => {
  const result = createAdminSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, error: 'Validation Failed', details: result.error.errors });
  }

  const { name, email, password, role, status } = result.data;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'A user with this email address already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'admin'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    userStatusStore[newAdmin.id] = status || 'Active';

    return res.status(201).json({
      success: true,
      data: {
        ...newAdmin,
        status: userStatusStore[newAdmin.id]
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateAdmin = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = updateAdminSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, error: 'Validation Failed', details: result.error.errors });
  }

  const { name, email, password, status } = result.data;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Admin account not found' });
    }

    if (email && email !== user.email) {
      const emailCheck = await prisma.user.findUnique({ where: { email } });
      if (emailCheck) {
        return res.status(409).json({ success: false, error: 'Email is already in use by another account' });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (password && password.trim().length >= 6) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    if (status) {
      userStatusStore[id] = status;
    }

    return res.json({
      success: true,
      data: {
        ...updatedUser,
        status: userStatusStore[id] || 'Active'
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const toggleAdminStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Admin account not found' });
    }

    const currentStatus = userStatusStore[id] || (user as any).status || 'Active';
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    userStatusStore[id] = newStatus;

    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: newStatus,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

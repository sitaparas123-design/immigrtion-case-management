import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/db.js';

export const getTemplates = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templates = await prisma.template.findMany();
    return res.json({ success: true, data: templates });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

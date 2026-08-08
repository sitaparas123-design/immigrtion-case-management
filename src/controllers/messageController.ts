import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/db.js';
import { z } from 'zod';

const createMessageSchema = z.object({
  caseId: z.string(),
  senderName: z.string().min(2),
  senderRole: z.enum(['superadmin', 'admin', 'writer', 'reviewer', 'client']),
  content: z.string().min(1)
});

export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caseId } = req.query;
    const whereClause = caseId ? { caseId: String(caseId) } : {};

    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { timestamp: 'asc' }
    });

    return res.json({ success: true, data: messages });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createMessage = async (req: AuthenticatedRequest, res: Response) => {
  const result = createMessageSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation Failed',
      details: result.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }))
    });
  }

  try {
    const caseItem = await prisma.case.findUnique({ where: { id: result.data.caseId } });
    if (!caseItem) {
      return res.status(404).json({ success: false, error: 'Case folder not found' });
    }

    // Format current local date time string YYYY-MM-DD HH:MM matching types
    const now = new Date();
    const timestampStr = now.toISOString().replace('T', ' ').substring(0, 16);

    const newMessage = await prisma.message.create({
      data: {
        caseId: result.data.caseId,
        senderName: result.data.senderName,
        senderRole: result.data.senderRole,
        content: result.data.content,
        timestamp: timestampStr
      }
    });

    return res.status(201).json({ success: true, data: newMessage });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

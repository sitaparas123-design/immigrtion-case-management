import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/db.js';
import { z } from 'zod';

const createPaymentSchema = z.object({
  caseId: z.string(),
  description: z.string().min(3),
  amount: z.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['Paid', 'Pending', 'Overdue']),
  paidAt: z.string().optional()
});

export const getPayments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caseId } = req.query;
    const whereClause = caseId ? { caseId: String(caseId) } : {};

    const payments = await prisma.payment.findMany({
      where: whereClause,
      orderBy: { dueDate: 'asc' }
    });

    return res.json({ success: true, data: payments });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createPayment = async (req: AuthenticatedRequest, res: Response) => {
  const result = createPaymentSchema.safeParse(req.body);
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

    const newPayment = await prisma.payment.create({
      data: result.data
    });

    return res.status(201).json({ success: true, data: newPayment });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

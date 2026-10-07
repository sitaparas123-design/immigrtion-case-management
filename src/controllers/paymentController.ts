import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/db.js';
import { z } from 'zod';

const createPaymentSchema = z.object({
  caseId: z.string(),
  description: z.string().min(3),
  amount: z.coerce.number().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['Paid', 'Pending', 'Overdue']).default('Pending'),
  paidAt: z.string().optional().nullable()
});

const updatePaymentSchema = z.object({
  description: z.string().min(3).optional(),
  amount: z.coerce.number().positive().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['Paid', 'Pending', 'Overdue']).optional(),
  paidAt: z.string().optional().nullable()
});

export const getPayments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caseId } = req.query;
    const whereClause = caseId ? { caseId: String(caseId) } : {};

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        case: {
          include: {
            client: true
          }
        }
      },
      orderBy: { dueDate: 'desc' }
    });

    const mapped = payments.map(p => ({
      ...p,
      clientName: p.case?.client?.name || 'Unknown Candidate',
      clientEmail: p.case?.client?.email || '',
      caseNumber: p.case?.caseNumber || 'N/A',
      caseTitle: p.case?.title || 'EB-2 NIW Petition'
    }));

    return res.json({ success: true, data: mapped });
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
    const caseItem = await prisma.case.findUnique({ 
      where: { id: result.data.caseId },
      include: { client: true }
    });
    if (!caseItem) {
      return res.status(404).json({ success: false, error: 'Case folder not found in database' });
    }

    const newPayment = await prisma.payment.create({
      data: {
        caseId: result.data.caseId,
        description: result.data.description,
        amount: result.data.amount,
        dueDate: result.data.dueDate,
        status: result.data.status,
        paidAt: result.data.paidAt || (result.data.status === 'Paid' ? new Date().toISOString() : null)
      },
      include: {
        case: {
          include: {
            client: true
          }
        }
      }
    });

    const mapped = {
      ...newPayment,
      clientName: newPayment.case?.client?.name || 'Unknown Candidate',
      clientEmail: newPayment.case?.client?.email || '',
      caseNumber: newPayment.case?.caseNumber || 'N/A',
      caseTitle: newPayment.case?.title || 'EB-2 NIW Petition'
    };

    return res.status(201).json({ success: true, data: mapped });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updatePayment = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const result = updatePaymentSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation Failed',
      details: result.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }))
    });
  }

  try {
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Payment invoice record not found' });
    }

    const updateData: any = { ...result.data };
    if (result.data.status === 'Paid' && !result.data.paidAt && !existing.paidAt) {
      updateData.paidAt = new Date().toISOString();
    } else if (result.data.status === 'Pending') {
      updateData.paidAt = null;
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: updateData,
      include: {
        case: {
          include: {
            client: true
          }
        }
      }
    });

    const mapped = {
      ...updated,
      clientName: updated.case?.client?.name || 'Unknown Candidate',
      clientEmail: updated.case?.client?.email || '',
      caseNumber: updated.case?.caseNumber || 'N/A',
      caseTitle: updated.case?.title || 'EB-2 NIW Petition'
    };

    return res.json({ success: true, data: mapped });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deletePayment = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Payment record not found' });
    }

    await prisma.payment.delete({ where: { id } });
    return res.json({ success: true, message: 'Payment record deleted from database successfully', id });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/db.js';
import { z } from 'zod';

const createTaskSchema = z.object({
  caseId: z.string(),
  title: z.string().min(3).max(200),
  assignedRole: z.enum(['superadmin', 'admin', 'writer', 'reviewer', 'client']),
  assignedToName: z.string().min(2),
  stageId: z.number().int().min(1).max(14),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  priority: z.enum(['low', 'medium', 'high', 'urgent'])
});

const updateTaskSchema = z.object({
  completed: z.boolean().optional(),
  title: z.string().min(3).max(200).optional(),
  assignedToName: z.string().min(2).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional()
});

export const getTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caseId } = req.query;
    const whereClause = caseId ? { caseId: String(caseId) } : {};

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: { dueDate: 'asc' }
    });

    return res.json({ success: true, data: tasks });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createTask = async (req: AuthenticatedRequest, res: Response) => {
  const result = createTaskSchema.safeParse(req.body);
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
      return res.status(404).json({ success: false, error: 'Case not found' });
    }

    const newTask = await prisma.task.create({
      data: {
        caseId: result.data.caseId,
        title: result.data.title,
        assignedRole: result.data.assignedRole,
        assignedToName: result.data.assignedToName,
        stageId: result.data.stageId,
        dueDate: result.data.dueDate,
        priority: result.data.priority,
        completed: false
      }
    });

    return res.status(201).json({ success: true, data: newTask });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const result = updateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation Failed',
      details: result.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }))
    });
  }

  try {
    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: result.data
    });

    return res.json({ success: true, data: updatedTask });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

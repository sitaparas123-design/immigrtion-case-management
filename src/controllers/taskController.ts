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
  assignedRole: z.enum(['superadmin', 'admin', 'writer', 'reviewer', 'client']).optional(),
  stageId: z.number().int().min(1).max(14).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional()
});

export const getTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caseId } = req.query;
    const whereClause = caseId ? { caseId: String(caseId) } : {};

    let tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: { dueDate: 'asc' }
    });

    // Auto-seed initial workflow tasks if table is empty
    if (tasks.length === 0 && !caseId) {
      const allCases = await prisma.case.findMany();
      if (allCases.length > 0) {
        const seedTasks = [
          {
            caseId: allCases[0].id,
            title: 'Verify academic degrees and peer-reviewed publication records',
            assignedRole: 'writer' as const,
            assignedToName: 'Sarah Jenkins',
            stageId: 1,
            dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
            priority: 'urgent' as const,
            completed: false
          },
          {
            caseId: allCases[0].id,
            title: 'Draft 3-5 independent expert recommender solicitation letters',
            assignedRole: 'writer' as const,
            assignedToName: 'Sarah Jenkins',
            stageId: 2,
            dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
            priority: 'high' as const,
            completed: false
          },
          {
            caseId: allCases[0].id,
            title: 'Complete USCIS Form I-140 and ETA-9089 questionnaire mapping',
            assignedRole: 'admin' as const,
            assignedToName: 'Case Administrator',
            stageId: 3,
            dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
            priority: 'medium' as const,
            completed: false
          },
          {
            caseId: allCases[0].id,
            title: 'Draft Dhanasar 3-Prong Legal Memorandum for Senior Reviewer',
            assignedRole: 'writer' as const,
            assignedToName: 'Sarah Jenkins',
            stageId: 4,
            dueDate: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
            priority: 'high' as const,
            completed: false
          },
          {
            caseId: allCases[0].id,
            title: 'Assemble final exhibit binder and courier package for USCIS filing',
            assignedRole: 'reviewer' as const,
            assignedToName: 'David Miller, Esq.',
            stageId: 5,
            dueDate: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
            priority: 'medium' as const,
            completed: false
          }
        ];

        for (const st of seedTasks) {
          await prisma.task.create({ data: st });
        }

        tasks = await prisma.task.findMany({
          where: whereClause,
          orderBy: { dueDate: 'asc' }
        });
      }
    }

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
    let targetCaseId = result.data.caseId;
    let caseItem = await prisma.case.findUnique({ where: { id: targetCaseId } });
    if (!caseItem) {
      const firstCase = await prisma.case.findFirst();
      if (firstCase) {
        targetCaseId = firstCase.id;
      } else {
        return res.status(404).json({ success: false, error: 'No active case found to attach task' });
      }
    }

    const newTask = await prisma.task.create({
      data: {
        caseId: targetCaseId,
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

export const deleteTask = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    await prisma.task.delete({ where: { id } });
    return res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};


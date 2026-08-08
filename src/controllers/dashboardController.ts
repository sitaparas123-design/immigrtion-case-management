import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/db.js';

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allCases = await prisma.case.findMany();
    const allTasks = await prisma.task.findMany();

    const activeCases = allCases.length;
    const inReview = allCases.filter(c => c.currentStage >= 9 && c.currentStage <= 12).length;
    
    // Risk level filter: medium and high flag rates
    const rfeCases = allCases.filter(c => c.riskLevel === 'high' || c.riskLevel === 'medium').length;

    // Funnel stage distribution
    const funnel = {
      intake: allCases.filter(c => c.currentStage >= 1 && c.currentStage <= 2).length,
      evaluation: allCases.filter(c => c.currentStage >= 3 && c.currentStage <= 5).length,
      evidence: allCases.filter(c => c.currentStage >= 6 && c.currentStage <= 8).length,
      drafting: allCases.filter(c => c.currentStage >= 9 && c.currentStage <= 12).length,
      filing: allCases.filter(c => c.currentStage >= 13 && c.currentStage <= 14).length,
    };

    const pendingTasks = allTasks.filter(t => !t.completed).length;

    return res.json({
      success: true,
      data: {
        activeCasesCount: activeCases,
        inReviewCount: inReview,
        rfeCasesCount: rfeCases,
        pendingTasksCount: pendingTasks,
        funnel,
        status: 'Active On Schedule'
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

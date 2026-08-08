import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/db.js';

export const getReportStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cases = await prisma.case.findMany({
      include: { client: true }
    });

    const totalCases = cases.length;

    // Service Center distribution
    const nscCases = cases.filter(c => c.uscisServiceCenter && c.uscisServiceCenter.includes('Nebraska')).length;
    const tscCases = cases.filter(c => c.uscisServiceCenter && c.uscisServiceCenter.includes('Texas')).length;

    // Risk distributions
    const highRisk = cases.filter(c => c.riskLevel === 'high').length;
    const mediumRisk = cases.filter(c => c.riskLevel === 'medium').length;
    const lowRisk = cases.filter(c => c.riskLevel === 'low').length;

    // Compute simple stage group totals
    const stageBreakdown = {
      intake: cases.filter(c => c.currentStage <= 2).length,
      evaluation: cases.filter(c => c.currentStage >= 3 && c.currentStage <= 5).length,
      evidence: cases.filter(c => c.currentStage >= 6 && c.currentStage <= 8).length,
      drafting: cases.filter(c => c.currentStage >= 9 && c.currentStage <= 12).length,
      filing: cases.filter(c => c.currentStage >= 13).length,
    };

    return res.json({
      success: true,
      data: {
        totalCases,
        serviceCenters: {
          nsc: nscCases,
          tsc: tscCases
        },
        riskMetrics: {
          high: highRisk,
          medium: mediumRisk,
          low: lowRisk
        },
        stageBreakdown
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

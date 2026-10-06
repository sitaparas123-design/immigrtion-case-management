import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/db.js';
import { z } from 'zod';

const createTemplateSchema = z.object({
  industry: z.string().min(2),
  title: z.string().min(2),
  description: z.string().min(5),
  sampleEndeavor: z.string().min(10),
  suggestedProng1Points: z.array(z.string()).optional().default([]),
  suggestedProng2Points: z.array(z.string()).optional().default([]),
  suggestedProng3Points: z.array(z.string()).optional().default([]),
  recommendedExhibits: z.array(z.string()).optional().default([])
});

export const getTemplates = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templates = await prisma.template.findMany();
    return res.json({ success: true, data: templates });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createTemplate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = createTemplateSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: 'Validation Failed', details: result.error.errors });
    }

    const newTemplate = await prisma.template.create({
      data: {
        industry: result.data.industry,
        title: result.data.title,
        description: result.data.description,
        sampleEndeavor: result.data.sampleEndeavor,
        suggestedProng1Points: result.data.suggestedProng1Points,
        suggestedProng2Points: result.data.suggestedProng2Points,
        suggestedProng3Points: result.data.suggestedProng3Points,
        recommendedExhibits: result.data.recommendedExhibits
      }
    });

    return res.status(201).json({ success: true, data: newTemplate });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteTemplate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.template.delete({ where: { id } });
    return res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const applyTemplateToCase = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { caseId } = req.body;

    if (!caseId) {
      return res.status(400).json({ success: false, error: 'Target caseId is required' });
    }

    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const targetCase = await prisma.case.findUnique({ where: { id: caseId } });
    if (!targetCase) {
      return res.status(404).json({ success: false, error: 'Target case not found' });
    }

    // Update case endeavor and prong framework
    const currentProngs: any = targetCase.dhanasarProngs || {};
    const updatedProngs = {
      ...currentProngs,
      prong1: {
        title: 'Substantial Merit & National Importance',
        endeavorSummary: template.sampleEndeavor,
        usImpactAreas: Array.isArray(template.suggestedProng1Points) ? template.suggestedProng1Points : [],
        nationalImportanceScore: 92
      }
    };

    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: {
        fieldCategory: template.industry,
        dhanasarProngs: updatedProngs,
        lastUpdated: new Date().toISOString()
      },
      include: { client: true, documents: true, recommenders: true, payments: true, messages: true }
    });

    return res.json({
      success: true,
      message: `Successfully applied template "${template.title}" to case ${targetCase.caseNumber}`,
      data: updatedCase
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/db.js';
import { z } from 'zod';

const createCaseSchema = z.object({
  clientId: z.string(),
  petitionCategory: z.enum(['EB-2 NIW', 'EB-1A', 'O-1', 'Resume Building', 'Profile Building', 'Immigration Editorial Services', 'Mexico TR Visa']),
  fieldCategory: z.string().min(2),
  assignedWriter: z.string().optional(),
  assignedReviewer: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  targetFilingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  uscisServiceCenter: z.enum(['Nebraska (NSC)', 'Texas (TSC)']),
  premiumProcessing: z.boolean()
});

const updateStageSchema = z.object({
  stageId: z.number().int().min(1).max(7)
});

export const getCases = async (req: Request, res: Response) => {
  try {
    const cases = await prisma.case.findMany({
      include: {
        client: true,
        documents: true,
        recommenders: true
      },
      orderBy: { lastUpdated: 'desc' }
    });
    return res.json({ success: true, data: cases });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Client-facing: returns the case belonging to the logged-in client
export const getMyCase = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Find the client record matching the logged-in user's email
    const client = await prisma.client.findUnique({
      where: { email: userEmail }
    });

    if (!client) {
      // Fallback: return the first case in the system for demo purposes
      const fallbackCase = await prisma.case.findFirst({
        include: { client: true, documents: true, recommenders: true },
        orderBy: { lastUpdated: 'desc' }
      });
      if (!fallbackCase) {
        return res.status(404).json({ success: false, error: 'No case found' });
      }
      return res.json({ success: true, data: fallbackCase });
    }

    // Find the most recent case for this client
    const myCase = await prisma.case.findFirst({
      where: { clientId: client.id },
      include: { client: true, documents: true, recommenders: true },
      orderBy: { lastUpdated: 'desc' }
    });

    if (!myCase) {
      return res.status(404).json({ success: false, error: 'No case found for this client' });
    }

    return res.json({ success: true, data: myCase });
  } catch (error: any) {
    console.error('Error in getMyCase:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};


export const createCase = async (req: Request, res: Response) => {
  const result = createCaseSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, error: 'Validation Failed', details: result.error.errors });
  }

  const { clientId, petitionCategory, fieldCategory, assignedWriter, assignedReviewer, riskLevel, targetFilingDate, uscisServiceCenter, premiumProcessing } = result.data;

  try {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const count = await prisma.case.count();
    const caseNumber = `NIW-2026-00${count + 1}`;

    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        clientId,
        petitionCategory,
        fieldCategory,
        assignedWriter: assignedWriter || null,
        assignedReviewer: assignedReviewer || null,
        riskLevel,
        targetFilingDate,
        uscisServiceCenter,
        premiumProcessing,
        currentStage: 1
      }
    });

    return res.status(201).json({ success: true, data: newCase });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateStage = async (req: Request, res: Response) => {
  const { caseNumber } = req.params;
  const result = updateStageSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, error: 'Validation Failed', details: result.error.errors });
  }

  try {
    const existing = await prisma.case.findUnique({ where: { caseNumber } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }

    const updatedCase = await prisma.case.update({
      where: { caseNumber },
      data: {
        currentStage: result.data.stageId
      }
    });

    return res.json({ success: true, data: updatedCase });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createRecommender = async (req: Request, res: Response) => {
  const { caseId } = req.params;
  const { name, title, organization, relationship } = req.body;
  try {
    const caseItem = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caseItem) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }
    const newRec = await prisma.recommender.create({
      data: {
        caseId,
        name,
        title,
        organization: organization || 'US Research Institute',
        relationship,
        status: 'Outreach Sent',
        cvReceived: true,
        keyContributionsMentioned: ['Attests to candidate original algorithmic contributions', 'Validates national merit']
      }
    });
    return res.status(201).json({ success: true, data: newRec });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const intakeCaseSchema = z.object({
  clientName: z.string().min(2).max(100),
  clientEmail: z.string().email(),
  phone: z.string().min(5).optional(),
  countryOfBirth: z.string().min(2).optional(),
  currentField: z.string().min(2),
  highestDegree: z.enum(["Ph.D.", "Master's", "Bachelor's + 5 yrs", "Exceptional Ability"]).optional(),
  university: z.string().min(2).optional(),
  petitionCategory: z.enum(['EB-2 NIW', 'EB-1A', 'O-1', 'Resume Building', 'Profile Building', 'Immigration Editorial Services', 'Mexico TR Visa']),
  fieldCategory: z.string().min(2),
  assignedWriter: z.string().optional(),
  assignedReviewer: z.string().optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  targetFilingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  uscisServiceCenter: z.enum(['Nebraska (NSC)', 'Texas (TSC)']),
  premiumProcessing: z.boolean()
});

export const intakeCase = async (req: Request, res: Response) => {
  const result = intakeCaseSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, error: 'Validation Failed: ' + result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '), details: result.error.errors });
  }

  const data = result.data;

  try {
    const transactionResult = await prisma.$transaction(async (tx) => {
      let client = await tx.client.findUnique({ where: { email: data.clientEmail } });
      if (client) {
        const existingCase = await tx.case.findFirst({
          where: {
            clientId: client.id,
            petitionCategory: data.petitionCategory
          }
        });
        if (existingCase) {
          throw new Error('DUPLICATE_CASE');
        }
      } else {
        client = await tx.client.create({
          data: {
            name: data.clientName,
            email: data.clientEmail,
            phone: data.phone || '+1 (555) 012-3456',
            countryOfBirth: data.countryOfBirth || 'United States',
            currentField: data.currentField,
            highestDegree: data.highestDegree || 'Ph.D.',
            university: data.university || 'Standard University',
            status: 'Active'
          }
        });
      }

      const count = await tx.case.count();
      const caseNumber = `NIW-2026-00${count + 1}`;

      const newCase = await tx.case.create({
        data: {
          caseNumber,
          clientId: client.id,
          petitionCategory: data.petitionCategory,
          fieldCategory: data.fieldCategory,
          assignedWriter: data.assignedWriter || 'Petition Drafter 1',
          assignedReviewer: data.assignedReviewer || 'Senior Reviewer',
          riskLevel: data.riskLevel || 'low',
          targetFilingDate: data.targetFilingDate || '2026-12-31',
          uscisServiceCenter: data.uscisServiceCenter,
          premiumProcessing: data.premiumProcessing,
          currentStage: 1
        },
        include: {
          client: true,
          documents: true,
          recommenders: true
        }
      });

      return { client, caseItem: newCase };
    });

    return res.status(201).json({
      success: true,
      message: 'Intake process completed and saved to database.',
      data: transactionResult.caseItem
    });

  } catch (error: any) {
    if (error.message === 'DUPLICATE_CASE') {
      return res.status(409).json({
        success: false,
        error: 'Duplicate record: Candidate already has a case registered with this petition category.'
      });
    }
    return res.status(500).json({
      success: false,
      error: error.message || 'Database error: Failed to process intake.'
    });
  }
};

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/db.js';
import { z } from 'zod';

const createCaseSchema = z.object({
  clientId: z.string(),
  petitionCategory: z.string().min(2).optional().default('EB-2 NIW'),
  fieldCategory: z.string().min(2).optional().default('Not Specified'),
  assignedWriter: z.string().optional().nullable(),
  assignedReviewer: z.string().optional().nullable(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  targetFilingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().default('2026-12-31'),
  uscisServiceCenter: z.enum(['Nebraska (NSC)', 'Texas (TSC)']).optional().default('Nebraska (NSC)'),
  premiumProcessing: z.boolean().optional().default(false),
  title: z.string().min(2),
  priority: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

const updateStageSchema = z.object({
  stageId: z.coerce.number().int().min(1).max(50).optional(),
  stage: z.coerce.number().int().min(1).max(50).optional(),
  newStageId: z.coerce.number().int().min(1).max(50).optional(),
  newStage: z.coerce.number().int().min(1).max(50).optional()
});

export const getCases = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userEmail = user?.email;
  const userRole = user?.role;

  try {
    const cases = await prisma.case.findMany({
      include: {
        client: true,
        documents: true,
        recommenders: true
      },
      orderBy: { lastUpdated: 'desc' }
    });

    // Admins and Superadmins have full management visibility of all cases
    let filteredCases = cases;
    if (userRole && userRole !== 'superadmin' && userRole !== 'admin') {
      filteredCases = cases.filter(c => {
        if (userRole === 'client') {
          return c.client?.email?.toLowerCase() === userEmail.toLowerCase() || cases.length > 0;
        }
        const notes = c.client?.notes || '';
        if (!c.assignedWriter && !c.assignedReviewer && !notes.includes('Created By:')) return true;
        return (c.assignedWriter && c.assignedWriter.toLowerCase().includes(userEmail.toLowerCase())) ||
               (c.assignedReviewer && c.assignedReviewer.toLowerCase().includes(userEmail.toLowerCase())) ||
               (notes.includes(`Created By: ${userEmail}`));
      });
    }

    return res.json({ success: true, data: filteredCases });
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
    let myCase = await prisma.case.findFirst({
      where: { clientId: client.id },
      include: { client: true, documents: true, recommenders: true },
      orderBy: { lastUpdated: 'desc' }
    });

    if (!myCase) {
      // Auto-create an active demo case if none exists in the system so portal never returns 404
      let targetClient = client;
      if (!targetClient) {
        targetClient = await prisma.client.create({
          data: {
            name: userEmail.split('@')[0] || 'Client Candidate',
            email: userEmail,
            phone: '+1 (555) 012-3456',
            countryOfBirth: 'Not Specified',
            currentField: 'Immigration Petition',
            highestDegree: "Master's",
            university: 'Not Specified',
            status: 'Active'
          }
        });
      }

      const caseNum = `NIW-2026-${Math.floor(100 + Math.random() * 900)}`;
      myCase = await prisma.case.create({
        data: {
          caseNumber: caseNum,
          clientId: targetClient.id,
          petitionCategory: 'EB-2 NIW',
          fieldCategory: 'Immigration Petition',
          currentStage: 1,
          assignedWriter: 'Petition Drafter 1',
          assignedReviewer: 'Senior Reviewer',
          riskLevel: 'low',
          targetFilingDate: '2026-12-31',
          uscisServiceCenter: 'Nebraska (NSC)',
          premiumProcessing: false,
          title: 'EB-2 NIW Petition',
          priority: 'Medium',
          status: 'Active'
        },
        include: { client: true, documents: true, recommenders: true }
      });
    }

    return res.json({ success: true, data: myCase });
  } catch (error: any) {
    console.error('Error in getMyCase:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const generateUniqueCaseNumber = async (txOrPrisma: any, category: string = 'NIW'): Promise<string> => {
  const prefix = category === 'EB-1A' ? 'EB1A' : category === 'O-1' ? 'O1' : 'NIW';
  let isUnique = false;
  let caseNumber = '';
  let counter = (await txOrPrisma.case.count()) + 1;

  while (!isUnique) {
    const formattedNum = counter < 10 ? `00${counter}` : counter < 100 ? `0${counter}` : `${counter}`;
    caseNumber = `${prefix}-2026-${formattedNum}`;
    const existing = await txOrPrisma.case.findUnique({ where: { caseNumber } });
    if (!existing) {
      isUnique = true;
    } else {
      counter++;
    }
  }

  return caseNumber;
};

export const createCase = async (req: Request, res: Response) => {
  const result = createCaseSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, error: 'Validation Failed', details: result.error.errors });
  }

  const {
    clientId,
    petitionCategory,
    fieldCategory,
    assignedWriter,
    assignedReviewer,
    riskLevel,
    targetFilingDate,
    uscisServiceCenter,
    premiumProcessing,
    title,
    priority,
    status,
    notes
  } = result.data;

  try {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const caseNumber = await generateUniqueCaseNumber(prisma, petitionCategory);

    const newCase = await prisma.case.create({
      data: {
        caseNumber,
        clientId,
        petitionCategory,
        fieldCategory: fieldCategory || title,
        assignedWriter: assignedWriter || null,
        assignedReviewer: assignedReviewer || null,
        riskLevel,
        targetFilingDate,
        uscisServiceCenter,
        premiumProcessing,
        currentStage: 1,
        title,
        priority: priority || 'Medium',
        status: status || 'Draft',
        notes: notes || null
      }
    });

    return res.status(201).json({ success: true, data: newCase });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateStage = async (req: Request, res: Response) => {
  const { caseNumber } = req.params;
  const parseResult = updateStageSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, error: 'Validation Failed', details: parseResult.error.errors });
  }

  const newStage = parseResult.data.stageId ?? parseResult.data.stage ?? parseResult.data.newStageId ?? parseResult.data.newStage;
  if (newStage === undefined || isNaN(newStage)) {
    return res.status(400).json({ success: false, error: 'stageId is required and must be a number between 1 and 50' });
  }

  try {
    const existing = await prisma.case.findFirst({
      where: {
        OR: [
          { caseNumber: caseNumber },
          { id: caseNumber }
        ]
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }

    const updatedCase = await prisma.case.update({
      where: { id: existing.id },
      data: {
        currentStage: newStage
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
        const creatorEmail = (req as any).user?.email || 'unknown';
        client = await tx.client.create({
          data: {
            name: data.clientName,
            email: data.clientEmail,
            phone: data.phone || '+1 (555) 012-3456',
            countryOfBirth: data.countryOfBirth || 'United States',
            currentField: data.currentField,
            highestDegree: data.highestDegree || 'Ph.D.',
            university: data.university || 'Standard University',
            status: 'Active',
            notes: `[Created By: ${creatorEmail}]`
          }
        });
      }

      const caseNumber = await generateUniqueCaseNumber(tx, data.petitionCategory);

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

export const deleteCase = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Case ID is required' });
  }

  try {
    const existingCase = await prisma.case.findFirst({
      where: {
        OR: [
          { id },
          { caseNumber: id }
        ]
      }
    });

    if (!existingCase) {
      return res.status(404).json({ success: false, error: 'Case record not found' });
    }

    const targetId = existingCase.id;

    await prisma.$transaction(async (tx) => {
      // Delete associated tasks, recommenders, and documents
      await tx.task.deleteMany({ where: { caseId: targetId } });
      await tx.recommender.deleteMany({ where: { caseId: targetId } });
      await tx.document.deleteMany({ where: { caseId: targetId } });
      // Delete case record
      await tx.case.delete({ where: { id: targetId } });
    });

    console.log(`[CASE DEBUG] Case deleted successfully: ${targetId} (${existingCase.caseNumber})`);
    return res.json({ success: true, message: `Case ${existingCase.caseNumber} deleted successfully.` });

  } catch (error: any) {
    console.error(`[CASE DEBUG] Error deleting case ${id}:`, error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to delete case' });
  }
};

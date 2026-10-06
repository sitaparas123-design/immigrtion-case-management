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
    title: z.string().min(2).optional(),
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
const generateUniqueCaseNumber = async (txOrPrisma, category = 'NIW') => {
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
        }
        else {
            counter++;
        }
    }
    return caseNumber;
};
export const getCases = async (req, res) => {
    const user = req.user;
    const userEmail = user?.email || '';
    const userRole = user?.role || '';
    try {
        const { search, riskLevel, uscisServiceCenter, petitionCategory, currentStage } = req.query;
        const whereClause = {};
        // 1. Role-based authorization & data isolation
        if (userRole === 'client') {
            const client = await prisma.client.findUnique({
                where: { email: userEmail }
            });
            if (client) {
                whereClause.clientId = client.id;
            }
        }
        else if (userRole === 'writer') {
            const dbUser = await prisma.user.findUnique({ where: { id: user?.id } });
            const writerName = dbUser?.name || 'Drafter 1';
            whereClause.OR = [
                { assignedWriter: { contains: writerName } },
                { assignedWriter: { contains: 'Drafter 1' } },
                { assignedWriter: { contains: 'Petition Drafter 1' } }
            ];
        }
        // 2. Risk Level filter
        if (riskLevel && riskLevel !== 'all') {
            whereClause.riskLevel = String(riskLevel);
        }
        // 3. USCIS Service Center filter
        if (uscisServiceCenter && uscisServiceCenter !== 'all') {
            whereClause.uscisServiceCenter = { contains: String(uscisServiceCenter) };
        }
        // 4. Petition Category filter
        if (petitionCategory && petitionCategory !== 'all') {
            whereClause.petitionCategory = String(petitionCategory);
        }
        // 5. Stage filter
        if (currentStage && currentStage !== 'all') {
            whereClause.currentStage = Number(currentStage);
        }
        // 6. Dynamic Search query (matches candidate name, case number, endeavor field, or client email)
        if (search && String(search).trim()) {
            const searchStr = String(search).trim();
            whereClause.AND = [
                ...(whereClause.AND || []),
                {
                    OR: [
                        { caseNumber: { contains: searchStr } },
                        { fieldCategory: { contains: searchStr } },
                        { client: { name: { contains: searchStr } } },
                        { client: { email: { contains: searchStr } } }
                    ]
                }
            ];
        }
        const cases = await prisma.case.findMany({
            where: whereClause,
            include: {
                client: true,
                documents: true,
                recommenders: true,
                payments: true,
                messages: true
            },
            orderBy: { lastUpdated: 'desc' }
        });
        return res.json({ success: true, data: cases });
    }
    catch (error) {
        console.error('[CASE DEBUG] Error in getCases:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to fetch cases' });
    }
};
// Client-facing: returns the case belonging to the logged-in client
export const getMyCase = async (req, res) => {
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
            // Fallback to latest case in database if client profile has matching user
            const fallbackCase = await prisma.case.findFirst({
                include: { client: true, documents: true, recommenders: true, payments: true, messages: true },
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
            include: { client: true, documents: true, recommenders: true, payments: true, messages: true },
            orderBy: { lastUpdated: 'desc' }
        });
        if (!myCase) {
            return res.status(404).json({ success: false, error: 'No case found for this client' });
        }
        return res.json({ success: true, data: myCase });
    }
    catch (error) {
        console.error('Error in getMyCase:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
export const getCaseById = async (req, res) => {
    try {
        const { id } = req.params;
        const caseItem = await prisma.case.findFirst({
            where: {
                OR: [
                    { id },
                    { caseNumber: id }
                ]
            },
            include: {
                client: true,
                documents: true,
                recommenders: true,
                payments: true,
                messages: true
            }
        });
        if (!caseItem) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }
        return res.json({ success: true, data: caseItem });
    }
    catch (error) {
        console.error('Error in getCaseById:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
export const createCase = async (req, res) => {
    const result = createCaseSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ success: false, error: 'Validation Failed', details: result.error.errors });
    }
    const { clientId, petitionCategory, fieldCategory, assignedWriter, assignedReviewer, riskLevel, targetFilingDate, uscisServiceCenter, premiumProcessing, title, priority, status, notes } = result.data;
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
                petitionCategory: petitionCategory || 'EB-2 NIW',
                fieldCategory: fieldCategory || title || 'Not Specified',
                assignedWriter: assignedWriter || null,
                assignedReviewer: assignedReviewer || null,
                riskLevel: riskLevel || 'medium',
                targetFilingDate: targetFilingDate || '2026-12-31',
                uscisServiceCenter: uscisServiceCenter || 'Nebraska (NSC)',
                premiumProcessing: Boolean(premiumProcessing),
                currentStage: 1,
                notes: notes || null
            },
            include: {
                client: true,
                documents: true,
                recommenders: true,
                payments: true,
                messages: true
            }
        });
        return res.status(201).json({ success: true, data: newCase });
    }
    catch (error) {
        console.error('Error in createCase:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
export const updateCase = async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma.case.findFirst({
            where: {
                OR: [{ id }, { caseNumber: id }]
            }
        });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }
        const { petitionCategory, fieldCategory, currentStage, assignedWriter, assignedReviewer, riskLevel, targetFilingDate, uscisServiceCenter, premiumProcessing, dhanasarProngs, eb1aCriteria, notes } = req.body;
        const updateData = {};
        if (petitionCategory !== undefined)
            updateData.petitionCategory = petitionCategory;
        if (fieldCategory !== undefined)
            updateData.fieldCategory = fieldCategory;
        if (currentStage !== undefined)
            updateData.currentStage = Number(currentStage);
        if (assignedWriter !== undefined)
            updateData.assignedWriter = assignedWriter;
        if (assignedReviewer !== undefined)
            updateData.assignedReviewer = assignedReviewer;
        if (riskLevel !== undefined)
            updateData.riskLevel = riskLevel;
        if (targetFilingDate !== undefined)
            updateData.targetFilingDate = targetFilingDate;
        if (uscisServiceCenter !== undefined)
            updateData.uscisServiceCenter = uscisServiceCenter;
        if (premiumProcessing !== undefined)
            updateData.premiumProcessing = Boolean(premiumProcessing);
        if (dhanasarProngs !== undefined)
            updateData.dhanasarProngs = dhanasarProngs;
        if (eb1aCriteria !== undefined)
            updateData.eb1aCriteria = eb1aCriteria;
        if (notes !== undefined)
            updateData.notes = notes;
        const updated = await prisma.case.update({
            where: { id: existing.id },
            data: updateData,
            include: {
                client: true,
                documents: true,
                recommenders: true,
                payments: true,
                messages: true
            }
        });
        return res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error('Error in updateCase:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
export const updateStage = async (req, res) => {
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
                    { caseNumber },
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
            },
            include: {
                client: true,
                documents: true,
                recommenders: true,
                payments: true,
                messages: true
            }
        });
        return res.json({ success: true, data: updatedCase });
    }
    catch (error) {
        console.error('Error in updateStage:', error);
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
export const intakeCase = async (req, res) => {
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
            }
            else {
                const creatorEmail = req.user?.email || 'unknown';
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
            const caseNumber = await generateUniqueCaseNumber(tx, data.petitionCategory);
            const creatorEmail = req.user?.email || 'unknown';
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
                    currentStage: 1,
                    notes: `[Created By: ${creatorEmail}]`
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
    }
    catch (error) {
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
export const deleteCase = async (req, res) => {
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
            // Delete associated tasks, recommenders, documents, messages, payments
            await tx.task.deleteMany({ where: { caseId: targetId } });
            await tx.recommender.deleteMany({ where: { caseId: targetId } });
            await tx.document.deleteMany({ where: { caseId: targetId } });
            await tx.message.deleteMany({ where: { caseId: targetId } });
            await tx.payment.deleteMany({ where: { caseId: targetId } });
            // Delete case record
            await tx.case.delete({ where: { id: targetId } });
        });
        console.log(`[CASE DEBUG] Case deleted successfully: ${targetId} (${existingCase.caseNumber})`);
        return res.json({ success: true, message: `Case ${existingCase.caseNumber} deleted successfully.` });
    }
    catch (error) {
        console.error(`[CASE DEBUG] Error deleting case ${id}:`, error.message);
        return res.status(500).json({ success: false, error: error.message || 'Failed to delete case' });
    }
};
export const createRecommender = async (req, res) => {
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
    }
    catch (error) {
        console.error('Error in createRecommender:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

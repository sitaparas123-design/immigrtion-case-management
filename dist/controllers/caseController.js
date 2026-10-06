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
    stageId: z.number().int().min(1).max(14)
});
export const getCases = async (req, res) => {
    try {
        const { search, riskLevel, uscisServiceCenter, petitionCategory, currentStage } = req.query;
        const whereClause = {};
        // 1. Role-based authorization & data isolation
        if (req.user?.role === 'client') {
            const client = await prisma.client.findUnique({
                where: { email: req.user.email }
            });
            if (client) {
                whereClause.clientId = client.id;
            }
        }
        else if (req.user?.role === 'writer') {
            const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
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
        console.error('Error in getCases:', error);
        return res.status(500).json({ success: false, error: error.message });
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
    const result = updateStageSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ success: false, error: 'Validation Failed', details: result.error.errors });
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
                currentStage: result.data.stageId
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
export const deleteCase = async (req, res) => {
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
        await prisma.case.delete({
            where: { id: existing.id }
        });
        return res.json({ success: true, message: 'Case deleted successfully', id: existing.id });
    }
    catch (error) {
        console.error('Error in deleteCase:', error);
        return res.status(500).json({ success: false, error: error.message });
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

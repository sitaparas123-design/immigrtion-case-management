import { prisma } from '../config/db.js';
import { z } from 'zod';
const createClientSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().min(5),
    countryOfBirth: z.string().min(2).optional().default("Not Specified"),
    currentField: z.string().min(2).optional().default("Not Specified"),
    highestDegree: z.enum(["Ph.D.", "Master's", "Bachelor's + 5 yrs", "Exceptional Ability"]).optional().default("Master's"),
    university: z.string().min(2).optional().default("Not Specified"),
    citationsCount: z.number().int().nonnegative().optional(),
    publicationsCount: z.number().int().nonnegative().optional(),
    patentsCount: z.number().int().nonnegative().optional(),
    dateOfBirth: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    passportNumber: z.string().optional().nullable(),
    clientCategory: z.string().optional().nullable(),
    notes: z.string().optional().nullable()
});
export const getClients = async (req, res) => {
    try {
        const clients = await prisma.client.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ success: true, data: clients });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
export const createClient = async (req, res) => {
    const result = createClientSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ success: false, error: 'Validation Failed', details: result.error.errors });
    }
    try {
        const existing = await prisma.client.findUnique({ where: { email: result.data.email } });
        if (existing) {
            return res.status(409).json({ success: false, error: 'Client with this email already exists' });
        }
        const newClient = await prisma.client.create({
            data: {
                name: result.data.name,
                email: result.data.email,
                phone: result.data.phone,
                countryOfBirth: result.data.countryOfBirth,
                currentField: result.data.currentField,
                highestDegree: result.data.highestDegree,
                university: result.data.university,
                citationsCount: result.data.citationsCount ?? 0,
                publicationsCount: result.data.publicationsCount ?? 0,
                patentsCount: result.data.patentsCount ?? 0,
                status: 'Active',
                dateOfBirth: result.data.dateOfBirth,
                address: result.data.address,
                passportNumber: result.data.passportNumber,
                clientCategory: result.data.clientCategory,
                notes: result.data.notes
            }
        });
        return res.status(201).json({ success: true, data: newClient });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
const updateClientSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(5).optional(),
    countryOfBirth: z.string().min(2).optional(),
    currentField: z.string().min(2).optional(),
    highestDegree: z.enum(["Ph.D.", "Master's", "Bachelor's + 5 yrs", "Exceptional Ability"]).optional(),
    university: z.string().min(2).optional(),
    citationsCount: z.number().int().nonnegative().optional(),
    publicationsCount: z.number().int().nonnegative().optional(),
    patentsCount: z.number().int().nonnegative().optional(),
    status: z.string().optional()
});
export const updateClient = async (req, res) => {
    const { id } = req.params;
    const result = updateClientSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ success: false, error: 'Validation Failed', details: result.error.errors });
    }
    try {
        const existing = await prisma.client.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }
        if (result.data.email && result.data.email !== existing.email) {
            const emailConflict = await prisma.client.findUnique({ where: { email: result.data.email } });
            if (emailConflict) {
                return res.status(409).json({ success: false, error: 'Email already in use by another client' });
            }
        }
        const updated = await prisma.client.update({
            where: { id },
            data: result.data
        });
        return res.json({ success: true, data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
export const deleteClient = async (req, res) => {
    const { id } = req.params;
    try {
        const existing = await prisma.client.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Client not found' });
        }
        // Perform atomic transaction to delete tasks, and cascade delete cases & related documents
        await prisma.$transaction(async (tx) => {
            const cases = await tx.case.findMany({ where: { clientId: id } });
            const caseIds = cases.map(c => c.id);
            if (caseIds.length > 0) {
                await tx.task.deleteMany({
                    where: { caseId: { in: caseIds } }
                });
            }
            await tx.client.delete({ where: { id } });
        });
        return res.json({ success: true, message: 'Client and all associated cases and tasks deleted successfully', id });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message || 'Failed to delete client profile' });
    }
};

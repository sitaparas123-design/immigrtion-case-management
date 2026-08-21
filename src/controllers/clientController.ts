import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const createClientSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional().nullable().transform(val => (val && val.trim().length >= 5) ? val : "+1 (555) 012-3456"),
  countryOfBirth: z.string().optional().nullable().transform(val => (val && val.trim().length >= 2) ? val : "Not Specified"),
  currentField: z.string().optional().nullable().transform(val => (val && val.trim().length >= 2) ? val : "Not Specified"),
  highestDegree: z.string().optional().nullable().transform(val => val || "Master's"),
  university: z.string().optional().nullable().transform(val => (val && val.trim().length >= 2) ? val : "Not Specified"),
  citationsCount: z.coerce.number().int().nonnegative().optional().default(0),
  publicationsCount: z.coerce.number().int().nonnegative().optional().default(0),
  patentsCount: z.coerce.number().int().nonnegative().optional().default(0),
  dateOfBirth: z.string().optional().nullable().transform(val => val || null),
  address: z.string().optional().nullable().transform(val => val || null),
  passportNumber: z.string().optional().nullable().transform(val => val || null),
  clientCategory: z.string().optional().nullable().transform(val => val || null),
  notes: z.string().optional().nullable().transform(val => val || null),
  password: z.string().optional().nullable().transform(val => (val && val.length >= 6) ? val : "password123")
});

export const getClients = async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userEmail = user?.email;
  const userRole = user?.role;

  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Admins and Superadmins have full visibility of all clients in the directory
    let filteredClients = clients;
    if (userRole && userRole !== 'superadmin' && userRole !== 'admin') {
      filteredClients = clients.filter(client => {
        const notes = client.notes || '';
        if (!notes.includes('Created By:')) return true;
        return notes.includes(`Created By: ${userEmail}`);
      });
    }

    const mappedClients = filteredClients.map(client => {
      // Log fetched counts internally for debugging only (Requirement 7)
      console.log(`[CLIENT DEBUG] Client: ${client.name} (${client.id}), Citations: ${client.citationsCount}, Papers: ${client.publicationsCount}, Patents: ${client.patentsCount}`);
      
      return {
        ...client,
        clientId: client.id,
        fullName: client.name,
        citationCount: client.citationsCount,
        paperCount: client.publicationsCount,
        patentCount: client.patentsCount
      };
    });

    return res.json({ success: true, data: mappedClients });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createClient = async (req: Request, res: Response) => {
  const result = createClientSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, error: 'Validation Failed', details: result.error.errors });
  }

  try {
    const existing = await prisma.client.findUnique({ where: { email: result.data.email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Client with this email already exists' });
    }

    const creatorEmail = (req as any).user?.email || 'unknown';
    const notesWithCreator = (result.data.notes || '') + `\n[Created By: ${creatorEmail}]`;

    const passwordVal = result.data.password || 'password123';
    const passwordHash = await bcrypt.hash(passwordVal, 10);

    const newClient = await prisma.$transaction(async (tx) => {
      // 1. Create client profile
      const client = await tx.client.create({
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
          notes: notesWithCreator
        }
      });

      // 2. Sync credentials to User table
      await tx.user.create({
        data: {
          name: result.data.name,
          email: result.data.email,
          password: passwordHash,
          role: 'client'
        }
      });

      return client;
    });

    const mapped = {
      ...newClient,
      clientId: newClient.id,
      fullName: newClient.name,
      citationCount: newClient.citationsCount,
      paperCount: newClient.publicationsCount,
      patentCount: newClient.patentsCount
    };
    return res.status(201).json({ success: true, data: mapped });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const updateClientSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().transform(val => val || undefined),
  countryOfBirth: z.string().optional().transform(val => val || undefined),
  currentField: z.string().optional().transform(val => val || undefined),
  highestDegree: z.string().optional().transform(val => val || undefined),
  university: z.string().optional().transform(val => val || undefined),
  citationsCount: z.coerce.number().int().nonnegative().optional(),
  publicationsCount: z.coerce.number().int().nonnegative().optional(),
  patentsCount: z.coerce.number().int().nonnegative().optional(),
  status: z.string().optional(),
  password: z.string().optional().nullable()
});

export const updateClient = async (req: Request, res: Response) => {
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

    const updated = await prisma.$transaction(async (tx) => {
      // Find corresponding user
      const user = await tx.user.findUnique({ where: { email: existing.email } });
      if (user) {
        const updateData: any = {};
        if (result.data.name) updateData.name = result.data.name;
        if (result.data.email) updateData.email = result.data.email;
        if (result.data.password) {
          updateData.password = await bcrypt.hash(result.data.password, 10);
        }
        await tx.user.update({
          where: { id: user.id },
          data: updateData
        });
      } else if (result.data.email || existing.email) {
        // If user record wasn't found (legacy client), create it now so they can log in
        const userEmail = result.data.email || existing.email;
        const userName = result.data.name || existing.name;
        const passVal = result.data.password || 'password123';
        const passwordHash = await bcrypt.hash(passVal, 10);
        await tx.user.create({
          data: {
            name: userName,
            email: userEmail,
            password: passwordHash,
            role: 'client'
          }
        });
      }

      // Filter out password field before updating client table since Client schema doesn't have password column
      const { password, ...clientUpdateData } = result.data;

      return tx.client.update({
        where: { id },
        data: clientUpdateData
      });
    });

    const mapped = {
      ...updated,
      clientId: updated.id,
      fullName: updated.name,
      citationCount: updated.citationsCount,
      paperCount: updated.publicationsCount,
      patentCount: updated.patentsCount
    };
    return res.json({ success: true, data: mapped });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteClient = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    console.log(`[DELETE DEBUG] Deleting Client ID: ${id}`);
    console.log(`[DELETE DEBUG] API Endpoint Called: DELETE /api/clients/${id}`);

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) {
      console.warn(`[DELETE DEBUG] Client ID ${id} not found.`);
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    // Perform atomic transaction to delete all collections referencing this client
    await prisma.$transaction(async (tx) => {
      const cases = await tx.case.findMany({ where: { clientId: id } });
      const caseIds = cases.map(c => c.id);

      if (caseIds.length > 0) {
        // 1. Delete associated tasks
        const deletedTasks = await tx.task.deleteMany({
          where: { caseId: { in: caseIds } }
        });
        console.log(`[DELETE DEBUG] Deleted ${deletedTasks.count} tasks.`);

        // 2. Delete associated documents
        const deletedDocs = await tx.document.deleteMany({
          where: { caseId: { in: caseIds } }
        });
        console.log(`[DELETE DEBUG] Deleted ${deletedDocs.count} documents.`);

        // 3. Delete associated recommenders
        const deletedRecommenders = await tx.recommender.deleteMany({
          where: { caseId: { in: caseIds } }
        });
        console.log(`[DELETE DEBUG] Deleted ${deletedRecommenders.count} recommenders.`);

        // 4. Delete associated payments
        const deletedPayments = await tx.payment.deleteMany({
          where: { caseId: { in: caseIds } }
        });
        console.log(`[DELETE DEBUG] Deleted ${deletedPayments.count} payments.`);

        // 5. Delete associated messages
        const deletedMessages = await tx.message.deleteMany({
          where: { caseId: { in: caseIds } }
        });
        console.log(`[DELETE DEBUG] Deleted ${deletedMessages.count} messages.`);

        // 6. Delete associated cases
        const deletedCases = await tx.case.deleteMany({
          where: { id: { in: caseIds } }
        });
        console.log(`[DELETE DEBUG] Deleted ${deletedCases.count} cases.`);
      }

      // 7. Delete associated appointments by email
      if (existing.email) {
        const deletedAppointments = await tx.appointment.deleteMany({
          where: { clientEmail: existing.email }
        });
        console.log(`[DELETE DEBUG] Deleted ${deletedAppointments.count} appointments.`);

        // Delete user credentials account
        await tx.user.deleteMany({
          where: { email: existing.email }
        });
        console.log(`[DELETE DEBUG] Deleted synced user account.`);
      }

      // 8. Delete the client itself
      await tx.client.delete({ where: { id } });
      console.log(`[DELETE DEBUG] Deleted client record.`);
    });

    console.log(`[DELETE DEBUG] Transaction success for client ${id}`);
    return res.json({ success: true, message: 'Client and all associated records deleted successfully', id });
  } catch (error: any) {
    console.error(`[DELETE DEBUG] Transaction failure for client ${id}: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message || 'Failed to delete client profile' });
  }
};

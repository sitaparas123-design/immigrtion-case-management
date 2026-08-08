import { Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { z } from 'zod';

const createClientSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(5),
  countryOfBirth: z.string().min(2),
  currentField: z.string().min(2),
  highestDegree: z.enum(["Ph.D.", "Master's", "Bachelor's + 5 yrs", "Exceptional Ability"]),
  university: z.string().min(2),
  citationsCount: z.number().int().nonnegative().optional(),
  publicationsCount: z.number().int().nonnegative().optional(),
  patentsCount: z.number().int().nonnegative().optional()
});

export const getClients = async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: clients });
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
        status: 'Active'
      }
    });

    return res.status(201).json({ success: true, data: newClient });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

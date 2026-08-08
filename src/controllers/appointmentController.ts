import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/db.js';
import { z } from 'zod';

const createAppointmentSchema = z.object({
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  type: z.string().min(3),
  specialist: z.string().min(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string(),
  duration: z.string(),
  status: z.enum(['Upcoming', 'Completed', 'Rescheduled', 'Cancelled']),
  meetingUrl: z.string().url(),
  notes: z.string().optional()
});

export const getAppointments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: { date: 'asc' }
    });

    return res.json({ success: true, data: appointments });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const createAppointment = async (req: AuthenticatedRequest, res: Response) => {
  const result = createAppointmentSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation Failed',
      details: result.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }))
    });
  }

  try {
    const newAppointment = await prisma.appointment.create({
      data: result.data
    });

    return res.status(201).json({ success: true, data: newAppointment });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

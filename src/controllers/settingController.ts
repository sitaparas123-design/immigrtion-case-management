import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/db.js';

export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findFirst();
    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' }
    });

    return res.json({
      success: true,
      data: {
        settings: settings || {
          companyName: 'Babel Global',
          specialistId: 'BG-CONSULT-391024',
          filingFee: '$715',
          premiumFee: '$2,965',
          asylumFee: '$300',
          whatsappAlerts: true,
          emailRequests: true,
          appointmentReminders: true,
          quietHours: true
        },
        auditLogs
      }
    });
  } catch (error: any) {
    console.error('Error in getSettings:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      companyName,
      specialistId,
      filingFee,
      premiumFee,
      asylumFee,
      whatsappAlerts,
      emailRequests,
      appointmentReminders,
      quietHours
    } = req.body;

    const existing = await prisma.systemSetting.findFirst();

    let updated;
    if (existing) {
      updated = await prisma.systemSetting.update({
        where: { id: existing.id },
        data: {
          companyName,
          specialistId,
          filingFee,
          premiumFee,
          asylumFee,
          whatsappAlerts,
          emailRequests,
          appointmentReminders,
          quietHours
        }
      });
    } else {
      updated = await prisma.systemSetting.create({
        data: {
          companyName,
          specialistId,
          filingFee,
          premiumFee,
          asylumFee,
          whatsappAlerts,
          emailRequests,
          appointmentReminders,
          quietHours
        }
      });
    }

    // Insert an audit log entry for settings updates
    await prisma.auditLog.create({
      data: {
        action: 'System Settings Updated',
        userEmail: req.user?.email || 'admin@juris-flow.com',
        details: `Firm configuration branding and calculation fees successfully revised by superadmin.`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase()
      }
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error in updateSettings:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

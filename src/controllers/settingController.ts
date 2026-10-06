import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/db.js';

export const DEFAULT_FEE_DEFAULTS = {
  i140FilingFee: '$715',
  i907PremiumFee: '$2,965',
  asylumProgramFeeSmall: '$300',
  aos: {
    i485: '$1,440',
    i765: '$260',
    i131: '$630',
    i693: '$0',
    g1145: '$0',
    i485SupplementJ: '$0'
  },
  o1: {
    i129Standard: '$1,055',
    i129SmallNonprofit: '$530',
    asylumProgramFeeStandard: '$600',
    asylumProgramFeeSmall: '$300',
    asylumProgramFeeNonprofit: '$0',
    i907: '$2,965',
    ds160: '$205',
    i539Paper: '$470',
    i539Online: '$420',
    i539A: '$0'
  }
};

export const DEFAULT_PRACTICE_AREAS = [
  { id: 'eb2-niw', title: 'EB-2 NIW', subtitle: 'Dhanasar 3-Prong Analysis' },
  { id: 'eb1a', title: 'EB-1A Extraordinary', subtitle: '10-Criteria Matrix' },
  { id: 'o1', title: 'O-1 Visa', subtitle: 'Nonimmigrant Petitions' },
  { id: 'profile-building', title: 'Profile Building', subtitle: 'Academic & Industry Portfolio' }
];

export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let settings = null;
    try {
      settings = await prisma.systemSetting.findFirst();
    } catch (dbErr: any) {
      console.warn('SystemSetting query warning:', dbErr?.message || dbErr);
    }

    let auditLogs: any[] = [];
    try {
      auditLogs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' }
      });
    } catch (logErr: any) {
      try {
        auditLogs = await prisma.auditLog.findMany();
      } catch (fallbackErr: any) {
        console.warn('AuditLog query warning:', fallbackErr?.message || fallbackErr);
      }
    }

    let feeDefaultsObj: any = {};
    if (settings?.feeDefaults) {
      if (typeof settings.feeDefaults === 'string') {
        try {
          feeDefaultsObj = JSON.parse(settings.feeDefaults);
        } catch {
          feeDefaultsObj = {};
        }
      } else if (typeof settings.feeDefaults === 'object') {
        feeDefaultsObj = settings.feeDefaults;
      }
    }

    let practiceAreasObj: any = DEFAULT_PRACTICE_AREAS;
    if (settings?.practiceAreas) {
      if (typeof settings.practiceAreas === 'string') {
        try {
          practiceAreasObj = JSON.parse(settings.practiceAreas);
        } catch {
          practiceAreasObj = DEFAULT_PRACTICE_AREAS;
        }
      } else if (Array.isArray(settings.practiceAreas)) {
        practiceAreasObj = settings.practiceAreas;
      }
    }

    const mergedSettings = {
      id: settings?.id,
      companyName: settings?.companyName || 'Babel Global Editorial Services',
      specialistId: settings?.specialistId || 'BG-CONSULT-391024',
      filingFee: settings?.filingFee || '$715',
      premiumFee: settings?.premiumFee || '$2,965',
      asylumFee: settings?.asylumFee || '$300',
      whatsappAlerts: settings ? settings.whatsappAlerts !== false : true,
      emailRequests: settings ? settings.emailRequests !== false : true,
      appointmentReminders: settings ? settings.appointmentReminders !== false : true,
      quietHours: settings ? settings.quietHours !== false : true,
      practiceAreas: practiceAreasObj,
      feeDefaults: {
        ...DEFAULT_FEE_DEFAULTS,
        ...(feeDefaultsObj || {}),
        aos: {
          ...DEFAULT_FEE_DEFAULTS.aos,
          ...(feeDefaultsObj?.aos || {})
        },
        o1: {
          ...DEFAULT_FEE_DEFAULTS.o1,
          ...(feeDefaultsObj?.o1 || {})
        }
      }
    };

    return res.json({
      success: true,
      data: {
        settings: mergedSettings,
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
      quietHours,
      feeDefaults,
      practiceAreas
    } = req.body;

    const existing = await prisma.systemSetting.findFirst();

    const dataToSave = {
      companyName: companyName ?? 'Babel Global Editorial Services',
      specialistId: specialistId ?? 'BG-CONSULT-391024',
      filingFee: filingFee ?? '$715',
      premiumFee: premiumFee ?? '$2,965',
      asylumFee: asylumFee ?? '$300',
      whatsappAlerts: whatsappAlerts !== undefined ? Boolean(whatsappAlerts) : true,
      emailRequests: emailRequests !== undefined ? Boolean(emailRequests) : true,
      appointmentReminders: appointmentReminders !== undefined ? Boolean(appointmentReminders) : true,
      quietHours: quietHours !== undefined ? Boolean(quietHours) : true,
      feeDefaults: feeDefaults ?? DEFAULT_FEE_DEFAULTS,
      practiceAreas: practiceAreas ?? DEFAULT_PRACTICE_AREAS
    };

    let updated;
    if (existing) {
      updated = await prisma.systemSetting.update({
        where: { id: existing.id },
        data: dataToSave
      });
    } else {
      updated = await prisma.systemSetting.create({
        data: dataToSave
      });
    }

    // Insert an audit log entry for settings updates
    await prisma.auditLog.create({
      data: {
        action: 'System Settings Updated',
        userEmail: req.user?.email || 'admin@babelglobal.com',
        details: `Firm configuration branding, practice areas, and USCIS calculation fees successfully revised by superadmin.`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase()
      }
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error in updateSettings:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

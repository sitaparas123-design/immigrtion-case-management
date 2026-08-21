import { prisma } from './db.js';
import bcrypt from 'bcryptjs';

export async function seed() {
  try {
    console.log('🌱 Executing total database purge on live database...');

    // Force purge all tables
    await prisma.task.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.recommender.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.case.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.template.deleteMany({});
    await prisma.auditLog.deleteMany({});

    // Delete all users except superadmin@babelglobal.com
    await prisma.user.deleteMany({
      where: {
        email: {
          not: 'superadmin@babelglobal.com'
        }
      }
    });

    // Ensure superadmin@babelglobal.com exists with password 'password123'
    const hashedPassword = await bcrypt.hash('password123', 10);
    await prisma.user.upsert({
      where: { email: 'superadmin@babelglobal.com' },
      update: { password: hashedPassword },
      create: {
        name: 'Super Administrator',
        email: 'superadmin@babelglobal.com',
        role: 'superadmin',
        password: hashedPassword
      }
    });

    // Recreate system settings
    await prisma.systemSetting.deleteMany({});
    await prisma.systemSetting.create({
      data: {
        companyName: 'Babel Global Editorial Services',
        specialistId: 'BG-CONSULT-391024',
        filingFee: '$715',
        premiumFee: '$2,965',
        asylumFee: '$300',
        whatsappAlerts: true,
        emailRequests: true,
        appointmentReminders: true,
        quietHours: true
      }
    });

    console.log('✨ Live database 100% purged! ONLY superadmin@babelglobal.com (password123) remains.');
  } catch (error: any) {
    console.warn('⚠️ Database cleanup check failed:', error.message || error);
    throw error;
  }
}

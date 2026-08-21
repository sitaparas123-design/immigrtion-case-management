import { prisma } from './db.js';
import bcrypt from 'bcryptjs';

const defaultUsers = [
  { name: 'Super Administrator', email: 'superadmin@babelglobal.com', role: 'superadmin', password: '123456' }
];

export async function seed() {
  try {
    console.log('🌱 Database seeding check starting...');

    // 1. Seed Default Superadmin User if no users exist
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('Seeding default Superadmin user...');
      for (const u of defaultUsers) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        await prisma.user.create({
          data: {
            name: u.name,
            email: u.email,
            role: u.role,
            password: hashedPassword
          }
        });
      }
    }

    // 2. Seed System Settings if empty
    const settingsCount = await prisma.systemSetting.count();
    if (settingsCount === 0) {
      console.log('Seeding system settings...');
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
    }

    console.log('🌱 Seeding check complete.');
  } catch (error: any) {
    console.warn('⚠️ Database seeding check skipped (database connection unavailable):', error.message || error);
  }
}

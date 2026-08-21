import { prisma } from './db.js';
import bcrypt from 'bcryptjs';
export async function seed() {
    try {
        console.log('🌱 Live database cleanup & superadmin verification starting...');
        // 1. Purge all legacy/dummy records from live database
        await prisma.task.deleteMany({}).catch(() => { });
        await prisma.document.deleteMany({}).catch(() => { });
        await prisma.recommender.deleteMany({}).catch(() => { });
        await prisma.payment.deleteMany({}).catch(() => { });
        await prisma.message.deleteMany({}).catch(() => { });
        await prisma.appointment.deleteMany({}).catch(() => { });
        await prisma.case.deleteMany({}).catch(() => { });
        await prisma.client.deleteMany({}).catch(() => { });
        // 2. Delete all non-superadmin users
        await prisma.user.deleteMany({
            where: {
                email: {
                    not: 'superadmin@babelglobal.com'
                }
            }
        }).catch(() => { });
        // 3. Ensure ONLY superadmin@babelglobal.com exists with password 'password123'
        const hashedPassword = await bcrypt.hash('password123', 10);
        const superadmin = await prisma.user.findUnique({
            where: { email: 'superadmin@babelglobal.com' }
        });
        if (!superadmin) {
            await prisma.user.create({
                data: {
                    name: 'Super Administrator',
                    email: 'superadmin@babelglobal.com',
                    role: 'superadmin',
                    password: hashedPassword
                }
            });
            console.log('✅ Created Superadmin: superadmin@babelglobal.com / password123');
        }
        else {
            await prisma.user.update({
                where: { email: 'superadmin@babelglobal.com' },
                data: { password: hashedPassword }
            });
            console.log('✅ Verified & Updated Superadmin password to password123');
        }
        // 4. Ensure System Settings exist
        const settingsCount = await prisma.systemSetting.count().catch(() => 0);
        if (settingsCount === 0) {
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
            }).catch(() => { });
        }
        console.log('✨ Live database cleanup complete! ONLY superadmin@babelglobal.com (password123) remains.');
    }
    catch (error) {
        console.warn('⚠️ Database cleanup check skipped:', error.message || error);
    }
}

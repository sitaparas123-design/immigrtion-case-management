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
        // Create initial demo client and case
        const demoClient = await prisma.client.create({
            data: {
                name: 'Dr. Alexander Vance',
                email: 'alexander.vance@example.com',
                phone: '+1 (555) 0192-384',
                countryOfBirth: 'Germany',
                currentField: 'Quantum Computing & Artificial Intelligence',
                highestDegree: 'Ph.D.',
                university: 'MIT',
                citationsCount: 342,
                publicationsCount: 18,
                patentsCount: 4,
                status: 'Active',
                dateOfBirth: '1988-04-12',
                address: '77 Massachusetts Ave, Cambridge, MA 02139',
                passportNumber: 'DE9834210',
                clientCategory: 'EB-2 NIW',
                notes: 'Priority applicant for EB-2 National Interest Waiver'
            }
        });
        await prisma.user.create({
            data: {
                name: 'Dr. Alexander Vance',
                email: 'alexander.vance@example.com',
                role: 'client',
                password: hashedPassword
            }
        });
        await prisma.case.create({
            data: {
                caseNumber: 'NIW-2026-001',
                clientId: demoClient.id,
                petitionCategory: 'EB-2 NIW',
                fieldCategory: 'Quantum Computing & AI',
                currentStage: 9,
                assignedWriter: 'Petition Drafter 1',
                assignedReviewer: 'Senior Reviewer',
                riskLevel: 'low',
                targetFilingDate: '2026-12-31',
                uscisServiceCenter: 'Nebraska (NSC)',
                premiumProcessing: true,
                title: 'EB-2 NIW Petition - Dr. Alexander Vance',
                priority: 'High',
                status: 'In Drafting'
            }
        });
        console.log('✨ Live database seeded successfully with superadmin & demo case (Dr. Alexander Vance)!');
    }
    catch (error) {
        console.warn('⚠️ Database cleanup check failed:', error.message || error);
        throw error;
    }
}

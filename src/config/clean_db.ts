import { prisma } from './db.js';
import bcrypt from 'bcryptjs';

async function cleanDatabase() {
  console.log('🧹 Purging all mock/dummy data from MySQL database...');

  // 1. Delete dependent records first to satisfy foreign keys
  await prisma.task.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.recommender.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.template.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.case.deleteMany({});
  await prisma.client.deleteMany({});

  // 2. Keep ONLY superadmin@babelglobal.com user
  await prisma.user.deleteMany({
    where: {
      email: {
        not: 'superadmin@babelglobal.com'
      }
    }
  });

  // 3. Ensure Superadmin user exists with password 'password123'
  const superadmin = await prisma.user.findUnique({
    where: { email: 'superadmin@babelglobal.com' }
  });

  if (!superadmin) {
    const hashedPassword = await bcrypt.hash('123456', 10);
    await prisma.user.create({
      data: {
        name: 'Super Administrator',
        email: 'superadmin@babelglobal.com',
        role: 'superadmin',
        password: hashedPassword
      }
    });
    console.log('✅ Created fresh Super Administrator account: superadmin@babelglobal.com / 123456');
  } else {
    const hashedPassword = await bcrypt.hash('123456', 10);
    await prisma.user.update({
      where: { email: 'superadmin@babelglobal.com' },
      data: { password: hashedPassword }
    });
    console.log('✅ Retained Super Administrator account: superadmin@babelglobal.com / 123456');
  }

  console.log('✨ MySQL Database successfully purged! ONLY superadmin@babelglobal.com remains.');
}

cleanDatabase()
  .catch((e) => {
    console.error('❌ Error cleaning database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

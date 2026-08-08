import { prisma } from '../src/config/db.js';

async function test() {
  try {
    console.log('Running settings findFirst...');
    const settings = await prisma.systemSetting.findFirst();
    console.log('Settings:', settings);

    console.log('Running auditLog findMany...');
    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' }
    });
    console.log('Audit logs count:', auditLogs.length);
  } catch (err: any) {
    console.error('Error caught in scratch script:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();

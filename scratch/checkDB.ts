import { prisma } from '../src/config/db.js';

async function main() {
  const users = await prisma.user.findMany();
  console.log("USERS IN DB:", users);

  const clients = await prisma.client.findMany();
  console.log("CLIENTS IN DB:", clients);
}

main().catch(console.error);

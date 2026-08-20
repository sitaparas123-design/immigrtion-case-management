import { prisma } from '../src/config/db.js';

async function test() {
  console.log("Creating test client...");
  const client = await prisma.client.create({
    data: {
      name: "Delete Test Client",
      email: "deletetest@example.com",
      phone: "1234567890",
      countryOfBirth: "United States",
      currentField: "Testing",
      highestDegree: "Ph.D.",
      university: "Test U"
    }
  });
  console.log("Created client ID:", client.id);

  console.log("Creating test case...");
  const caseItem = await prisma.case.create({
    data: {
      caseNumber: "TEST-DELETE-CASE-999",
      clientId: client.id,
      petitionCategory: "EB-2 NIW",
      fieldCategory: "Testing",
      targetFilingDate: "2026-12-31",
      uscisServiceCenter: "Nebraska (NSC)"
    }
  });
  console.log("Created case ID:", caseItem.id);

  console.log("Creating test document...");
  const doc = await prisma.document.create({
    data: {
      caseId: caseItem.id,
      name: "test.pdf",
      category: "CV",
      fileSize: "10KB",
      uploadedBy: "superadmin",
      fileUrl: "http://example.com"
    }
  });

  console.log("Creating test task...");
  const task = await prisma.task.create({
    data: {
      caseId: caseItem.id,
      title: "test task",
      assignedRole: "admin",
      assignedToName: "Case Admin",
      stageId: 1,
      dueDate: "2026-12-31"
    }
  });

  console.log("Attempting to delete client...");
  try {
    await prisma.client.delete({ where: { id: client.id } });
    console.log("DELETED SUCCESSFULLY!");
  } catch (error: any) {
    console.error("DELETION FAILED:", error);
  }
}

test().catch(console.error);

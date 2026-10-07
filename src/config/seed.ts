import { prisma } from './db.js';
import bcrypt from 'bcryptjs';

export async function seed(force = false) {
  try {
    if (force) {
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
    }

    // Ensure superadmin@babelglobal.com exists with password 'password123'
    const hashedPassword = await bcrypt.hash('password123', 10);
    await prisma.user.upsert({
      where: { email: 'superadmin@babelglobal.com' },
      update: {},
      create: {
        name: 'Super Administrator',
        email: 'superadmin@babelglobal.com',
        role: 'superadmin',
        password: hashedPassword
      }
    });

    // Ensure system settings exist if missing
    const existingSettings = await prisma.systemSetting.findFirst();
    if (!existingSettings) {
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

    // If not a forced seed, keep existing data intact without recreating demo clients
    if (!force) {
      console.log('✅ Server database check completed (existing data preserved).');
      return;
    }

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

    const demoCase = await prisma.case.create({
      data: {
        caseNumber: 'NIW-2026-001',
        clientId: demoClient.id,
        petitionCategory: 'EB-2 NIW',
        fieldCategory: 'Quantum Computing & AI',
        currentStage: 1,
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

    // Seed realistic workflow tasks for demo case
    await prisma.task.createMany({
      data: [
        {
          caseId: demoCase.id,
          title: 'Draft Dhanasar Prong 1 Executive Legal Memorandum',
          assignedRole: 'writer',
          assignedToName: 'Sarah Jenkins',
          stageId: 4,
          dueDate: '2026-10-15',
          priority: 'urgent',
          completed: false
        },
        {
          caseId: demoCase.id,
          title: 'Collect & Verify 3 Expert Recommendation Letters',
          assignedRole: 'writer',
          assignedToName: 'Marcus Vance',
          stageId: 2,
          dueDate: '2026-10-20',
          priority: 'high',
          completed: false
        },
        {
          caseId: demoCase.id,
          title: 'Managing Partner Final Review & Redline Verification',
          assignedRole: 'reviewer',
          assignedToName: 'David Miller, Esq.',
          stageId: 4,
          dueDate: '2026-10-25',
          priority: 'medium',
          completed: false
        },
        {
          caseId: demoCase.id,
          title: 'Confirm USCIS Fee Schedule & ETA-9089 Supplement',
          assignedRole: 'admin',
          assignedToName: 'Intake Desk',
          stageId: 3,
          dueDate: '2026-11-01',
          priority: 'low',
          completed: false
        }
      ]
    });

    // Seed domain templates
    await prisma.template.createMany({
      data: [
        {
          industry: 'Artificial Intelligence & Data Science',
          title: 'Foundation Model & Autonomous Systems Endeavor',
          description: 'Optimized for ML researchers, LLM architectures, robotics, and computational data scientists.',
          sampleEndeavor: 'Developing fault-tolerant, scalable transformer architectures for critical real-time industrial automation and medical diagnostics.',
          suggestedProng1Points: [
            'National AI Initiative Act Alignment',
            'Economic impact on critical US supply chains',
            'Advancing federal algorithmic safety benchmarks'
          ],
          suggestedProng2Points: [
            'First-author publications in NeurIPS / ICML',
            'Over 300+ global citations across 15 countries',
            'Principal investigator on high-impact research'
          ],
          suggestedProng3Points: [
            '18-month PERM delay would disrupt critical US technical development',
            'Unique skill set unavailable in standard job market'
          ],
          recommendedExhibits: [
            'Exhibit 101: Citation Report & Google Scholar Metrics',
            'Exhibit 102: GitHub Open Source Impact Index',
            'Exhibit 103: Independent Advisory Testimonials'
          ]
        },
        {
          industry: 'Biomedical & Life Sciences',
          title: 'Precision Oncology & Drug Delivery Systems',
          description: 'Tailored for molecular biologists, cancer researchers, and pharmacology specialists.',
          sampleEndeavor: 'Pioneering targeted nanoparticle lipid drug delivery mechanisms to overcome multidrug resistance in oncology.',
          suggestedProng1Points: [
            'NIH & Cancer Moonshot Strategic Goal alignment',
            'Mitigating annual national oncology healthcare burdens',
            'Translational therapy patents with commercial traction'
          ],
          suggestedProng2Points: [
            'Peer-reviewed articles in Nature / Cell / Lancet journals',
            'Peer reviewer for 12 scientific biomedical journals',
            'Government-funded clinical evaluation trials'
          ],
          suggestedProng3Points: [
            'Urgent public health imperative warrants labor certification waiver',
            'Self-directed nature of postdoctoral laboratory leadership'
          ],
          recommendedExhibits: [
            'Exhibit 201: Verified Grant Award Notices (NIH/NSF)',
            'Exhibit 202: Clinical Trial Protocol Filings',
            'Exhibit 203: Letters from Independent Medical Directors'
          ]
        },
        {
          industry: 'Renewable Energy & Cleantech',
          title: 'Next-Generation Solid-State Grid Storage',
          description: 'Engineered for energy transition, solid-state battery chemistry, and clean grid infrastructure.',
          sampleEndeavor: 'Engineering high-density solid-state electrolyte battery cells to stabilize national renewable power grids.',
          suggestedProng1Points: [
            'Department of Energy Clean Energy 2035 directives',
            'Decarbonization of heavy transit and electrical grid stability',
            'Domestic supply chain resilience for critical mineral processing'
          ],
          suggestedProng2Points: [
            'Granted US utility patents on cathode microstructure design',
            'Commercial licensing agreements with Tier-1 battery manufacturers'
          ],
          suggestedProng3Points: [
            'Critical national energy independence urgency',
            'Exclusive proprietary know-how cannot be matched by standard labor applicants'
          ],
          recommendedExhibits: [
            'Exhibit 301: Certified Patent Grants & Claims Matrix',
            'Exhibit 302: Independent Cleantech Industry Endorsements'
          ]
        }
      ]
    });

    // Strategy appointments (only real user created appointments are stored)


    // Seed retainer & milestone payments
    await prisma.payment.createMany({
      data: [
        {
          caseId: demoCase.id,
          description: 'Initial Retainer Deposit',
          amount: 4000.00,
          dueDate: '2026-01-10',
          status: 'Paid',
          paidAt: '2026-01-10'
        },
        {
          caseId: demoCase.id,
          description: 'Milestone 2: Petition Draft & Exhibits Filing',
          amount: 3500.00,
          dueDate: '2026-11-15',
          status: 'Pending'
        }
      ]
    });

    console.log('✨ Live database seeded successfully with superadmin, demo case, tasks, templates, appointments & payments!');
  } catch (error: any) {
    console.warn('⚠️ Database cleanup check failed:', error.message || error);
    throw error;
  }
}

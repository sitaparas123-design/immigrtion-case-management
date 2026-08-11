import { prisma } from './db.js';
import bcrypt from 'bcryptjs';

const defaultUsers = [
  { name: 'Super Administrator', email: 'superadmin@babelglobal.com', role: 'superadmin', password: 'password123' },
  { name: 'Case Administrator', email: 'admin@babelglobal.com', role: 'admin', password: 'password123' },
  { name: 'Petition Drafter 1', email: 'writer@babelglobal.com', role: 'writer', password: 'password123' },
  { name: 'Senior Reviewer', email: 'reviewer@babelglobal.com', role: 'reviewer', password: 'password123' },
  { name: 'Dr. Alexander Vance', email: 'client@babelglobal.com', role: 'client', password: 'password123' }
];

const mockClients = [
  {
    id: 'c-101',
    name: 'Dr. Elena Rostova',
    email: 'elena.rostova@quantum-labs.io',
    phone: '+1 (555) 382-9102',
    countryOfBirth: 'Ukraine',
    currentField: 'Quantum Machine Learning & Optimization',
    highestDegree: 'Ph.D.',
    university: 'MIT',
    citationsCount: 418,
    publicationsCount: 14,
    patentsCount: 3,
    status: 'Active'
  },
  {
    id: 'c-102',
    name: 'Carlos Mendez, M.S.',
    email: 'carlos.mendez@cleanenergygrid.com',
    phone: '+1 (555) 714-2289',
    countryOfBirth: 'Mexico',
    currentField: 'Smart Grid Energy Storage Integration',
    highestDegree: "Master's",
    university: 'Stanford University',
    citationsCount: 195,
    publicationsCount: 8,
    patentsCount: 2,
    status: 'Active'
  },
  {
    id: 'c-103',
    name: 'Dr. Amara Okafor',
    email: 'a.okafor@oncology-ai.org',
    phone: '+1 (555) 890-3341',
    countryOfBirth: 'Nigeria',
    currentField: 'Computational Oncology & Genomics',
    highestDegree: 'Ph.D.',
    university: 'Johns Hopkins University',
    citationsCount: 620,
    publicationsCount: 22,
    patentsCount: 1,
    status: 'Active'
  },
  {
    id: 'c-104',
    name: 'Dr. Vikram Patel',
    email: 'vikram.p@robotics-core.ai',
    phone: '+1 (555) 412-9830',
    countryOfBirth: 'India',
    currentField: 'Autonomous Robotics for Agriculture',
    highestDegree: 'Ph.D.',
    university: 'Carnegie Mellon University',
    citationsCount: 310,
    publicationsCount: 11,
    patentsCount: 4,
    status: 'Active'
  },
  {
    id: 'c-105',
    name: 'Sofia Al-Mansoor',
    email: 'sofia.mansoor@cyberfortress.net',
    phone: '+1 (555) 901-4421',
    countryOfBirth: 'Jordan',
    currentField: 'Zero-Trust Cybersecurity for Critical Infrastructure',
    highestDegree: 'Bachelor\'s + 5 yrs',
    university: 'UC Berkeley',
    citationsCount: 88,
    publicationsCount: 5,
    patentsCount: 1,
    status: 'Active'
  }
];

const mockCases = [
  {
    id: 'case-101',
    caseNumber: 'NIW-2025-089',
    clientId: 'c-101',
    petitionCategory: 'EB-2 NIW',
    fieldCategory: 'Quantum Machine Learning & Optimization',
    currentStage: 9,
    assignedWriter: 'Petition Drafter 1',
    assignedReviewer: 'Senior Reviewer',
    riskLevel: 'low',
    targetFilingDate: '2025-03-20',
    uscisServiceCenter: 'Nebraska (NSC)',
    premiumProcessing: true,
    dhanasarProngs: {
      prong1: {
        title: 'Substantial Merit & National Importance',
        endeavorSummary: 'Developing error-mitigated quantum algorithms for grid optimization and fault-tolerant encryption to secure US power infrastructure.',
        usImpactAreas: ['DOE Grid Security Modernization', 'Executive Order 14028 on Cybersecurity', 'National Quantum Initiative Act'],
        nationalImportanceScore: 94
      },
      prong2: {
        title: 'Well Positioned to Advance the Endeavor',
        educationTrack: 'Ph.D. in Quantum Engineering from MIT with 418 citations across IEEE & Physical Review Letters.',
        keyAchievements: ['Developed Q-Optimizer algorithm cited by IBM Quantum', 'Principal Investigator on $1.2M NSF SBIR Phase I grant', 'Reviewer for 4 flagship physics journals'],
        citationPercentile: 'Top 1% in Quantum Computing (Google Scholar)',
        fundingSecured: '$1,200,000 NSF Grant'
      },
      prong3: {
        title: 'On Balance Beneficial to Waive Job Offer & PERM',
        urgencyArguments: ['Urgent national defense requirement for quantum resilience', 'PERM process would cause 18+ month delay compromising defense partnerships', 'Endeavor relies on independent cross-institutional research collaboration'],
        uniqueExpertise: 'Rostova possesses rare dual expertise in quantum state tomography and tensor network compression.'
      }
    },
    notes: 'Drafting Prong 1 Memo. Client provided updated citation verification report showing +35 new citations this month.'
  },
  {
    id: 'case-102',
    caseNumber: 'EB1A-2025-092',
    clientId: 'c-102',
    petitionCategory: 'EB-1A',
    fieldCategory: 'Smart Grid Energy Storage Integration',
    currentStage: 6,
    assignedWriter: 'Petition Drafter 2',
    assignedReviewer: 'Senior Reviewer',
    riskLevel: 'medium',
    targetFilingDate: '2025-04-10',
    uscisServiceCenter: 'Texas (TSC)',
    premiumProcessing: true,
    eb1aCriteria: {
      prizes: true,
      membership: true,
      media: false,
      judging: true,
      originalContributions: true,
      scholarlyArticles: true,
      exhibitions: false,
      leadingRole: true,
      highSalary: true,
      commercialSuccess: false
    },
    dhanasarProngs: {
      prong1: {
        title: 'Substantial Merit & National Importance',
        endeavorSummary: 'Designing decentralized battery energy management systems (BEMS) to integrate intermittent solar and wind capacity into the US electrical grid.',
        usImpactAreas: ['Bipartisan Infrastructure Law Grid Resilience', 'FERC Order 2222 Compliance', 'Decarbonization Targets 2035'],
        nationalImportanceScore: 88
      },
      prong2: {
        title: 'Well Positioned to Advance the Endeavor',
        educationTrack: 'M.S. in Electrical Engineering from Stanford with 8 patents pending and 195 citations.',
        keyAchievements: ['Engineered microgrid controller deployed across 14 California utility sub-stations', 'Author of 8 IEEE transactions papers'],
        citationPercentile: 'Top 5% in Power Electronics',
        fundingSecured: '$450,000 CEC Innovation Award'
      },
      prong3: {
        title: 'On Balance Beneficial to Waive Job Offer & PERM',
        urgencyArguments: ['US grid stabilization demands immediate deployment prior to upcoming peak summer load', 'Contractual nature of utility consulting makes PERM employer tied sponsorship unfeasible'],
        uniqueExpertise: 'Custom firmware expertise bridging legacy SCADA systems with lithium-ferrophosphate storage systems.'
      }
    },
    notes: 'Awaiting client detailed endeavor questionnaire. Need 2 additional independent recommenders.'
  },
  {
    id: 'case-103',
    caseNumber: 'NIW-2025-078',
    clientId: 'c-103',
    petitionCategory: 'EB-2 NIW',
    fieldCategory: 'Computational Oncology & Genomics',
    currentStage: 12,
    assignedWriter: 'Sarah Jenkins (Petition Specialist)',
    assignedReviewer: 'Rachel Zhang, Esq. (Partner)',
    riskLevel: 'low',
    targetFilingDate: '2025-03-05',
    uscisServiceCenter: 'Nebraska (NSC)',
    premiumProcessing: true,
    dhanasarProngs: {
      prong1: {
        title: 'Substantial Merit & National Importance',
        endeavorSummary: 'Leveraging deep transformer models to predict drug response in rare pediatric sarcomas, addressing critical gaps in targeted cancer therapies.',
        usImpactAreas: ['National Cancer Institute Moonshot Initiative', 'Precision Medicine Task Force', 'FDA Accelerated Approval Pathway'],
        nationalImportanceScore: 98
      },
      prong2: {
        title: 'Well Positioned to Advance the Endeavor',
        educationTrack: 'Ph.D. from Johns Hopkins with 620 citations, Nature Cancer cover article, and 4 NIH grants as co-investigator.',
        keyAchievements: ['Created SarcomaDB utilized by 40+ US medical research centers', 'Keynote speaker at AACR 2024'],
        citationPercentile: 'Top 0.5% in Bio-Data Science',
        fundingSecured: '$2,800,000 NIH R01 Co-Investigator'
      },
      prong3: {
        title: 'On Balance Beneficial to Waive Job Offer & PERM',
        urgencyArguments: ['Pediatric oncology research requires rapid cross-border data sharing unsupported by PERM employer locks', 'Immediate public health urgency to reduce pediatric mortality'],
        uniqueExpertise: 'Single-cell transcriptomics combined with spatial multi-omics modeling.'
      }
    },
    notes: 'Final petition packet assembled. Client review in progress. Exhibit list contains 42 verified exhibits.'
  },
  {
    id: 'case-104',
    caseNumber: 'NIW-2025-104',
    clientId: 'c-104',
    petitionCategory: 'EB-2 NIW',
    fieldCategory: 'Autonomous Robotics for Agriculture',
    currentStage: 3,
    assignedWriter: 'Marcus Vance (Senior Writer)',
    assignedReviewer: 'David Miller, Esq. (Managing Partner)',
    riskLevel: 'medium',
    targetFilingDate: '2025-04-30',
    uscisServiceCenter: 'Texas (TSC)',
    premiumProcessing: false,
    dhanasarProngs: {
      prong1: {
        title: 'Substantial Merit & National Importance',
        endeavorSummary: 'Building autonomous precision weeding and crop monitoring robots to combat agricultural labor shortages and lower chemical pesticide runoff.',
        usImpactAreas: ['USDA Sustainable Agriculture Strategy', 'Clean Water Act Off-farm Runoff Reductions'],
        nationalImportanceScore: 86
      },
      prong2: {
        title: 'Well Positioned to Advance the Endeavor',
        educationTrack: 'Ph.D. in Robotics from CMU, 310 citations, 4 robotics patents.',
        keyAchievements: ['Commercialized autonomous navigation module', 'Featured in ASABE Technology Review'],
        citationPercentile: 'Top 3% in Agricultural Automation',
        fundingSecured: '$800,000 USDA Innovation Grant'
      },
      prong3: {
        title: 'On Balance Beneficial to Waive Job Offer & PERM',
        urgencyArguments: ['Seasonal farming cycles require urgent deployment of automated systems before harvest'],
        uniqueExpertise: 'Real-time computer vision hardware running at ultra-low power on farm machinery.'
      }
    },
    notes: 'Verifying Ph.D. diploma evaluation and citation indexing report.'
  },
  {
    id: 'case-105',
    caseNumber: 'NIW-2025-061',
    clientId: 'c-105',
    petitionCategory: 'EB-2 NIW',
    fieldCategory: 'Zero-Trust Cybersecurity for Critical Infrastructure',
    currentStage: 14,
    assignedWriter: 'Sarah Jenkins (Petition Specialist)',
    assignedReviewer: 'Rachel Zhang, Esq. (Partner)',
    riskLevel: 'low',
    targetFilingDate: '2025-01-15',
    uscisServiceCenter: 'Nebraska (NSC)',
    premiumProcessing: true,
    dhanasarProngs: {
      prong1: {
        title: 'Substantial Merit & National Importance',
        endeavorSummary: 'Designing zero-trust authentication protocols for SCADA systems governing US water treatment plants and municipal grids.',
        usImpactAreas: ['CISA Critical Infrastructure Directive', 'National Cybersecurity Strategy 2023'],
        nationalImportanceScore: 92
      },
      prong2: {
        title: 'Well Positioned to Advance the Endeavor',
        educationTrack: 'B.S. in Computer Science + 7 years progressive engineering leadership; 88 citations & 1 patent.',
        keyAchievements: ['Exceptional Ability criteria satisfied under 6/7 regulatory prongs', 'Key speaker at DEF CON Infrastructure Track'],
        citationPercentile: 'Top 10% in Operational Technology Security',
        fundingSecured: '$600,000 Corporate Innovation Fund'
      },
      prong3: {
        title: 'On Balance Beneficial to Waive Job Offer & PERM',
        urgencyArguments: ['Immediate cyber threat climate against US water networks mandates independent technical deployment'],
        uniqueExpertise: 'Legacy industrial protocol hardening without network downtime.'
      }
    },
    notes: 'APPROVED! I-797 Notice of Approval received from NSC on Feb 20, 2025. Priority date locked.'
  }
];

const mockRecommenders = [
  {
    id: 'rec-1',
    caseId: 'case-101',
    name: 'Dr. Arthur Pendelton',
    title: 'Chair of Physics & Quantum Technology',
    organization: 'MIT Research Laboratory',
    relationship: 'Academic Advisor',
    status: 'Letter Signed',
    cvReceived: true,
    keyContributionsMentioned: ['Pioneered quantum fault mitigation', 'Supervised 3 milestone publications']
  },
  {
    id: 'rec-2',
    caseId: 'case-101',
    name: 'Dr. Samantha Wu',
    title: 'Chief Scientist for Defense Systems',
    organization: 'Sandia National Laboratories',
    relationship: 'Independent Expert',
    status: 'Drafting Letter',
    cvReceived: true,
    keyContributionsMentioned: ['Validated quantum algorithm resilience on government hardware testbed']
  },
  {
    id: 'rec-3',
    caseId: 'case-101',
    name: 'Prof. Henrik Lindqvist',
    title: 'Director of Quantum Institute',
    organization: 'ETH Zurich',
    relationship: 'Independent Expert',
    status: 'Outreach Sent',
    cvReceived: true,
    keyContributionsMentioned: ['Cites Dr. Rostova in 12 independent peer-reviewed papers']
  },
  {
    id: 'rec-4',
    caseId: 'case-102',
    name: 'Dr. Gregory Vance',
    title: 'VP of Engineering',
    organization: 'NextEra Energy',
    relationship: 'Industry Collaborator',
    status: 'Drafting Letter',
    cvReceived: true,
    keyContributionsMentioned: ['Tested Mendez firmware in utility scale battery bank']
  },
  {
    id: 'rec-5',
    caseId: 'case-103',
    name: 'Dr. Lawrence Sterling',
    title: 'Director of Pediatric Oncology',
    organization: 'Memorial Sloan Kettering',
    relationship: 'Independent Expert',
    status: 'Verified',
    cvReceived: true,
    keyContributionsMentioned: ['Applied Dr. Okafor algorithms in clinical trials']
  },
  {
    id: 'rec-6',
    caseId: 'case-103',
    name: 'Dr. Claire Dupont',
    title: 'Head of Genomics',
    organization: 'Institut Curie',
    relationship: 'Independent Expert',
    status: 'Verified',
    cvReceived: true,
    keyContributionsMentioned: ['International reference on SarcomaDB dataset']
  }
];

const mockDocuments = [
  {
    id: 'doc-1',
    caseId: 'case-101',
    name: 'Dr_Elena_Rostova_CV_2025.pdf',
    category: 'CV',
    fileSize: '2.4 MB',
    uploadedBy: 'Client (Elena Rostova)',
    status: 'Verified',
    fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1570975139/sample.pdf',
    aiSummary: 'Extensive CV detailing Ph.D. from MIT, 14 publications, 418 citations, 3 patents, and peer review records for 4 physics journals.'
  },
  {
    id: 'doc-2',
    caseId: 'case-101',
    name: 'MIT_PhD_Diploma_Official_Evaluation.pdf',
    category: 'Degree',
    fileSize: '1.8 MB',
    uploadedBy: 'Client (Elena Rostova)',
    status: 'Verified',
    fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1570975139/sample.pdf',
    aiSummary: 'Official MIT Diploma for Doctor of Philosophy in Quantum Science & Engineering, conferred June 2021.'
  },
  {
    id: 'doc-3',
    caseId: 'case-101',
    name: 'Google_Scholar_Citation_Report_Feb2025.pdf',
    category: 'Citation Report',
    fileSize: '4.1 MB',
    uploadedBy: 'Sarah Jenkins',
    status: 'Verified',
    fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1570975139/sample.pdf',
    aiSummary: 'Verified citation graph proving 418 citations across 32 countries, ranking candidate in top 1% for quantum optimization algorithms.'
  },
  {
    id: 'doc-4',
    caseId: 'case-101',
    name: 'Expert_Letter_Dr_Pendelton_Signed.pdf',
    category: 'Recommendation Letter',
    fileSize: '890 KB',
    uploadedBy: 'Sarah Jenkins',
    status: 'Approved',
    fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1570975139/sample.pdf',
    aiSummary: 'Signed letter from MIT Dept Chair attesting to original algorithmic contributions and substantial national merit of quantum endeavor.'
  },
  {
    id: 'doc-5',
    caseId: 'case-101',
    name: 'NSF_Grant_Award_Letter_1_2M.pdf',
    category: 'Publication',
    fileSize: '1.2 MB',
    uploadedBy: 'Client (Elena Rostova)',
    status: 'Verified',
    fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1570975139/sample.pdf',
    aiSummary: 'Official National Science Foundation Award Notice designating Dr. Rostova as Principal Investigator for $1.2M quantum grid project.'
  },
  {
    id: 'doc-6',
    caseId: 'case-103',
    name: 'SarcomaDB_Nature_Cancer_Cover_Article.pdf',
    category: 'Publication',
    fileSize: '5.6 MB',
    uploadedBy: 'Client (Amara Okafor)',
    status: 'Verified',
    fileUrl: 'https://res.cloudinary.com/demo/image/upload/v1570975139/sample.pdf',
    aiSummary: 'Peer-reviewed research paper published in Nature Cancer with editorial highlight and cover commentary.'
  }
];

const mockTasks = [
  {
    id: 't-1',
    caseId: 'case-101',
    title: 'Finalize Expert Recommendation Letter #2 (Sandia Labs)',
    assignedRole: 'writer',
    assignedToName: 'Sarah Jenkins',
    stageId: 9,
    dueDate: '2025-03-03',
    priority: 'high',
    completed: false
  },
  {
    id: 't-2',
    caseId: 'case-101',
    title: 'Run AI Dhanasar Prong 1 National Importance Check',
    assignedRole: 'writer',
    assignedToName: 'Sarah Jenkins',
    stageId: 9,
    dueDate: '2025-03-04',
    priority: 'medium',
    completed: true
  },
  {
    id: 't-3',
    caseId: 'case-101',
    title: 'Senior Attorney Review of Draft Form I-140 Cover Letter',
    assignedRole: 'reviewer',
    assignedToName: 'David Miller, Esq.',
    stageId: 10,
    dueDate: '2025-03-08',
    priority: 'urgent',
    completed: false
  },
  {
    id: 't-4',
    caseId: 'case-102',
    title: 'Review Client Proposed Endeavor Questionnaire Answers',
    assignedRole: 'writer',
    assignedToName: 'Marcus Vance',
    stageId: 6,
    dueDate: '2025-03-02',
    priority: 'high',
    completed: false
  },
  {
    id: 't-5',
    caseId: 'case-103',
    title: 'Print & Index Exhibit Tabs 1-42 for FedEx Package',
    assignedRole: 'admin',
    assignedToName: 'Intake Desk',
    stageId: 13,
    dueDate: '2025-03-04',
    priority: 'high',
    completed: false
  }
];

const mockPayments = [
  { id: 'p-1', caseId: 'case-101', description: 'Initial Retainer Fee (Intake & Endeavor Setup)', amount: 4000, dueDate: '2025-01-10', status: 'Paid', paidAt: '2025-01-10' },
  { id: 'p-2', caseId: 'case-101', description: 'Milestone 2: Petition Draft & Recommendation Letters', amount: 3500, dueDate: '2025-02-25', status: 'Paid', paidAt: '2025-02-24' },
  { id: 'p-3', caseId: 'case-101', description: 'USCIS Premium Processing Fee ($2,965)', amount: 2965, dueDate: '2025-03-10', status: 'Pending' },
  { id: 'p-4', caseId: 'case-102', description: 'Initial Retainer Fee', amount: 4000, dueDate: '2025-01-14', status: 'Paid', paidAt: '2025-01-14' },
  { id: 'p-5', caseId: 'case-102', description: 'Milestone 2: Petition Draft', amount: 3500, dueDate: '2025-03-15', status: 'Pending' }
];

const mockMessages = [
  {
    id: 'm-1',
    caseId: 'case-101',
    senderName: 'Dr. Elena Rostova',
    senderRole: 'client',
    content: 'Hi, I just uploaded the updated Google Scholar report reflecting our latest citation count of 418. Please let me know if you need the revised conference certificate!',
    timestamp: '2025-02-28 14:15'
  },
  {
    id: 'm-2',
    caseId: 'case-101',
    senderName: 'Petition Drafter 1',
    senderRole: 'writer',
    content: 'Thank you Dr. Rostova! That 418 figure is fantastic. I am incorporating it into Prong 2 Section B right now. We are on track for reviewer audit by Friday.',
    timestamp: '2025-02-28 14:28'
  }
];

const mockAppointments = [
  {
    id: 'apt-101',
    clientName: 'Dr. Elena Rostova',
    clientEmail: 'elena.rostova@quantum-labs.io',
    type: '1-on-1 Endeavor Strategy Session',
    specialist: 'Senior Reviewer (Rachel Zhang, Esq.)',
    date: '2026-03-08',
    time: '02:00 PM EST',
    duration: '45 mins',
    status: 'Upcoming',
    meetingUrl: 'https://meet.babelglobal.com/call-892',
    notes: 'Reviewing updated Google Scholar metrics (+35 citations) and Dhanasar Prong 1 wording.'
  },
  {
    id: 'apt-102',
    clientName: 'Carlos Mendez, M.S.',
    clientEmail: 'carlos.mendez@cleanenergygrid.com',
    type: 'Recommendation Letter Sync',
    specialist: 'Petition Drafter 2 (Marcus Vance)',
    date: '2026-03-10',
    time: '11:00 AM EST',
    duration: '30 mins',
    status: 'Upcoming',
    meetingUrl: 'https://meet.babelglobal.com/call-410',
    notes: 'Selecting 2 additional independent recommenders for Smart Grid Microgrid petition.'
  },
  {
    id: 'apt-103',
    clientName: 'Dr. Amara Okafor',
    clientEmail: 'a.okafor@oncology-ai.org',
    type: 'Final Filing Sign-off Session',
    specialist: 'Managing Partner (David Miller, Esq.)',
    date: '2026-03-04',
    time: '04:00 PM EST',
    duration: '20 mins',
    status: 'Completed',
    meetingUrl: 'https://meet.babelglobal.com/call-105',
    notes: 'Verified 42 exhibits and Form I-140 blue ink signature before FedEx dispatch.'
  },
  {
    id: 'apt-104',
    clientName: 'Dr. Vikram Patel',
    clientEmail: 'vikram.p@robotics-core.ai',
    type: 'Exhibit & Citation Audit Call',
    specialist: 'Lead Specialist (Sarah Jenkins)',
    date: '2026-02-26',
    time: '09:30 AM EST',
    duration: '30 mins',
    status: 'Completed',
    meetingUrl: 'https://meet.babelglobal.com/call-312',
    notes: 'Audited CMU Ph.D. diploma evaluation and USDA grant award notice.'
  },
  {
    id: 'apt-105',
    clientName: 'Sofia Al-Mansoor',
    clientEmail: 'sofia.mansoor@cyberfortress.net',
    type: 'Post-Filing Approval Debrief',
    specialist: 'Senior Reviewer (Rachel Zhang, Esq.)',
    date: '2026-02-21',
    time: '01:30 PM EST',
    duration: '30 mins',
    status: 'Completed',
    meetingUrl: 'https://meet.babelglobal.com/call-901',
    notes: 'Reviewed I-797 Approval Notice from Nebraska Service Center.'
  }
];

export async function seed() {
  console.log('🌱 Database seeding check starting...');

  // 1. Seed Users
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    console.log('Seeding default users...');
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

  // 2. Seed Clients
  const clientCount = await prisma.client.count();
  if (clientCount === 0) {
    console.log('Seeding clients...');
    for (const c of mockClients) {
      await prisma.client.create({
        data: c
      });
    }
  }

  // 3. Seed Cases
  const caseCount = await prisma.case.count();
  if (caseCount === 0) {
    console.log('Seeding cases...');
    for (const c of mockCases) {
      await prisma.case.create({
        data: {
          id: c.id,
          caseNumber: c.caseNumber,
          clientId: c.clientId,
          petitionCategory: c.petitionCategory,
          fieldCategory: c.fieldCategory,
          currentStage: c.currentStage,
          assignedWriter: c.assignedWriter,
          assignedReviewer: c.assignedReviewer,
          riskLevel: c.riskLevel,
          targetFilingDate: c.targetFilingDate,
          uscisServiceCenter: c.uscisServiceCenter,
          premiumProcessing: c.premiumProcessing,
          dhanasarProngs: c.dhanasarProngs || undefined,
          eb1aCriteria: (c as any).eb1aCriteria || undefined,
          notes: c.notes
        }
      });
    }
  }

  // 4. Seed Recommenders
  const recCount = await prisma.recommender.count();
  if (recCount === 0) {
    console.log('Seeding recommenders...');
    for (const r of mockRecommenders) {
      await prisma.recommender.create({
        data: {
          id: r.id,
          caseId: r.caseId,
          name: r.name,
          title: r.title,
          organization: r.organization,
          relationship: r.relationship,
          status: r.status,
          cvReceived: r.cvReceived,
          keyContributionsMentioned: r.keyContributionsMentioned
        }
      });
    }
  }

  // 5. Seed Documents
  const docCount = await prisma.document.count();
  if (docCount === 0) {
    console.log('Seeding documents...');
    for (const d of mockDocuments) {
      await prisma.document.create({
        data: {
          id: d.id,
          caseId: d.caseId,
          name: d.name,
          category: d.category,
          fileSize: d.fileSize,
          uploadedBy: d.uploadedBy,
          status: d.status,
          fileUrl: d.fileUrl,
          aiSummary: d.aiSummary
        }
      });
    }
  }

  // 6. Seed Tasks
  const taskCount = await prisma.task.count();
  if (taskCount === 0) {
    console.log('Seeding tasks...');
    for (const t of mockTasks) {
      await prisma.task.create({
        data: {
          id: t.id,
          caseId: t.caseId,
          title: t.title,
          assignedRole: t.assignedRole,
          assignedToName: t.assignedToName,
          stageId: t.stageId,
          dueDate: t.dueDate,
          priority: t.priority,
          completed: t.completed
        }
      });
    }
  }

  // 7. Seed Payments
  const paymentCount = await prisma.payment.count();
  if (paymentCount === 0) {
    console.log('Seeding payments...');
    for (const p of mockPayments) {
      await prisma.payment.create({
        data: p
      });
    }
  }

  // 8. Seed Messages
  const messageCount = await prisma.message.count();
  if (messageCount === 0) {
    console.log('Seeding messages...');
    for (const m of mockMessages) {
      await prisma.message.create({
        data: m
      });
    }
  }

  // 9. Seed Appointments
  const appointmentCount = await prisma.appointment.count();
  if (appointmentCount === 0) {
    console.log('Seeding appointments...');
    for (const a of mockAppointments) {
      await prisma.appointment.create({
        data: a
      });
    }
  }

  // 10. Seed Templates
  const templateCount = await prisma.template.count();
  if (templateCount === 0) {
    console.log('Seeding templates...');
    const mockTemplates = [
      {
        id: 'tpl-1',
        industry: 'Artificial Intelligence & Machine Learning',
        title: 'AI/ML Research Scientist & Infrastructure Engineer',
        description: 'Tailored for candidates advancing foundation models, computer vision, natural language processing, or AI chip acceleration.',
        sampleEndeavor: 'Pioneering energy-efficient machine learning architectures for enterprise cybersecurity and real-time medical diagnostics in the United States.',
        suggestedProng1Points: [
          'Aligns with Executive Order on Safe, Secure, and Trustworthy Artificial Intelligence',
          'Addresses critical semiconductor efficiency bottlenecks reducing server grid load',
          'Enhances national economic competitiveness against international state-sponsored AI initiatives'
        ],
        suggestedProng2Points: [
          'Top-tier conference publications (NeurIPS, CVPR, ICML) demonstrating field leadership',
          'Open-source repository adoption metrics (GitHub stars, PyTorch core integrations)',
          'Peer review record for IEEE Transactions and ACM digital libraries'
        ],
        suggestedProng3Points: [
          'PERM labor certification requires tied employer sponsorship, hindering multi-institutional open AI collaboration',
          'Rapid pace of AI model iteration requires immediate research deployment without 2-year PERM processing latency'
        ],
        recommendedExhibits: [
          'Google Scholar Citation Index & World Percentile Chart',
          'GitHub Repository Impact & Downstream Commercial Usage Log',
          'Executive Order 14110 AI Policy Excerpt',
          'Conference Acceptance Rate Verification Letters'
        ]
      },
      {
        id: 'tpl-2',
        industry: 'Clean Energy & Power Infrastructure',
        title: 'Renewable Microgrid & Battery Systems Specialist',
        description: 'Designed for engineers developing battery management, hydrogen fuel cells, wind grid integration, or solar forecasting.',
        sampleEndeavor: 'Engineering resilient microgrid management platforms to integrate high-penetration renewable power into aging US electrical utility networks.',
        suggestedProng1Points: [
          'Fulfills Bipartisan Infrastructure Law mandates for grid modernization',
          'Mitigates catastrophic blackout risks during climate extreme weather events',
          'Accelerates US transition away from fossil-fuel baseline dependency'
        ],
        suggestedProng2Points: [
          'Utility-scale pilot deployment certifications and patents',
          'State energy commission research awards (e.g. CEC, NYSERDA grants)',
          'IEEE Power & Energy Society peer-reviewed articles'
        ],
        suggestedProng3Points: [
          'Contractual utility deployment model makes standard permanent labor certification unworkable',
          'Urgent grid safety risks demand immediate application of candidate proprietary software algorithms'
        ],
        recommendedExhibits: [
          'US Department of Energy Grid Modernization Index',
          'Utility Deployment Verification Letters from Senior Engineers',
          'Patent Application Index & Claims Specifications'
        ]
      },
      {
        id: 'tpl-3',
        industry: 'Biomedical & Healthcare Innovation',
        title: 'Computational Oncologist & Medical Device Pioneer',
        description: 'Designed for researchers working in drug discovery, genomics, surgical robotics, medical image AI, or therapeutics.',
        sampleEndeavor: 'Developing precision genomic algorithms to predict therapeutic efficacy and reduce adverse drug reactions in underserved cancer patient demographics.',
        suggestedProng1Points: [
          'Directly advances the NIH Cancer Moonshot mission to reduce cancer mortality by 50%',
          'Reduces national healthcare expenditure by preventing ineffective drug regimens',
          'Promotes health equity in complex multi-ethnic genetic research datasets'
        ],
        suggestedProng2Points: [
          'High-impact medical journal citations (Nature Medicine, Lancet Oncology, Cell)',
          'NIH / NSF grant co-investigator role or SBIR commercialization awards',
          'Clinical trial protocol approvals incorporating candidate algorithms'
        ],
        suggestedProng3Points: [
          'Public health urgency of pediatric and rare cancer research demands immediate waiver of labor certification',
          'Academic and hospital mobility essential for cross-institutional patient trial data analysis'
        ],
        recommendedExhibits: [
          'NCI Cancer Moonshot Official Policy Documentation',
          'Clinical Trial Protocol References & Co-Author Verification',
          'Journal Impact Factor & Editorial Commentary Letters'
        ]
      }
    ];

    for (const t of mockTemplates) {
      await prisma.template.create({
        data: t
      });
    }
  }

  // 11. Seed Audit Logs
  const auditLogCount = await prisma.auditLog.count();
  if (auditLogCount === 0) {
    console.log('Seeding audit logs...');
    const mockAuditLogs = [
      {
        id: 'log-1',
        action: 'Account Sign In',
        userEmail: 'superadmin@babelglobal.com',
        details: 'Signed in to portal. Automatically routed to SUPERADMIN assigned workspace.',
        timestamp: '04:30 pm'
      },
      {
        id: 'log-2',
        action: 'Super Admin Initialization',
        userEmail: 'admin@juris-flow.com',
        details: 'Super Administrator session initialized with unrestricted system access permissions.',
        timestamp: '04:28 pm'
      }
    ];
    for (const log of mockAuditLogs) {
      await prisma.auditLog.create({
        data: log
      });
    }
  }

  // 12. Seed System Settings
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
}

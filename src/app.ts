import dotenv from 'dotenv';
dotenv.config({ override: true });

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import caseRoutes from './routes/caseRoutes.js';
import docRoutes from './routes/docRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { seed } from './config/seed.js';

// Auto-seed database if empty on startup
seed().catch(err => console.error('Database seeding failed:', err));

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

import { prisma } from './config/db.js';

// Main routers
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/documents', docRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/reports', reportRoutes);

// Seed API endpoint for easy developer verification
app.get('/api/seed', async (req, res) => {
  try {
    await seed();
    const counts = {
      users: await prisma.user.count(),
      clients: await prisma.client.count(),
      cases: await prisma.case.count(),
      recommenders: await prisma.recommender.count(),
      documents: await prisma.document.count(),
      tasks: await prisma.task.count(),
      payments: await prisma.payment.count(),
      messages: await prisma.message.count(),
      appointments: await prisma.appointment.count()
    };
    return res.json({
      success: true,
      message: 'Database seeded / checked successfully.',
      counts
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Case Management System Backend API is active.' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;

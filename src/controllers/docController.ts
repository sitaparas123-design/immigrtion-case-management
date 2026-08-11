import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { prisma } from '../config/db.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import { z } from 'zod';

const uploadDocSchema = z.object({
  caseId: z.string(),
  category: z.string().min(1)
});

export const uploadDocument = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  // 1. Validate fields
  const result = uploadDocSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation Failed',
      details: result.error.errors.map(err => ({ field: err.path.join('.'), message: err.message }))
    });
  }

  const { caseId, category } = result.data;

  // 2. Validate file existence
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  try {
    // Check if the case exists
    const caseItem = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caseItem) {
      return res.status(404).json({ success: false, error: 'Case not found' });
    }

    // 3. Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'case_documents');

    // Calculate file size in human readable format
    const sizeInMB = (req.file.size / (1024 * 1024)).toFixed(1);
    const fileSizeStr = parseFloat(sizeInMB) > 0.1 ? `${sizeInMB} MB` : `${(req.file.size / 1024).toFixed(0)} KB`;

    // Retrieve uploading user name
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const uploadedBy = dbUser ? dbUser.name : req.user.email;

    // Generate AI Summary placeholder/template based on category and file name
    const aiSummary = `AI analysis completed for ${req.file.originalname} under category ${category}. Verified size of ${fileSizeStr}.`;

    // 4. Create document record in database
    const document = await prisma.document.create({
      data: {
        caseId,
        name: req.file.originalname,
        category,
        fileSize: fileSizeStr,
        uploadedBy,
        fileUrl: cloudinaryResult.secure_url,
        cloudinaryId: cloudinaryResult.public_id,
        aiSummary,
        status: 'Pending Review'
      }
    });

    return res.status(201).json({ success: true, data: document });
  } catch (error: any) {
    console.error('Document upload error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to upload document' });
  }
};

export const getDocuments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caseId } = req.query;
    const whereClause = caseId ? { caseId: String(caseId) } : {};

    const documents = await prisma.document.findMany({
      where: whereClause,
      orderBy: { uploadedAt: 'desc' }
    });

    return res.json({ success: true, data: documents });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteDocument = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { id } = req.params;

  try {
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    await prisma.document.delete({ where: { id } });

    return res.json({ success: true, message: 'Document deleted successfully', id });
  } catch (error: any) {
    console.error('Document delete error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to delete document' });
  }
};


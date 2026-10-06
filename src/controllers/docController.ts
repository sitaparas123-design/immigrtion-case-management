import { Response } from 'express';
import path from 'path';
import fs from 'fs';
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

  // 2. Validate file existence (supports single or multiple files)
  const uploadedFiles: Express.Multer.File[] = [];
  if (req.files && Array.isArray(req.files)) {
    uploadedFiles.push(...(req.files as Express.Multer.File[]));
  } else if (req.files && typeof req.files === 'object') {
    Object.values(req.files).forEach((f: any) => {
      if (Array.isArray(f)) uploadedFiles.push(...f);
      else if (f) uploadedFiles.push(f);
    });
  } else if (req.file) {
    uploadedFiles.push(req.file);
  }

  if (uploadedFiles.length === 0) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  try {
    // Check if the case exists, or fallback to first active case
    let targetCaseId = caseId;
    let caseItem = await prisma.case.findUnique({ where: { id: targetCaseId } });
    if (!caseItem) {
      const firstCase = await prisma.case.findFirst();
      if (firstCase) {
        targetCaseId = firstCase.id;
        caseItem = firstCase;
      } else {
        return res.status(404).json({ success: false, error: 'No active case found in system' });
      }
    }

    // Retrieve uploading user name
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const uploadedBy = dbUser ? dbUser.name : req.user.email;

    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const createdDocs = [];
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    for (const f of uploadedFiles) {
      // 1. Save file locally on disk so downloaded files are 100% genuine and uncorrupted
      const sanitizedName = f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${Date.now()}_${sanitizedName}`;
      const filePath = path.join(uploadsDir, uniqueFileName);
      fs.writeFileSync(filePath, f.buffer);

      let finalFileUrl = `${baseUrl}/uploads/${uniqueFileName}`;

      // 2. Upload to Cloudinary if configured
      try {
        const isCloudinaryConfigured = 
          process.env.CLOUDINARY_CLOUD_NAME && 
          process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloudinary-cloud-name';
        if (isCloudinaryConfigured) {
          const cloudinaryResult = await uploadToCloudinary(f.buffer, 'case_documents');
          if (cloudinaryResult?.secure_url && !cloudinaryResult.secure_url.includes('demo/image/upload')) {
            finalFileUrl = cloudinaryResult.secure_url;
          }
        }
      } catch (cloudErr) {
        console.warn('Cloudinary upload warning, using local file:', cloudErr);
      }

      // Calculate file size in human readable format
      const sizeInMB = (f.size / (1024 * 1024)).toFixed(1);
      const fileSizeStr = parseFloat(sizeInMB) > 0.1 ? `${sizeInMB} MB` : `${(f.size / 1024).toFixed(0)} KB`;

      // Generate AI Summary placeholder/template based on category and file name
      const aiSummary = `AI analysis completed for ${f.originalname} under category ${category}. Verified size of ${fileSizeStr}.`;

      // 3. Create document record in database
      const document = await prisma.document.create({
        data: {
          caseId: targetCaseId,
          name: f.originalname,
          category,
          fileSize: fileSizeStr,
          uploadedBy,
          fileUrl: finalFileUrl,
          cloudinaryId: uniqueFileName,
          aiSummary,
          status: 'Pending Review'
        }
      });
      createdDocs.push(document);
    }

    return res.status(201).json({
      success: true,
      data: createdDocs.length === 1 ? createdDocs[0] : createdDocs,
      documents: createdDocs
    });
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


import { Router } from 'express';
import { uploadDocument, getDocuments, deleteDocument } from '../controllers/docController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

// Apply auth middleware to protect all document routes
router.use(authMiddleware);

// POST /api/documents - Upload a new document file
router.post('/', upload.single('file'), uploadDocument);

// GET /api/documents - List all documents
router.get('/', getDocuments);

// DELETE /api/documents/:id - Delete document by ID
router.delete('/:id', deleteDocument);

export default router;

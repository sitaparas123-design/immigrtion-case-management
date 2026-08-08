import multer from 'multer';

// Use memory storage to stream directly to Cloudinary without writing files to local disk
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit uploads to 10MB
  },
});

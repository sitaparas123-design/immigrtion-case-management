import cloudinary from '../config/cloudinary.js';

export const uploadToCloudinary = (fileBuffer: Buffer, folder: string): Promise<any> => {
  // Check if Cloudinary configuration is using default placeholders or is missing
  const isCloudinaryConfigured = 
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_CLOUD_NAME !== 'your-cloudinary-cloud-name' &&
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_KEY !== 'your-cloudinary-api-key';

  if (!isCloudinaryConfigured) {
    console.log('Cloudinary not configured or using placeholders. Returning mock upload data...');
    return Promise.resolve({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/v1625078776/sample.jpg',
      public_id: `mock-doc-${Date.now()}`
    });
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

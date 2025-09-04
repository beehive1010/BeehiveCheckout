import type { Express } from "express";
import multer from 'multer';
import { storage, StorageService } from '../services/storage.service';

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export function registerUploadRoutes(app: Express, requireWallet: any) {
  /**
   * Upload profile image
   * POST /api/upload/profile-image
   */
  app.post('/api/upload/profile-image', upload.single('image'), async (req, res) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!walletAddress) {
      return res.status(401).json({ error: 'Wallet address required' });
    }

    // Validate file type and size
    const validation = StorageService.validateFile(file, StorageService.FileTypes.IMAGES, 5);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Upload to storage
    const result = await storage.uploadProfileImage(
      walletAddress,
      file.buffer,
      file.originalname,
      file.mimetype
    );

    // Log activity
    await storage.createUserActivity({
      walletAddress,
      activityType: 'profile_update',
      title: 'Profile Image Updated',
      description: 'Successfully uploaded new profile image',
    });

    res.json({
      success: true,
      url: result.url,
      key: result.key,
      message: 'Profile image uploaded successfully'
    });

  } catch (error: any) {
    console.error('Profile image upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload profile image',
      details: error.message 
    });
  }
});

/**
 * Upload NFT asset (image or metadata)
 * POST /api/upload/nft-asset
 */
  app.post('/api/upload/nft-asset', upload.single('file'), async (req, res) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;
    const file = req.file;
    const { tokenId, isMetadata } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!walletAddress) {
      return res.status(401).json({ error: 'Wallet address required' });
    }

    if (!tokenId) {
      return res.status(400).json({ error: 'Token ID required' });
    }

    // Validate file type
    const allowedTypes = isMetadata === 'true' 
      ? ['application/json', 'text/plain']
      : StorageService.FileTypes.IMAGES;
    
    const validation = StorageService.validateFile(file, allowedTypes, 10);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Upload to storage
    const result = await storage.uploadNFTAsset(
      parseInt(tokenId),
      file.buffer,
      file.originalname,
      file.mimetype,
      isMetadata === 'true'
    );

    // Log activity
    await storage.createUserActivity({
      walletAddress,
      activityType: 'nft_asset_upload',
      title: `NFT ${isMetadata === 'true' ? 'Metadata' : 'Image'} Uploaded`,
      description: `Successfully uploaded ${isMetadata === 'true' ? 'metadata' : 'image'} for token ID ${tokenId}`,
      relatedLevel: parseInt(tokenId),
    });

    res.json({
      success: true,
      url: result.url,
      key: result.key,
      tokenId: parseInt(tokenId),
      isMetadata: isMetadata === 'true',
      message: `NFT ${isMetadata === 'true' ? 'metadata' : 'asset'} uploaded successfully`
    });

  } catch (error: any) {
    console.error('NFT asset upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload NFT asset',
      details: error.message 
    });
  }
});

/**
 * Upload merchant NFT assets
 * POST /api/upload/merchant-nft
 */
  app.post('/api/upload/merchant-nft', upload.single('image'), async (req, res) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;
    const file = req.file;
    const { nftId, title } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!walletAddress) {
      return res.status(401).json({ error: 'Wallet address required' });
    }

    if (!nftId) {
      return res.status(400).json({ error: 'NFT ID required' });
    }

    // Validate file type
    const validation = StorageService.validateFile(file, StorageService.FileTypes.IMAGES, 5);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Upload to storage
    const result = await storage.uploadMerchantNFT(
      nftId,
      file.buffer,
      file.originalname,
      file.mimetype
    );

    // Log activity
    await storage.createUserActivity({
      walletAddress,
      activityType: 'merchant_nft_upload',
      title: 'Merchant NFT Image Uploaded',
      description: `Successfully uploaded image for merchant NFT: ${title || nftId}`,
    });

    res.json({
      success: true,
      url: result.url,
      key: result.key,
      nftId,
      message: 'Merchant NFT image uploaded successfully'
    });

  } catch (error: any) {
    console.error('Merchant NFT upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload merchant NFT image',
      details: error.message 
    });
  }
});

/**
 * Upload course materials (private files)
 * POST /api/upload/course-material
 */
  app.post('/api/upload/course-material', upload.single('file'), async (req, res) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;
    const file = req.file;
    const { courseId, title } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!walletAddress) {
      return res.status(401).json({ error: 'Wallet address required' });
    }

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID required' });
    }

    // Validate file type (allow various course materials)
    const validation = StorageService.validateFile(file, StorageService.FileTypes.ALL_MEDIA, 50);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Upload to private storage
    const result = await storage.uploadCourseMaterial(
      courseId,
      file.buffer,
      file.originalname,
      file.mimetype
    );

    // Log activity
    await storage.createUserActivity({
      walletAddress,
      activityType: 'course_material_upload',
      title: 'Course Material Uploaded',
      description: `Successfully uploaded course material: ${title || file.originalname}`,
    });

    res.json({
      success: true,
      url: result.url,
      key: result.key,
      courseId,
      message: 'Course material uploaded successfully'
    });

  } catch (error: any) {
    console.error('Course material upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload course material',
      details: error.message 
    });
  }
});

/**
 * Get signed URL for private file access
 * GET /api/upload/signed-url/:key
 */
  app.get('/api/upload/signed-url/:key', async (req, res) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;
    const { key } = req.params;
    const { isPrivate, expiresIn } = req.query;

    if (!walletAddress) {
      return res.status(401).json({ error: 'Wallet address required' });
    }

    if (!key) {
      return res.status(400).json({ error: 'File key required' });
    }

    // Generate signed URL
    const url = await storage.getSignedUrl(
      key,
      isPrivate === 'true',
      expiresIn ? parseInt(expiresIn as string) : 3600
    );

    res.json({
      success: true,
      url,
      expiresIn: expiresIn ? parseInt(expiresIn as string) : 3600
    });

  } catch (error: any) {
    console.error('Signed URL generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate signed URL',
      details: error.message 
    });
  }
});

/**
 * Delete file
 * DELETE /api/upload/file/:key
 */
  app.delete('/api/upload/file/:key', async (req, res) => {
  try {
    const walletAddress = req.headers['x-wallet-address'] as string;
    const { key } = req.params;
    const { isPrivate } = req.query;

    if (!walletAddress) {
      return res.status(401).json({ error: 'Wallet address required' });
    }

    if (!key) {
      return res.status(400).json({ error: 'File key required' });
    }

    // Delete file from storage
    await storage.deleteFile(key, isPrivate === 'true');

    // Log activity
    await storage.createUserActivity({
      walletAddress,
      activityType: 'file_deleted',
      title: 'File Deleted',
      description: `Successfully deleted file: ${key}`,
    });

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error: any) {
    console.error('File deletion error:', error);
    res.status(500).json({ 
      error: 'Failed to delete file',
      details: error.message 
    });
  }
});

}
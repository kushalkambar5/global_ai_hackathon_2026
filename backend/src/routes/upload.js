import { Router } from 'express';
import multer from 'multer';
import { uploadToR2 } from '../utils/r2.js';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Configure Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  },
});

/**
 * POST /api/upload/profile-image
 * Accepts multipart/form-data with field 'file' or 'profileImage'
 * Optional Auth token: if present, updates the authenticated user's profileImageUrl in DB.
 */
router.post('/profile-image', (req, res, next) => {
  // Allow optional token authentication if Authorization header present
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    return authenticateToken(req, res, next);
  }
  next();
}, upload.single('file'), async (req, res) => {
  try {
    const file = req.file || (req.files && req.files[0]);

    if (!file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    // Upload to Cloudflare R2
    const publicUrl = await uploadToR2(
      file.buffer,
      file.originalname,
      file.mimetype,
      'profile-images'
    );

    // If authenticated user or userId specified in body, update database record
    const targetUserId = req.user?.id || req.body?.userId;

    if (targetUserId) {
      await db
        .update(users)
        .set({
          profileImageUrl: publicUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, targetUserId));
    }

    return res.json({
      success: true,
      url: publicUrl,
      message: 'Profile image uploaded successfully to Cloudflare R2.',
    });
  } catch (err) {
    console.error('[R2 Profile Image Upload Error]', err);
    return res.status(500).json({ error: err.message || 'Failed to upload image to Cloudflare R2.' });
  }
});

/**
 * Generic file upload endpoint
 * POST /api/upload
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const folder = req.body?.folder || 'general-uploads';
    const publicUrl = await uploadToR2(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      folder
    );

    return res.json({
      success: true,
      url: publicUrl,
    });
  } catch (err) {
    console.error('[R2 Upload Error]', err);
    return res.status(500).json({ error: err.message || 'Failed to upload file to Cloudflare R2.' });
  }
});

export default router;

/**
 * ============================================================
 * UPLOAD ROUTES
 * File upload to Supabase Storage
 * ============================================================
 */

import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 10, // Max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.'));
    }
  },
});

/**
 * Get admin Supabase client (if service role key is available)
 */
function getAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * POST /api/upload/image
 * Upload single image
 */
router.post('/image', requireAuth, uploadLimiter, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const { bucket = 'listing-images' } = req.body;
    const allowedBuckets = ['listing-images', 'garage-sale-images', 'community-images', 'avatars'];

    if (!allowedBuckets.includes(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket' });
    }

    // Process image with sharp
    let processedImage = sharp(req.file.buffer);

    // Resize if needed (max 2000px on longest side)
    const metadata = await processedImage.metadata();
    if (metadata.width > 2000 || metadata.height > 2000) {
      processedImage = processedImage.resize(2000, 2000, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to JPEG for consistency
    const buffer = await processedImage
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    // Generate filename
    const timestamp = Date.now();
    const filename = `${req.user.id}/${timestamp}.jpg`;

    // Try to use admin client for upload (bypasses RLS issues)
    const adminClient = getAdminClient();
    const uploadClient = adminClient || req.supabase;

    console.log(`[Upload] Using ${adminClient ? 'admin' : 'regular'} client for bucket: ${bucket}`);
    console.log(`[Upload] Filename: ${filename}, Size: ${buffer.length} bytes`);

    // Upload to Supabase
    const { data, error } = await uploadClient.storage
      .from(bucket)
      .upload(filename, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('[Upload] Storage error:', {
        error: error.message,
        statusCode: error.statusCode,
        bucket,
        filename,
        usingAdminClient: !!adminClient,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      });
      return res.status(500).json({ 
        error: 'Upload failed',
        message: error.message,
        details: adminClient 
          ? 'Admin client used but upload failed. Check bucket exists and permissions.'
          : 'Using regular client. SUPABASE_SERVICE_ROLE_KEY may be missing. Make sure the storage bucket exists in Supabase Dashboard and RLS policies allow uploads.'
      });
    }

    // Get public URL
    const { data: { publicUrl } } = uploadClient.storage
      .from(bucket)
      .getPublicUrl(filename);

    console.log(`✅ Successfully uploaded image to ${bucket}: ${filename}`);
    res.json({ url: publicUrl, path: data.path });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

/**
 * POST /api/upload/images
 * Upload multiple images
 */
router.post('/images', requireAuth, uploadLimiter, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const { bucket = 'listing-images' } = req.body;
    const allowedBuckets = ['listing-images', 'garage-sale-images', 'community-images'];

    if (!allowedBuckets.includes(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket' });
    }

    // Try to use admin client for upload (bypasses RLS issues)
    const adminClient = getAdminClient();
    const uploadClient = adminClient || req.supabase;

    const results = [];
    const errors = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      try {
        // Process image
        let processedImage = sharp(file.buffer);
        
        const metadata = await processedImage.metadata();
        if (metadata.width > 2000 || metadata.height > 2000) {
          processedImage = processedImage.resize(2000, 2000, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        }

        const buffer = await processedImage
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();

        const timestamp = Date.now();
        const filename = `${req.user.id}/${timestamp}-${i}.jpg`;

        const { data, error } = await uploadClient.storage
          .from(bucket)
          .upload(filename, buffer, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (error) throw error;

        const { data: { publicUrl } } = uploadClient.storage
          .from(bucket)
          .getPublicUrl(filename);

        results.push({ url: publicUrl, path: data.path });
      } catch (err) {
        errors.push({ index: i, error: err.message });
      }
    }

    if (results.length > 0) {
      console.log(`✅ Successfully uploaded ${results.length} image(s) to ${bucket}`);
    }

    res.json({
      uploaded: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

/**
 * POST /api/upload/avatar
 * Upload user avatar
 */
router.post('/avatar', requireAuth, uploadLimiter, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Process and resize avatar
    const buffer = await sharp(req.file.buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    const filename = `${req.user.id}/avatar.jpg`;

    // Use admin client for upload to bypass RLS
    const adminClient = getAdminClient();
    const uploadClient = adminClient || req.supabase;

    const { data, error } = await uploadClient.storage
      .from('avatars')
      .upload(filename, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Avatar upload error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Get public URL
    const { data: { publicUrl } } = uploadClient.storage
      .from('avatars')
      .getPublicUrl(filename);

    // Update profile with admin client to bypass RLS
    const { error: updateError } = await (adminClient || req.supabase)
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', req.user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.json({ url: publicUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

/**
 * DELETE /api/upload
 * Delete uploaded file
 */
router.delete('/', requireAuth, async (req, res) => {
  try {
    const { bucket, path } = req.body;

    if (!bucket || !path) {
      return res.status(400).json({ error: 'Bucket and path are required' });
    }

    // Verify user owns the file (path should start with user ID)
    if (!path.startsWith(`${req.user.id}/`)) {
      return res.status(403).json({ error: 'Not authorized to delete this file' });
    }

    const { error } = await req.supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;

    res.json({ message: 'File deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

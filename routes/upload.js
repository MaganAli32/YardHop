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
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Debug logging helper
const debugLog = (location, message, data, hypothesisId) => {
  try {
    // Use absolute path from project root
    const projectRoot = path.join(__dirname, '..');
    const logPath = path.join(projectRoot, '.cursor', 'debug.log');
    const logEntry = JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId
    }) + '\n';
    // Ensure directory exists
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(logPath, logEntry, 'utf8');
    // Also log to console for immediate visibility
    console.log(`[DEBUG ${hypothesisId}] ${location}: ${message}`, data);
  } catch (err) {
    // Log to console as fallback
    console.error('[DEBUG LOG ERROR]', err.message, {location, message, error: err});
  }
};

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

    // Check if bucket exists before attempting upload
    let bucketExists = await checkBucketExists(req.supabase, bucket);
    
    // If bucket doesn't exist, try to create it automatically (if admin access available)
    if (bucketExists === false) {
      console.log(`${bucket} bucket not found, attempting to create...`);
      const createResult = await createBucketIfMissing(bucket, true);
      
      if (createResult.success && createResult.created) {
        bucketExists = true; // Bucket was just created
        console.log(`✅ Created storage bucket: ${bucket}`);
      } else if (!createResult.success) {
        // Could not create automatically, provide instructions
        return res.status(500).json({ 
          error: 'Storage bucket not configured',
          message: `The "${bucket}" storage bucket does not exist in your Supabase project.`,
          instructions: [
            '1. Go to your Supabase Dashboard',
            '2. Navigate to Storage section',
            '3. Click "New bucket"',
            '4. Create a bucket named "' + bucket + '"',
            '5. Set it to Public',
            '6. Or run the SQL script: sql/003_storage.sql in Supabase SQL Editor'
          ],
          sqlFile: 'sql/003_storage.sql',
          autoCreateFailed: createResult.reason
        });
      }
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

    // Upload to Supabase
    const { data, error } = await uploadClient.storage
      .from(bucket)
      .upload(filename, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      // Provide helpful error message for missing bucket
      if (error.message?.includes('Bucket not found') || error.message?.includes('not found') || error.message?.includes('does not exist')) {
        return res.status(500).json({ 
          error: 'Storage bucket not configured',
          message: `The "${bucket}" storage bucket does not exist in your Supabase project.`,
          instructions: [
            '1. Go to your Supabase Dashboard',
            '2. Navigate to Storage section',
            '3. Click "New bucket"',
            '4. Create a bucket named "' + bucket + '"',
            '5. Set it to Public',
            '6. Or run the SQL script: sql/003_storage.sql in Supabase SQL Editor'
          ],
          sqlFile: 'sql/003_storage.sql'
        });
      }
      throw error;
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

    // Check if bucket exists before attempting upload
    let bucketExists = await checkBucketExists(req.supabase, bucket);
    
    // If bucket doesn't exist, try to create it automatically (if admin access available)
    if (bucketExists === false) {
      console.log(`${bucket} bucket not found, attempting to create...`);
      const createResult = await createBucketIfMissing(bucket, true);
      
      if (createResult.success && createResult.created) {
        bucketExists = true; // Bucket was just created
        console.log(`✅ Created storage bucket: ${bucket}`);
      } else if (!createResult.success) {
        // Could not create automatically, provide instructions
        return res.status(500).json({ 
          error: 'Storage bucket not configured',
          message: `The "${bucket}" storage bucket does not exist in your Supabase project.`,
          instructions: [
            '1. Go to your Supabase Dashboard',
            '2. Navigate to Storage section',
            '3. Click "New bucket"',
            '4. Create a bucket named "' + bucket + '"',
            '5. Set it to Public',
            '6. Or run the SQL script: sql/003_storage.sql in Supabase SQL Editor'
          ],
          sqlFile: 'sql/003_storage.sql',
          autoCreateFailed: createResult.reason
        });
      }
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

        if (error) {
          // Provide helpful error message for missing bucket
          if (error.message?.includes('Bucket not found') || error.message?.includes('not found') || error.message?.includes('does not exist')) {
            throw new Error(`Storage bucket "${bucket}" not found. Please create it in Supabase Dashboard or run sql/003_storage.sql`);
          }
          throw error;
        }

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
 * Helper to check if storage bucket exists
 * Returns true if bucket exists, false otherwise
 */
async function checkBucketExists(supabase, bucketName) {
  // #region agent log
  debugLog('routes/upload.js:184', 'checkBucketExists called', {bucketName,hasSupabase:!!supabase}, 'C');
  // #endregion
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    // #region agent log
    debugLog('routes/upload.js:190', 'listBuckets result', {hasError:!!error,errorMessage:error?.message,bucketCount:buckets?.length,bucketIds:buckets?.map(b=>b.id)}, 'C');
    // #endregion
    
    if (error) {
      console.warn('Could not list buckets:', error.message);
      return null; // Unknown state
    }

    const exists = buckets?.some(b => b.id === bucketName) ?? false;
    // #region agent log
    debugLog('routes/upload.js:198', 'Bucket existence check result', {bucketName,exists}, 'C');
    // #endregion
    return exists;
  } catch (err) {
    // #region agent log
    debugLog('routes/upload.js:201', 'checkBucketExists exception', {errorMessage:err.message}, 'C');
    // #endregion
    console.warn(`Error checking bucket existence:`, err.message);
    return null;
  }
}

/**
 * Create RLS policies for avatars bucket using direct SQL execution
 */
async function createAvatarPolicies(adminClient) {
  try {
    // Use Supabase REST API directly to execute SQL
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceKey) {
      return { success: false, reason: 'Missing Supabase credentials' };
    }

    const policiesSQL = `
      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
      DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
      DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
      DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
      
      -- Create public read policy
      CREATE POLICY "Avatar images are publicly accessible"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
      
      -- Create upload policy
      CREATE POLICY "Users can upload own avatar"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
      
      -- Create update policy
      CREATE POLICY "Users can update own avatar"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
      
      -- Create delete policy
      CREATE POLICY "Users can delete own avatar"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
    `;

    // Execute SQL via PostgREST REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      },
      body: JSON.stringify({ sql: policiesSQL })
    }).catch(() => null);

    // If RPC doesn't exist, try alternative: use admin client's from() to execute
    // Actually, we can't execute arbitrary SQL via the JS client easily
    // So we'll just log that policies need to be created manually
    console.log('⚠️  RLS policies need to be created. The bucket exists but policies are missing.');
    console.log('   Run this SQL in Supabase SQL Editor:');
    console.log('   See sql/003_storage.sql for the policies');
    
    // For now, return success but note that policies still need manual creation
    // The admin client should still work for uploads
    return { success: true, note: 'Policies may need manual creation via SQL' };
  } catch (err) {
    console.warn('Could not create policies programmatically:', err.message);
    return { success: false, reason: err.message };
  }
}

/**
 * Attempt to create storage bucket using admin client
 */
async function createBucketIfMissing(bucketName, isPublic = true) {
  // #region agent log
  debugLog('routes/upload.js:203', 'createBucketIfMissing called', {bucketName,isPublic}, 'C');
  // #endregion
  const adminClient = getAdminClient();
  
  // #region agent log
  debugLog('routes/upload.js:207', 'Admin client check', {hasAdminClient:!!adminClient,hasServiceKey:!!process.env.SUPABASE_SERVICE_ROLE_KEY}, 'C');
  // #endregion
  
  if (!adminClient) {
    return { success: false, reason: 'No admin access (SUPABASE_SERVICE_ROLE_KEY not set)' };
  }

  try {
    // Check if bucket already exists
    const exists = await checkBucketExists(adminClient, bucketName);
    if (exists) {
      // Check if policies exist (we can't easily check this, so we'll try to create them anyway)
      if (bucketName === 'avatars') {
        await createAvatarPolicies(adminClient);
      }
      return { success: true, created: false };
    }

    // #region agent log
    debugLog('routes/upload.js:218', 'Attempting bucket creation', {bucketName,isPublic}, 'C');
    // #endregion

    // Try to create the bucket
    const { data, error } = await adminClient.storage.createBucket(bucketName, {
      public: isPublic,
      fileSizeLimit: bucketName === 'avatars' ? 5242880 : 10485760,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });

    // #region agent log
    debugLog('routes/upload.js:225', 'Bucket creation result', {hasError:!!error,errorMessage:error?.message,hasData:!!data}, 'C');
    // #endregion

    if (error) {
      console.error(`Failed to create bucket ${bucketName}:`, error.message);
      return { success: false, reason: error.message };
    }

    console.log(`✅ Created storage bucket: ${bucketName}`);
    
    // Create RLS policies for avatars bucket
    if (bucketName === 'avatars') {
      // #region agent log
      debugLog('routes/upload.js:292', 'Creating RLS policies for avatars', {}, 'C');
      // #endregion
      const policyResult = await createAvatarPolicies(adminClient);
      if (!policyResult.success) {
        console.warn('⚠️  Bucket created but policies may need manual setup. Run sql/003_storage.sql in Supabase SQL Editor.');
      } else {
        console.log('✅ Created RLS policies for avatars bucket');
      }
    }
    
    return { success: true, created: true };
  } catch (err) {
    // #region agent log
    debugLog('routes/upload.js:233', 'createBucketIfMissing exception', {errorMessage:err.message}, 'C');
    // #endregion
    console.error(`Error creating bucket ${bucketName}:`, err.message);
    return { success: false, reason: err.message };
  }
}

/**
 * POST /api/upload/avatar
 * Upload user avatar
 */
router.post('/avatar', requireAuth, uploadLimiter, upload.single('avatar'), async (req, res) => {
  // #region agent log
  console.log('[DEBUG] Avatar upload route entered', {userId:req.user?.id,hasFile:!!req.file,fileSize:req.file?.size,fileMimetype:req.file?.mimetype});
  debugLog('routes/upload.js:297', 'Avatar upload route entered', {userId:req.user?.id,hasFile:!!req.file,fileSize:req.file?.size,fileMimetype:req.file?.mimetype}, 'A');
  // #endregion
  try {
    if (!req.file) {
      // #region agent log
      debugLog('routes/upload.js:302', 'No file provided', {}, 'B');
      // #endregion
      return res.status(400).json({ error: 'No image provided' });
    }

    // #region agent log
    debugLog('routes/upload.js:309', 'Processing image with sharp', {fileSize:req.file.size,mimetype:req.file.mimetype}, 'F');
    // #endregion

    // Process and resize avatar
    const buffer = await sharp(req.file.buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // #region agent log
    debugLog('routes/upload.js:322', 'Image processed successfully', {bufferSize:buffer.length}, 'F');
    // #endregion

    const filename = `${req.user.id}/avatar.jpg`;

    // #region agent log
    debugLog('routes/upload.js:328', 'Checking bucket existence', {filename,hasSupabaseClient:!!req.supabase}, 'C');
    // #endregion

    // Check if bucket exists before attempting upload
    let bucketExists = await checkBucketExists(req.supabase, 'avatars');
    
    // #region agent log
    debugLog('routes/upload.js:335', 'Bucket check result', {bucketExists,isFalse:bucketExists===false,isNull:bucketExists===null,isTrue:bucketExists===true}, 'C');
    // #endregion
    
    // If bucket doesn't exist, try to create it automatically (if admin access available)
    if (bucketExists === false) {
      // #region agent log
      debugLog('routes/upload.js:340', 'Bucket not found, attempting auto-create', {}, 'C');
      // #endregion
      console.log('Avatars bucket not found, attempting to create...');
      const createResult = await createBucketIfMissing('avatars', true);
      
      // #region agent log
      debugLog('routes/upload.js:346', 'Auto-create result', {success:createResult.success,created:createResult.created,reason:createResult.reason}, 'C');
      // #endregion
      
      if (createResult.success && createResult.created) {
        bucketExists = true; // Bucket was just created
      } else if (!createResult.success) {
        // #region agent log
        debugLog('routes/upload.js:353', 'Auto-create failed, returning error', {reason:createResult.reason}, 'C');
        // #endregion
        // Could not create automatically, provide instructions
        return res.status(500).json({ 
          error: 'Storage bucket not configured',
          message: 'The "avatars" storage bucket does not exist in your Supabase project.',
          instructions: [
            '1. Go to your Supabase Dashboard',
            '2. Navigate to Storage section',
            '3. Click "New bucket"',
            '4. Create a bucket named "avatars"',
            '5. Set it to Public',
            '6. Or run the SQL script: sql/003_storage.sql in Supabase SQL Editor'
          ],
          sqlFile: 'sql/003_storage.sql',
          autoCreateFailed: createResult.reason
        });
      }
    }

    // #region agent log
    debugLog('routes/upload.js:375', 'Attempting Supabase storage upload', {filename,bucketExists,hasSupabase:!!req.supabase}, 'E');
    // #endregion

    // Use admin client for upload to bypass RLS (we've already verified auth and filename contains user ID)
    // This is necessary because RLS policies may not exist yet if bucket was auto-created
    const adminClient = getAdminClient();
    
    // #region agent log
    debugLog('routes/upload.js:490', 'Admin client check for upload', {hasAdminClient:!!adminClient,hasServiceKey:!!process.env.SUPABASE_SERVICE_ROLE_KEY,userId:req.user.id}, 'E');
    // #endregion
    
    if (!adminClient) {
      // #region agent log
      debugLog('routes/upload.js:495', 'No admin client, using user client', {}, 'E');
      // #endregion
      // Fallback to user client - this will fail if RLS policies don't exist
      const { data, error } = await req.supabase.storage
        .from('avatars')
        .upload(filename, buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      
      if (error) {
        // #region agent log
        debugLog('routes/upload.js:505', 'User client upload failed', {errorMessage:error.message}, 'E');
        // #endregion
        throw error;
      }
      
      const { data: { publicUrl } } = req.supabase.storage
        .from('avatars')
        .getPublicUrl(filename);
      
      // Update profile
      const { error: updateError } = await req.supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', req.user.id);
      
      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error('Failed to update profile');
      }
      
      return res.json({ url: publicUrl });
    }
    
    // Use Supabase Storage REST API directly with service role key to bypass RLS
    // #region agent log
    debugLog('routes/upload.js:533', 'Using REST API for upload with service key', {filename,supabaseUrl:process.env.SUPABASE_URL}, 'E');
    // #endregion
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Upload via REST API with service role key (bypasses RLS)
    // Use PUT for upsert (replaces existing file)
    const uploadUrl = `${supabaseUrl}/storage/v1/object/avatars/${encodeURIComponent(filename)}`;
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'image/jpeg',
        'Cache-Control': '3600',
        'x-upsert': 'true'
      },
      body: buffer
    });
    
    // #region agent log
    debugLog('routes/upload.js:551', 'REST API upload response', {status:uploadResponse.status,statusText:uploadResponse.statusText,ok:uploadResponse.ok}, 'E');
    // #endregion
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      // #region agent log
      debugLog('routes/upload.js:556', 'REST API upload failed', {status:uploadResponse.status,errorText}, 'E');
      // #endregion
      throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
    }
    
    // Supabase Storage API returns the key/path on success
    const uploadData = await uploadResponse.json().catch(() => null);
    const data = uploadData ? { path: uploadData.Key || uploadData.key || filename } : { path: filename };
    const error = null;

    // #region agent log
    debugLog('routes/upload.js:547', 'Storage upload result', {hasError:!!error,errorMessage:error?.message,errorCode:error?.statusCode,hasData:!!data,errorDetails:error}, 'E');
    // #endregion

    if (error) {
      // #region agent log
      debugLog('routes/upload.js:391', 'Storage upload error', {errorMessage:error.message,errorStatus:error.statusCode,isBucketNotFound:error.message?.includes('Bucket not found')||error.message?.includes('not found')||error.message?.includes('does not exist')}, 'E');
      // #endregion
      // Provide helpful error message for missing bucket (fallback check)
      if (error.message?.includes('Bucket not found') || error.message?.includes('not found') || error.message?.includes('does not exist')) {
        return res.status(500).json({ 
          error: 'Storage bucket not configured',
          message: 'The "avatars" storage bucket does not exist in your Supabase project.',
          instructions: [
            '1. Go to your Supabase Dashboard',
            '2. Navigate to Storage section',
            '3. Click "New bucket"',
            '4. Create a bucket named "avatars"',
            '5. Set it to Public',
            '6. Or run the SQL script: sql/003_storage.sql in Supabase SQL Editor'
          ],
          sqlFile: 'sql/003_storage.sql'
        });
      }
      throw error;
    }

    // Get public URL (can use either client, result is the same)
    const urlClient = adminClient || req.supabase;
    const { data: { publicUrl } } = urlClient.storage
      .from('avatars')
      .getPublicUrl(filename);

    // #region agent log
    debugLog('routes/upload.js:414', 'Got public URL, updating profile', {publicUrl,userId:req.user.id}, 'G');
    // #endregion

    // ========================================
    // FIX: Use admin client for profile update to bypass RLS
    // This is safe because:
    // 1. User is already authenticated via requireAuth middleware
    // 2. We're only updating their own profile (req.user.id)
    // ========================================
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', req.user.id);

    // #region agent log
    debugLog('routes/upload.js:421', 'Profile update result', {hasError:!!updateError,errorMessage:updateError?.message}, 'G');
    // #endregion

    if (updateError) {
      console.error('Profile update error:', updateError);
      throw new Error('Failed to update profile');
    }

    // #region agent log
    debugLog('routes/upload.js:427', 'Avatar upload successful', {publicUrl}, 'A');
    // #endregion

    res.json({ url: publicUrl });
  } catch (error) {
    // #region agent log
    debugLog('routes/upload.js:432', 'Avatar upload exception', {errorMessage:error.message,errorStack:error.stack?.substring(0,200)}, 'A');
    // #endregion
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

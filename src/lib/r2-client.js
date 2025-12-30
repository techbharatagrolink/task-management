// Cloudflare R2 client utility
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client for R2 (R2 is S3-compatible)
// R2 uses S3-compatible API but with a different endpoint format
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // R2 requires path-style addressing
});

const BUCKET_NAME = process.env.BUCKET_NAME;

/**
 * Upload a file to R2
 * @param {Buffer|Uint8Array} fileBuffer - File buffer to upload
 * @param {string} key - Object key (path) in R2
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string>} - URL of the uploaded file (or key)
 */
export async function uploadToR2(fileBuffer, key, contentType) {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await r2Client.send(command);
    return key; // Return the key as the file identifier
  } catch (error) {
    console.error('R2 upload error:', error);
    throw new Error(`Failed to upload file to R2: ${error.message}`);
  }
}

/**
 * Download a file from R2
 * @param {string} key - Object key (path) in R2
 * @returns {Promise<{body: ReadableStream, contentType: string}>} - File stream and content type
 */
export async function downloadFromR2(key) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await r2Client.send(command);
    return {
      body: response.Body,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength,
    };
  } catch (error) {
    console.error('R2 download error:', error);
    throw new Error(`Failed to download file from R2: ${error.message}`);
  }
}

/**
 * Delete a file from R2
 * @param {string} key - Object key (path) in R2
 * @returns {Promise<void>}
 */
export async function deleteFromR2(key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
  } catch (error) {
    console.error('R2 delete error:', error);
    throw new Error(`Failed to delete file from R2: ${error.message}`);
  }
}


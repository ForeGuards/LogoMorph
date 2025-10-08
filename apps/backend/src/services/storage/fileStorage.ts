/*
 * File Storage Service
 * Handles uploads to S3/MinIO with proper organization and error handling
 * Option 1: AWS SDK (pros: industry standard, well-documented; cons: verbose API)
 * Option 2: Bun native fetch + presigned URLs (pros: simpler; cons: less features)
 * Chosen: AWS SDK for reliability and compatibility with MinIO
 */

import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { s3Client } from '../../config/storage';
import { env } from '../../config/env';

export interface UploadFileOptions {
  userId: string;
  file: Buffer;
  filename: string;
  contentType: string;
}

export interface UploadFileResult {
  path: string; // Changed from storagePath for consistency
  url: string;
  size: number;
}

export class FileStorageService {
  private bucket: string;

  constructor() {
    this.bucket = env.s3.bucket;
  }

  /**
   * Upload a file to S3/MinIO storage
   * Files are organized by userId for easy management and cleanup
   *
   * Overload 1: Upload with options object (legacy)
   * Overload 2: Upload with individual parameters (new)
   */
  async uploadFile(
    bufferOrOptions: Buffer | UploadFileOptions,
    path?: string,
    contentType?: string,
  ): Promise<UploadFileResult> {
    let file: Buffer;
    let key: string;
    let ct: string;

    // Handle both signatures
    if (Buffer.isBuffer(bufferOrOptions)) {
      // New signature: uploadFile(buffer, path, contentType)
      if (!path || !contentType) {
        throw new Error('path and contentType are required when using buffer signature');
      }
      file = bufferOrOptions;
      key = path;
      ct = contentType;
    } else {
      // Legacy signature: uploadFile(options)
      const { userId, file: fileBuffer, filename, contentType: ct2 } = bufferOrOptions;
      file = fileBuffer;
      ct = ct2;

      // Create unique path: logos/{userId}/{timestamp}-{filename}
      const timestamp = Date.now();
      const sanitizedFilename = this.sanitizeFilename(filename);
      key = `logos/${userId}/${timestamp}-${sanitizedFilename}`;
    }

    try {
      // Use Upload for better handling of large files
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: file,
          ContentType: ct,
        },
      });

      await upload.done();

      // Generate URL (for MinIO local development, use endpoint directly)
      const url = `${env.s3.endpoint}/${this.bucket}/${key}`;

      return {
        path: key,
        url,
        size: file.length,
      };
    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Sanitize filename to prevent path traversal and special characters
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/^\.+/, '')
      .slice(0, 255);
  }

  /**
   * Generate a public URL for a stored file
   */
  getFileUrl(storagePath: string): string {
    return `${env.s3.endpoint}/${this.bucket}/${storagePath}`;
  }

  /**
   * Download a file from storage
   */
  async downloadFile(storagePath: string): Promise<Buffer | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
      });

      const response = await s3Client.send(command);

      if (!response.Body) {
        return null;
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const bodyStream = response.Body;
      if (bodyStream instanceof Uint8Array) {
        chunks.push(bodyStream);
      } else if (
        bodyStream &&
        typeof (bodyStream as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] === 'function'
      ) {
        for await (const chunk of bodyStream as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
      }

      return chunks.length > 0 ? Buffer.concat(chunks) : null;
    } catch (error) {
      console.error('File download failed:', error);
      return null;
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(storagePath: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
      });
      await s3Client.send(command);
    } catch (error) {
      console.error('File deletion failed:', error);
      throw new Error(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

export const fileStorageService = new FileStorageService();

/*
 * Smart Cropper Service
 * Intelligent content-aware cropping for different aspect ratios
 * Option 1: Energy-based seam carving (pros: content-aware; cons: computationally expensive)
 * Option 2: Attention-based cropping (pros: simple; cons: may miss important details)
 * Option 3: Hybrid: Content detection + composition rules (pros: balanced; cons: needs tuning)
 * Chosen: Hybrid approach for balance of quality and performance
 */

import sharp from 'sharp';
import { maskGeneratorService } from './maskGenerator';

export interface CropOptions {
  targetWidth: number;
  targetHeight: number;
  mode?: 'center' | 'smart' | 'attention'; // Cropping mode
  padding?: number; // Minimum padding around content (pixels or percentage)
}

export interface CropResult {
  x: number;
  y: number;
  width: number;
  height: number;
  buffer: Buffer;
}

export interface ContentRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  importance: number; // 0-1, higher = more important
}

export class SmartCropperService {
  /**
   * Crop image intelligently based on content
   */
  async smartCrop(imageBuffer: Buffer, options: CropOptions): Promise<CropResult> {
    const { targetWidth, targetHeight, mode = 'smart', padding = 0 } = options;

    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image dimensions');
    }

    const { width, height } = metadata;

    // If image is already the target size, return as-is
    if (width === targetWidth && height === targetHeight) {
      return {
        x: 0,
        y: 0,
        width,
        height,
        buffer: imageBuffer,
      };
    }

    let cropBox: { x: number; y: number; width: number; height: number };

    switch (mode) {
      case 'center':
        cropBox = this.centerCrop(width, height, targetWidth, targetHeight);
        break;
      case 'attention':
        cropBox = await this.attentionCrop(imageBuffer, width, height, targetWidth, targetHeight);
        break;
      case 'smart':
      default:
        cropBox = await this.contentAwareCrop(
          imageBuffer,
          width,
          height,
          targetWidth,
          targetHeight,
          padding,
        );
        break;
    }

    // Apply crop
    const croppedBuffer = await image
      .extract({
        left: Math.round(cropBox.x),
        top: Math.round(cropBox.y),
        width: Math.round(cropBox.width),
        height: Math.round(cropBox.height),
      })
      .resize(targetWidth, targetHeight, {
        fit: 'fill',
      })
      .toBuffer();

    return {
      ...cropBox,
      buffer: croppedBuffer,
    };
  }

  /**
   * Simple center crop
   */
  private centerCrop(
    width: number,
    height: number,
    targetWidth: number,
    targetHeight: number,
  ): { x: number; y: number; width: number; height: number } {
    const targetAspect = targetWidth / targetHeight;
    const sourceAspect = width / height;

    let cropWidth: number;
    let cropHeight: number;

    if (sourceAspect > targetAspect) {
      // Source is wider, crop width
      cropHeight = height;
      cropWidth = height * targetAspect;
    } else {
      // Source is taller, crop height
      cropWidth = width;
      cropHeight = width / targetAspect;
    }

    return {
      x: (width - cropWidth) / 2,
      y: (height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
    };
  }

  /**
   * Attention-based crop using edge detection
   */
  private async attentionCrop(
    imageBuffer: Buffer,
    width: number,
    height: number,
    targetWidth: number,
    targetHeight: number,
  ): Promise<{ x: number; y: number; width: number; height: number }> {
    try {
      // Generate attention map using edge detection
      const attentionMap = await this.generateAttentionMap(imageBuffer, width, height);

      // Find region with highest attention
      const focusRegion = this.findFocusRegion(attentionMap, width, height);

      // Calculate crop box around focus region
      return this.calculateCropBox(width, height, targetWidth, targetHeight, focusRegion);
    } catch (error) {
      console.error('Attention crop failed, falling back to center crop:', error);
      return this.centerCrop(width, height, targetWidth, targetHeight);
    }
  }

  /**
   * Content-aware crop using mask and composition
   */
  private async contentAwareCrop(
    imageBuffer: Buffer,
    width: number,
    height: number,
    targetWidth: number,
    targetHeight: number,
    padding: number,
  ): Promise<{ x: number; y: number; width: number; height: number }> {
    try {
      // Generate mask to detect content
      const maskResult = await maskGeneratorService.generateMask(imageBuffer, {
        edgeDetection: true,
        threshold: 10,
      });

      const contentBox = maskResult.boundingBox;

      // Apply padding
      const paddingPx =
        typeof padding === 'number' && padding < 1 ? Math.max(width, height) * padding : padding;

      const paddedBox = {
        x: Math.max(0, contentBox.x - paddingPx),
        y: Math.max(0, contentBox.y - paddingPx),
        width: Math.min(width, contentBox.width + paddingPx * 2),
        height: Math.min(height, contentBox.height + paddingPx * 2),
      };

      // Calculate crop that includes content with target aspect ratio
      return this.fitCropToContent(width, height, targetWidth, targetHeight, paddedBox);
    } catch (error) {
      console.error('Content-aware crop failed, falling back to center crop:', error);
      return this.centerCrop(width, height, targetWidth, targetHeight);
    }
  }

  /**
   * Generate attention map using Sobel edge detection
   */
  private async generateAttentionMap(
    imageBuffer: Buffer,
    width: number,
    height: number,
  ): Promise<number[]> {
    // Convert to grayscale and extract data
    const grayBuffer = await sharp(imageBuffer).grayscale().raw().toBuffer();

    // Apply Sobel operator
    const attentionMap = new Array(width * height).fill(0);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        // Sobel kernels
        const gx =
          -1 * grayBuffer[idx - width - 1] +
          1 * grayBuffer[idx - width + 1] +
          -2 * grayBuffer[idx - 1] +
          2 * grayBuffer[idx + 1] +
          -1 * grayBuffer[idx + width - 1] +
          1 * grayBuffer[idx + width + 1];

        const gy =
          -1 * grayBuffer[idx - width - 1] +
          -2 * grayBuffer[idx - width] +
          -1 * grayBuffer[idx - width + 1] +
          1 * grayBuffer[idx + width - 1] +
          2 * grayBuffer[idx + width] +
          1 * grayBuffer[idx + width + 1];

        attentionMap[idx] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    return attentionMap;
  }

  /**
   * Find region with highest attention (most edges/content)
   */
  private findFocusRegion(attentionMap: number[], width: number, height: number): ContentRegion {
    // Use sliding window to find region with highest total attention
    const windowSize = Math.min(width, height) / 4;
    let maxAttention = 0;
    let bestRegion: ContentRegion = {
      x: width / 4,
      y: height / 4,
      width: width / 2,
      height: height / 2,
      importance: 0,
    };

    for (let y = 0; y < height - windowSize; y += windowSize / 4) {
      for (let x = 0; x < width - windowSize; x += windowSize / 4) {
        let attention = 0;

        for (let dy = 0; dy < windowSize; dy++) {
          for (let dx = 0; dx < windowSize; dx++) {
            const idx = Math.floor((y + dy) * width + (x + dx));
            if (idx < attentionMap.length) {
              attention += attentionMap[idx];
            }
          }
        }

        if (attention > maxAttention) {
          maxAttention = attention;
          bestRegion = {
            x,
            y,
            width: windowSize,
            height: windowSize,
            importance: attention,
          };
        }
      }
    }

    return bestRegion;
  }

  /**
   * Calculate crop box that fits target aspect ratio around focus region
   */
  private calculateCropBox(
    width: number,
    height: number,
    targetWidth: number,
    targetHeight: number,
    focusRegion: ContentRegion,
  ): { x: number; y: number; width: number; height: number } {
    const targetAspect = targetWidth / targetHeight;

    // Calculate center of focus region
    const focusCenterX = focusRegion.x + focusRegion.width / 2;
    const focusCenterY = focusRegion.y + focusRegion.height / 2;

    let cropWidth: number;
    let cropHeight: number;

    // Determine crop dimensions based on target aspect ratio
    const sourceAspect = width / height;

    if (sourceAspect > targetAspect) {
      cropHeight = height;
      cropWidth = height * targetAspect;
    } else {
      cropWidth = width;
      cropHeight = width / targetAspect;
    }

    // Center crop on focus region
    let cropX = focusCenterX - cropWidth / 2;
    let cropY = focusCenterY - cropHeight / 2;

    // Ensure crop stays within image bounds
    cropX = Math.max(0, Math.min(cropX, width - cropWidth));
    cropY = Math.max(0, Math.min(cropY, height - cropHeight));

    return {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
    };
  }

  /**
   * Fit crop box to content with target aspect ratio
   */
  private fitCropToContent(
    width: number,
    height: number,
    targetWidth: number,
    targetHeight: number,
    contentBox: { x: number; y: number; width: number; height: number },
  ): { x: number; y: number; width: number; height: number } {
    const targetAspect = targetWidth / targetHeight;
    const contentAspect = contentBox.width / contentBox.height;

    let cropWidth: number;
    let cropHeight: number;

    if (contentAspect > targetAspect) {
      // Content is wider than target
      cropWidth = contentBox.width;
      cropHeight = cropWidth / targetAspect;
    } else {
      // Content is taller than target
      cropHeight = contentBox.height;
      cropWidth = cropHeight * targetAspect;
    }

    // Center crop on content
    const contentCenterX = contentBox.x + contentBox.width / 2;
    const contentCenterY = contentBox.y + contentBox.height / 2;

    let cropX = contentCenterX - cropWidth / 2;
    let cropY = contentCenterY - cropHeight / 2;

    // Ensure crop stays within image bounds
    cropX = Math.max(0, Math.min(cropX, width - cropWidth));
    cropY = Math.max(0, Math.min(cropY, height - cropHeight));

    return {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
    };
  }
}

export const smartCropperService = new SmartCropperService();

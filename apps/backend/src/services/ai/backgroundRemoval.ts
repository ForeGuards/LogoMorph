/*
 * Background Removal Service
 * Removes backgrounds from logo images using AI
 *
 * Option 1: Remove.bg API (pros: high quality, reliable; cons: cost per image)
 * Option 2: Self-hosted REMBG (pros: free; cons: needs setup)
 * Option 3: Sharp edge detection (pros: no dependencies; cons: limited quality)
 * Chosen: Remove.bg with Sharp fallback for simple cases
 */

import { aiConfig } from '../../config/ai';
import sharp from 'sharp';

export interface BackgroundRemovalRequest {
  imageBuffer: Buffer;
  format: 'png' | 'jpg';
  size?: 'regular' | 'hd' | 'full';
  type?: 'auto' | 'person' | 'product' | 'car';
  cropToForeground?: boolean;
}

export interface BackgroundRemovalResult {
  buffer: Buffer;
  format: 'png';
  width: number;
  height: number;
  confidence?: number;
  method: 'removebg' | 'sharp' | 'manual';
  cost: number;
}

class BackgroundRemovalService {
  /**
   * Remove background from image
   */
  async removeBackground(request: BackgroundRemovalRequest): Promise<BackgroundRemovalResult> {
    // Try Remove.bg first if enabled
    if (aiConfig.removebg.enabled && aiConfig.removebg.apiKey) {
      try {
        return await this.removeWithRemoveBg(request);
      } catch (error) {
        console.warn('Remove.bg failed, falling back to Sharp:', error);
      }
    }

    // Fallback to Sharp-based removal
    return await this.removeWithSharp(request);
  }

  /**
   * Remove background using Remove.bg API
   */
  private async removeWithRemoveBg(
    request: BackgroundRemovalRequest,
  ): Promise<BackgroundRemovalResult> {
    const apiKey = aiConfig.removebg.apiKey;
    const size = request.size || aiConfig.removebg.size;

    // Prepare form data
    const formData = new FormData();
    const blob = new Blob([request.imageBuffer], {
      type: `image/${request.format}`,
    });
    formData.append('image_file', blob);
    formData.append('size', size);

    if (request.type) {
      formData.append('type', request.type);
    }

    if (request.cropToForeground) {
      formData.append('crop', 'true');
    }

    // Call Remove.bg API
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey!,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Remove.bg API error: ${error}`);
    }

    // Get result buffer
    const resultBuffer = Buffer.from(await response.arrayBuffer());

    // Get metadata
    const metadata = await sharp(resultBuffer).metadata();

    // Calculate cost based on size
    const costMap = {
      regular: 0.01,
      hd: 0.02,
      full: 0.05,
    };

    return {
      buffer: resultBuffer,
      format: 'png',
      width: metadata.width || 0,
      height: metadata.height || 0,
      method: 'removebg',
      cost: costMap[size],
    };
  }

  /**
   * Remove background using Sharp (fallback for simple cases)
   * Uses color threshold and edge detection
   */
  private async removeWithSharp(
    request: BackgroundRemovalRequest,
  ): Promise<BackgroundRemovalResult> {
    const image = sharp(request.imageBuffer);
    const metadata = await image.metadata();

    // For simple white/solid backgrounds, use color threshold
    const processed = await this.simpleBackgroundRemoval(request.imageBuffer, metadata);

    return {
      buffer: processed.buffer,
      format: 'png',
      width: processed.width,
      height: processed.height,
      method: 'sharp',
      cost: 0, // Free
    };
  }

  /**
   * Simple background removal for solid colors
   * Works well for logos on white/uniform backgrounds
   */
  private async simpleBackgroundRemoval(
    buffer: Buffer,
    _metadata: sharp.Metadata,
  ): Promise<{ buffer: Buffer; width: number; height: number }> {
    // Get raw pixel data
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Detect background color (assume it's the most common corner color)
    const bgColor = this.detectBackgroundColor(data, info.width, info.height, info.channels);

    // Make similar colors transparent
    const threshold = 30; // Color similarity threshold
    const processedData = this.makeTransparent(data, bgColor, threshold, info.channels);

    // Create PNG with transparency
    const result = await sharp(processedData, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      },
    })
      .png()
      .toBuffer();

    return {
      buffer: result,
      width: info.width,
      height: info.height,
    };
  }

  /**
   * Detect background color from image corners
   */
  private detectBackgroundColor(
    data: Buffer,
    width: number,
    height: number,
    channels: number,
  ): [number, number, number] {
    // Sample corners
    const corners = [
      this.getPixel(data, 0, 0, width, channels),
      this.getPixel(data, width - 1, 0, width, channels),
      this.getPixel(data, 0, height - 1, width, channels),
      this.getPixel(data, width - 1, height - 1, width, channels),
    ];

    // Return average of corners
    const avg: [number, number, number] = [0, 0, 0];
    corners.forEach((corner) => {
      avg[0] += corner[0];
      avg[1] += corner[1];
      avg[2] += corner[2];
    });

    return [Math.round(avg[0] / 4), Math.round(avg[1] / 4), Math.round(avg[2] / 4)];
  }

  /**
   * Get pixel color at position
   */
  private getPixel(
    data: Buffer,
    x: number,
    y: number,
    width: number,
    channels: number,
  ): [number, number, number] {
    const idx = (y * width + x) * channels;
    return [data[idx], data[idx + 1], data[idx + 2]];
  }

  /**
   * Make pixels similar to background color transparent
   */
  private makeTransparent(
    data: Buffer,
    bgColor: [number, number, number],
    threshold: number,
    channels: number,
  ): Buffer {
    const result = Buffer.from(data);

    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Calculate color distance
      const distance = Math.sqrt(
        Math.pow(r - bgColor[0], 2) + Math.pow(g - bgColor[1], 2) + Math.pow(b - bgColor[2], 2),
      );

      // If similar to background, make transparent
      if (distance < threshold) {
        result[i + 3] = 0; // Set alpha to 0
      }
    }

    return result;
  }

  /**
   * Refine edges after background removal
   * Smooths jagged edges and removes artifacts
   */
  async refineEdges(imageBuffer: Buffer): Promise<Buffer> {
    return await sharp(imageBuffer)
      .blur(0.5) // Slight blur on edges
      .sharpen() // Sharpen to restore details
      .png()
      .toBuffer();
  }

  /**
   * Auto-detect if image needs background removal
   * Returns confidence score 0-1
   */
  async needsBackgroundRemoval(imageBuffer: Buffer): Promise<number> {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    // Already transparent PNG
    if (metadata.format === 'png' && metadata.hasAlpha) {
      const stats = await image.stats();
      // Check if alpha channel has variation
      const alphaVariation = stats.channels[3]?.stdev || 0;
      return alphaVariation > 10 ? 0.1 : 0.9; // Low confidence if already transparent
    }

    // For JPG or non-transparent PNG, assume it might need removal
    return 0.7;
  }

  /**
   * Batch remove backgrounds from multiple images
   */
  async batchRemove(requests: BackgroundRemovalRequest[]): Promise<BackgroundRemovalResult[]> {
    const results: BackgroundRemovalResult[] = [];

    for (const request of requests) {
      try {
        const result = await this.removeBackground(request);
        results.push(result);
      } catch (error) {
        console.error('Failed to remove background:', error);
        // Push original image as fallback
        const metadata = await sharp(request.imageBuffer).metadata();
        results.push({
          buffer: request.imageBuffer,
          format: 'png',
          width: metadata.width || 0,
          height: metadata.height || 0,
          method: 'manual',
          cost: 0,
        });
      }
    }

    return results;
  }
}

export const backgroundRemovalService = new BackgroundRemovalService();

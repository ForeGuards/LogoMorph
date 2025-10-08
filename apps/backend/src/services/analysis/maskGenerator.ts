/*
 * Mask Generator Service
 * Advanced mask generation with edge detection for better foreground/background separation
 * Option 1: Sharp's threshold/edge detection (pros: fast, built-in; cons: basic)
 * Option 2: OpenCV bindings (pros: sophisticated; cons: heavy dependency)
 * Option 3: Custom edge detection with Sharp (pros: balanced; cons: requires custom logic)
 * Chosen: Custom edge detection with Sharp for balance of quality and performance
 */

import sharp from 'sharp';

export interface MaskOptions {
  edgeDetection?: boolean; // Apply edge detection
  threshold?: number; // Alpha threshold (0-255)
  blur?: number; // Blur radius before edge detection
  dilate?: number; // Dilate mask to capture edges
  erode?: number; // Erode mask to remove noise
}

export interface MaskResult {
  mask: Buffer; // Grayscale mask image
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  coverage: number; // Percentage of non-transparent pixels (0-100)
}

export class MaskGeneratorService {
  /**
   * Generate mask from PNG with alpha channel
   */
  async generateMask(imageBuffer: Buffer, options: MaskOptions = {}): Promise<MaskResult> {
    const { edgeDetection = true, threshold = 10, blur = 0, dilate = 0, erode = 0 } = options;

    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image dimensions');
      }

      const { width, height } = metadata;

      // Extract alpha channel as grayscale mask
      let mask = image.extractChannel('alpha');

      // Apply blur to smooth edges (if specified)
      if (blur > 0) {
        mask = mask.blur(blur);
      }

      // Apply threshold to create binary mask
      mask = mask.threshold(threshold);

      // Apply morphological operations
      if (dilate > 0) {
        // Dilate to expand edges
        for (let i = 0; i < dilate; i++) {
          mask = await this.dilateOperation(mask, width, height);
        }
      }

      if (erode > 0) {
        // Erode to remove noise
        for (let i = 0; i < erode; i++) {
          mask = await this.erodeOperation(mask, width, height);
        }
      }

      // Apply edge detection if requested
      if (edgeDetection) {
        mask = await this.applyEdgeDetection(mask, width, height);
      }

      // Get mask buffer
      const maskBuffer = await mask.toBuffer();

      // Calculate bounding box from mask
      const boundingBox = await this.calculateBoundingBox(maskBuffer, width, height);

      // Calculate coverage (percentage of non-zero pixels)
      const coverage = await this.calculateCoverage(maskBuffer);

      return {
        mask: maskBuffer,
        boundingBox,
        coverage,
      };
    } catch (error) {
      console.error('Mask generation error:', error);
      throw new Error(
        `Failed to generate mask: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Apply edge detection using Sobel operator approximation
   */
  private async applyEdgeDetection(
    mask: sharp.Sharp,
    width: number,
    height: number,
  ): Promise<sharp.Sharp> {
    // Get mask data
    const maskData = await mask.raw().toBuffer();

    // Apply simple edge detection (Sobel-like)
    // This enhances edges by detecting gradient changes
    const edgeData = Buffer.alloc(maskData.length);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        // 3x3 Sobel kernels
        const gx =
          -1 * maskData[idx - width - 1] +
          1 * maskData[idx - width + 1] +
          -2 * maskData[idx - 1] +
          2 * maskData[idx + 1] +
          -1 * maskData[idx + width - 1] +
          1 * maskData[idx + width + 1];

        const gy =
          -1 * maskData[idx - width - 1] +
          -2 * maskData[idx - width] +
          -1 * maskData[idx - width + 1] +
          1 * maskData[idx + width - 1] +
          2 * maskData[idx + width] +
          1 * maskData[idx + width + 1];

        // Calculate gradient magnitude
        const magnitude = Math.sqrt(gx * gx + gy * gy);

        // Combine with original mask (keep interior + edges)
        edgeData[idx] = Math.min(255, maskData[idx] + magnitude * 0.3);
      }
    }

    // Create new mask from edge-enhanced data
    return sharp(edgeData, {
      raw: {
        width,
        height,
        channels: 1,
      },
    });
  }

  /**
   * Dilate operation (expand white regions)
   */
  private async dilateOperation(
    mask: sharp.Sharp,
    width: number,
    height: number,
  ): Promise<sharp.Sharp> {
    const maskData = await mask.raw().toBuffer();
    const dilated = Buffer.alloc(maskData.length);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        // Take maximum value from 3x3 neighborhood
        let maxVal = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = (y + dy) * width + (x + dx);
            maxVal = Math.max(maxVal, maskData[nIdx]);
          }
        }

        dilated[idx] = maxVal;
      }
    }

    return sharp(dilated, {
      raw: {
        width,
        height,
        channels: 1,
      },
    });
  }

  /**
   * Erode operation (shrink white regions)
   */
  private async erodeOperation(
    mask: sharp.Sharp,
    width: number,
    height: number,
  ): Promise<sharp.Sharp> {
    const maskData = await mask.raw().toBuffer();
    const eroded = Buffer.alloc(maskData.length);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;

        // Take minimum value from 3x3 neighborhood
        let minVal = 255;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = (y + dy) * width + (x + dx);
            minVal = Math.min(minVal, maskData[nIdx]);
          }
        }

        eroded[idx] = minVal;
      }
    }

    return sharp(eroded, {
      raw: {
        width,
        height,
        channels: 1,
      },
    });
  }

  /**
   * Calculate bounding box from mask
   */
  private async calculateBoundingBox(
    maskBuffer: Buffer,
    width: number,
    height: number,
  ): Promise<{ x: number; y: number; width: number; height: number }> {
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (maskBuffer[idx] > 10) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }

  /**
   * Calculate coverage percentage
   */
  private async calculateCoverage(maskBuffer: Buffer): Promise<number> {
    let nonZeroCount = 0;
    const totalPixels = maskBuffer.length;

    for (let i = 0; i < totalPixels; i++) {
      if (maskBuffer[i] > 10) {
        nonZeroCount++;
      }
    }

    return (nonZeroCount / totalPixels) * 100;
  }

  /**
   * Create an inverted mask (background mask)
   */
  async invertMask(maskBuffer: Buffer): Promise<Buffer> {
    const inverted = Buffer.alloc(maskBuffer.length);

    for (let i = 0; i < maskBuffer.length; i++) {
      inverted[i] = 255 - maskBuffer[i];
    }

    return inverted;
  }

  /**
   * Apply mask to an image
   */
  async applyMask(
    imageBuffer: Buffer,
    maskBuffer: Buffer,
    width: number,
    height: number,
  ): Promise<Buffer> {
    return await sharp(imageBuffer)
      .composite([
        {
          input: maskBuffer,
          raw: {
            width,
            height,
            channels: 1,
          },
          blend: 'dest-in',
        },
      ])
      .toBuffer();
  }
}

export const maskGeneratorService = new MaskGeneratorService();

/**
 * Advanced Masking Service
 * Provides alpha channel masking and advanced selection capabilities
 *
 * Option 1: Canvas-based pixel manipulation (pros: precise control; cons: raster only)
 * Option 2: SVG clip-path (pros: vector support; cons: limited alpha control)
 * Option 3: Hybrid approach with PNG alpha channel extraction
 * Chosen: Option 3 for best of both worlds
 */

import sharp from 'sharp';
// import { JSDOM } from 'jsdom';

export interface MaskOptions {
  threshold?: number; // 0-255, threshold for alpha channel
  feather?: number; // Feather edges in pixels
  invert?: boolean; // Invert the mask
}

export interface AlphaChannelData {
  width: number;
  height: number;
  data: Uint8Array;
}

export class AdvancedMasking {
  /**
   * Extract alpha channel from PNG image
   */
  public async extractAlphaChannel(imagePath: string): Promise<AlphaChannelData> {
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    if (!metadata.hasAlpha) {
      throw new Error('Image does not have an alpha channel');
    }

    // Extract raw pixel data with alpha
    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    // Extract only alpha channel (every 4th byte)
    const alphaData = new Uint8Array(info.width * info.height);
    for (let i = 0; i < alphaData.length; i++) {
      alphaData[i] = data[i * info.channels + 3]; // Alpha is 4th channel
    }

    return {
      width: info.width,
      height: info.height,
      data: alphaData,
    };
  }

  /**
   * Create a mask from alpha channel with options
   */
  public async createMaskFromAlpha(imagePath: string, options: MaskOptions = {}): Promise<Buffer> {
    const { threshold = 128, feather = 0, invert = false } = options;

    let image = sharp(imagePath).ensureAlpha();

    // Apply threshold to create binary mask
    if (threshold > 0) {
      image = image.threshold(threshold);
    }

    // Apply feathering (gaussian blur)
    if (feather > 0) {
      image = image.blur(feather);
    }

    // Invert if requested
    if (invert) {
      image = image.negate({ alpha: false });
    }

    // Extract alpha channel as grayscale image
    return await image.extractChannel('alpha').toBuffer();
  }

  /**
   * Apply mask to an image
   */
  public async applyMask(imagePath: string, maskPath: string): Promise<Buffer> {
    const image = sharp(imagePath);
    const mask = sharp(maskPath).greyscale();

    // Composite using the mask
    return await image
      .composite([
        {
          input: await mask.toBuffer(),
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer();
  }

  /**
   * Create SVG clip path from alpha channel
   */
  public async createSVGClipPath(imagePath: string, options: MaskOptions = {}): Promise<string> {
    const alphaData = await this.extractAlphaChannel(imagePath);
    const { threshold = 128 } = options;

    // Trace the alpha channel to create vector paths
    // This is a simplified version - production would use potrace or similar
    const paths = this.traceAlphaChannel(alphaData, threshold);

    const clipPathId = `mask-${Date.now()}`;

    return `
      <clipPath id="${clipPathId}">
        ${paths.map((path) => `<path d="${path}" />`).join('\n')}
      </clipPath>
    `.trim();
  }

  /**
   * Apply SVG mask with feather effect
   */
  public applySVGMask(svgContent: string, maskId: string): string {
    // Apply clip-path to the main group
    return svgContent
      .replace(/<svg([^>]*)>/, (match, _attrs) => {
        return `${match}\n<g clip-path="url(#${maskId})">`;
      })
      .replace(/<\/svg>/, '</g>\n</svg>');
  }

  /**
   * Create a magic wand selection (similar to Photoshop)
   */
  public async magicWandSelection(
    imagePath: string,
    x: number,
    y: number,
    tolerance: number = 32,
  ): Promise<Buffer> {
    const image = sharp(imagePath);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

    // Get the target color at the clicked position
    const index = (y * info.width + x) * info.channels;
    const targetR = data[index];
    const targetG = data[index + 1];
    const targetB = data[index + 2];

    // Create selection mask using flood fill algorithm
    const mask = new Uint8Array(info.width * info.height).fill(0);
    const visited = new Set<number>();

    const queue: Array<[number, number]> = [[x, y]];

    while (queue.length > 0) {
      const [cx, cy] = queue.shift()!;
      const pixelIndex = cy * info.width + cx;

      if (visited.has(pixelIndex)) continue;
      visited.add(pixelIndex);

      const dataIndex = pixelIndex * info.channels;
      const r = data[dataIndex];
      const g = data[dataIndex + 1];
      const b = data[dataIndex + 2];

      // Check color similarity
      const distance = Math.sqrt(
        Math.pow(r - targetR, 2) + Math.pow(g - targetG, 2) + Math.pow(b - targetB, 2),
      );

      if (distance <= tolerance) {
        mask[pixelIndex] = 255;

        // Add neighbors to queue
        if (cx > 0) queue.push([cx - 1, cy]);
        if (cx < info.width - 1) queue.push([cx + 1, cy]);
        if (cy > 0) queue.push([cx, cy - 1]);
        if (cy < info.height - 1) queue.push([cx, cy + 1]);
      }
    }

    // Convert mask to image buffer
    return await sharp(Buffer.from(mask), {
      raw: {
        width: info.width,
        height: info.height,
        channels: 1,
      },
    })
      .png()
      .toBuffer();
  }

  /**
   * Refine mask edges using edge detection
   */
  public async refineEdges(maskPath: string, radius: number = 2): Promise<Buffer> {
    // Apply edge refinement using morphological operations
    return await sharp(maskPath)
      .greyscale()
      .blur(radius * 0.5) // Slight blur
      .normalise() // Enhance contrast
      .threshold(128) // Re-threshold
      .png()
      .toBuffer();
  }

  // Private helper methods

  private traceAlphaChannel(alphaData: AlphaChannelData, threshold: number): string[] {
    // Simplified path tracing - production would use marching squares
    // or potrace algorithm for better results
    const paths: string[] = [];
    const { width, height, data } = alphaData;

    // Find contours in the alpha channel
    const visited = new Set<number>();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;

        if (visited.has(index)) continue;
        if (data[index] < threshold) continue;

        // Found a new contour starting point
        const contour = this.traceContour(data, width, height, x, y, threshold, visited);

        if (contour.length > 3) {
          const pathData = this.contourToPath(contour);
          paths.push(pathData);
        }
      }
    }

    return paths;
  }

  private traceContour(
    data: Uint8Array,
    width: number,
    height: number,
    startX: number,
    startY: number,
    threshold: number,
    visited: Set<number>,
  ): Array<[number, number]> {
    const contour: Array<[number, number]> = [];
    const queue: Array<[number, number]> = [[startX, startY]];

    while (queue.length > 0 && contour.length < 1000) {
      const [x, y] = queue.shift()!;
      const index = y * width + x;

      if (visited.has(index)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (data[index] < threshold) continue;

      visited.add(index);
      contour.push([x, y]);

      // Check 8-connected neighbors
      const neighbors = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
        [x - 1, y - 1],
        [x + 1, y - 1],
        [x - 1, y + 1],
        [x + 1, y + 1],
      ];

      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          queue.push([nx, ny]);
        }
      }
    }

    return contour;
  }

  private contourToPath(contour: Array<[number, number]>): string {
    if (contour.length === 0) return '';

    const [startX, startY] = contour[0];
    let path = `M ${startX} ${startY}`;

    for (let i = 1; i < contour.length; i++) {
      const [x, y] = contour[i];
      path += ` L ${x} ${y}`;
    }

    path += ' Z'; // Close path

    return path;
  }
}

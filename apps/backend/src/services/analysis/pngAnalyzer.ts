/*
 * PNG Analyzer Service
 * Analyzes PNG images to extract dimensions, aspect ratio, and color information
 * Option 1: Sharp (pros: fast, comprehensive, native; cons: binary dependency)
 * Option 2: jimp (pros: pure JS; cons: slower, limited features)
 * Chosen: Sharp for performance and feature set
 */

import sharp from 'sharp';

export interface PNGBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PNGAnalysisResult {
  width: number;
  height: number;
  aspectRatio: number;
  channels: number;
  hasAlpha: boolean;
  boundingBox: PNGBoundingBox;
  dominantColors: string[];
  estimatedTrimBox?: PNGBoundingBox;
}

export class PNGAnalyzerService {
  /**
   * Analyze PNG image and extract comprehensive metadata
   */
  async analyzePNG(pngBuffer: Buffer): Promise<PNGAnalysisResult> {
    const image = sharp(pngBuffer);

    // Get basic metadata
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to determine PNG dimensions');
    }

    const width = metadata.width;
    const height = metadata.height;
    const aspectRatio = width / height;
    const channels = metadata.channels || 3;
    const hasAlpha = metadata.hasAlpha || false;

    // Calculate bounding box (full image)
    const boundingBox: PNGBoundingBox = {
      x: 0,
      y: 0,
      width,
      height,
    };

    // Extract dominant colors
    const dominantColors = await this.extractDominantColors(image, width, height);

    // Try to estimate content area (trim transparent edges)
    let estimatedTrimBox: PNGBoundingBox | undefined;
    if (hasAlpha) {
      estimatedTrimBox = await this.estimateTrimBox(image, width, height);
    }

    return {
      width,
      height,
      aspectRatio,
      channels,
      hasAlpha,
      boundingBox,
      dominantColors,
      estimatedTrimBox,
    };
  }

  /**
   * Extract dominant colors from image
   * Samples the image and finds most common colors
   */
  private async extractDominantColors(
    image: sharp.Sharp,
    _width: number,
    _height: number,
  ): Promise<string[]> {
    try {
      // Resize to small size for faster processing
      const sampleSize = 50;
      const resized = image.clone().resize(sampleSize, sampleSize, {
        fit: 'fill',
      });

      // Get raw pixel data
      const { data, info } = await resized.raw().toBuffer({ resolveWithObject: true });

      // Sample pixels and count colors
      const colorCounts = new Map<string, number>();
      const step = info.channels;

      for (let i = 0; i < data.length; i += step) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Skip if alpha is very low (transparent pixels)
        if (step === 4 && data[i + 3] < 25) {
          continue;
        }

        // Convert to hex
        const hex = this.rgbToHex(r, g, b);
        colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
      }

      // Sort by frequency and return top colors
      const sortedColors = Array.from(colorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([color]) => color)
        .slice(0, 5); // Top 5 colors

      return sortedColors;
    } catch (error) {
      console.error('Failed to extract dominant colors:', error);
      return [];
    }
  }

  /**
   * Estimate the bounding box of actual content (trim transparent areas)
   */
  private async estimateTrimBox(
    image: sharp.Sharp,
    width: number,
    height: number,
  ): Promise<PNGBoundingBox | undefined> {
    try {
      // Use Sharp's trim function to detect content area
      const trimmed = await image.clone().trim().toBuffer({ resolveWithObject: true });

      const trimInfo = trimmed.info;

      // Calculate the trim offsets
      // Note: Sharp's trim removes the transparent areas, so we need to calculate
      // where the content actually is in the original image
      const trimmedWidth = trimInfo.width;
      const trimmedHeight = trimInfo.height;

      // Estimate position (centered for now - more sophisticated edge detection would improve this)
      const x = Math.floor((width - trimmedWidth) / 2);
      const y = Math.floor((height - trimmedHeight) / 2);

      return {
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: trimmedWidth,
        height: trimmedHeight,
      };
    } catch (error) {
      console.error('Failed to estimate trim box:', error);
      return undefined;
    }
  }

  /**
   * Generate a simple foreground/background mask
   * Returns a buffer with binary mask (255 = foreground, 0 = background)
   */
  async generateMask(pngBuffer: Buffer): Promise<Buffer | null> {
    try {
      const image = sharp(pngBuffer);
      const metadata = await image.metadata();

      if (!metadata.hasAlpha) {
        // No alpha channel, can't generate mask reliably
        return null;
      }

      // Extract alpha channel as mask
      const mask = await image
        .extractChannel(3) // Alpha channel
        .toBuffer();

      return mask;
    } catch (error) {
      console.error('Failed to generate mask:', error);
      return null;
    }
  }

  /**
   * Convert RGB to hex color string
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }

  /**
   * Calculate safe margins for logo placement
   * Returns percentage of padding needed on each side
   */
  calculateSafeMargins(
    boundingBox: PNGBoundingBox,
    estimatedTrimBox?: PNGBoundingBox,
  ): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } {
    // Use trim box if available, otherwise use full bounding box
    const contentBox = estimatedTrimBox || boundingBox;

    // Calculate aspect ratio
    const aspectRatio = contentBox.width / contentBox.height;

    // Base margin: 10% for square logos
    let baseMargin = 0.1;

    // Adjust for extreme aspect ratios
    if (aspectRatio > 2 || aspectRatio < 0.5) {
      baseMargin = 0.15; // More padding for wide/tall logos
    }

    // If content is significantly smaller than bounding box, reduce margins
    const contentRatio =
      (contentBox.width * contentBox.height) / (boundingBox.width * boundingBox.height);

    if (contentRatio < 0.5) {
      baseMargin = 0.05; // Less padding if there's already empty space
    }

    return {
      top: baseMargin,
      right: baseMargin,
      bottom: baseMargin,
      left: baseMargin,
    };
  }
}

export const pngAnalyzerService = new PNGAnalyzerService();

/*
 * Image Compositor Service
 * Combines logos with backgrounds to create final variants
 * Option 1: Sharp (pros: fast, high-quality; cons: raster only)
 * Option 2: Canvas API (pros: works with both; cons: requires canvas package)
 * Chosen: Sharp for MVP, will add SVG output in Phase 2
 */

import sharp from 'sharp';
import { LayoutCalculation } from './layoutEngine';

export interface CompositeOptions {
  background: Buffer; // Background image buffer
  logo: Buffer; // Logo file buffer
  layout: LayoutCalculation; // Layout calculations
  logoFormat: 'svg' | 'png'; // Logo format
  outputFormat?: 'png' | 'jpeg' | 'webp'; // Output format
  quality?: number; // Quality for JPEG/WebP (1-100)
}

export interface CompositeResult {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
}

export class ImageCompositorService {
  /**
   * Composite logo onto background
   */
  async composite(options: CompositeOptions): Promise<CompositeResult> {
    const { background, logo, layout, logoFormat, outputFormat = 'png', quality = 90 } = options;

    try {
      // Load background image
      const backgroundImage = sharp(background);

      // Prepare logo for compositing
      const preparedLogo = await this.prepareLogo(
        logo,
        logoFormat,
        layout.logoWidth,
        layout.logoHeight,
      );

      // Composite logo onto background
      const composite = backgroundImage.composite([
        {
          input: preparedLogo,
          top: layout.logoY,
          left: layout.logoX,
        },
      ]);

      // Apply output format
      let outputBuffer: Buffer;
      switch (outputFormat) {
        case 'jpeg':
          outputBuffer = await composite.jpeg({ quality }).toBuffer();
          break;
        case 'webp':
          outputBuffer = await composite.webp({ quality }).toBuffer();
          break;
        default:
          outputBuffer = await composite.png().toBuffer();
      }

      return {
        buffer: outputBuffer,
        format: outputFormat,
        width: layout.canvasWidth,
        height: layout.canvasHeight,
        size: outputBuffer.length,
      };
    } catch (error) {
      console.error('Composite error:', error);
      throw new Error(
        `Failed to composite image: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Prepare logo for compositing (resize and ensure proper format)
   */
  private async prepareLogo(
    logo: Buffer,
    format: 'svg' | 'png',
    targetWidth: number,
    targetHeight: number,
  ): Promise<Buffer> {
    let logoImage = sharp(logo);

    // For SVG, Sharp will rasterize it
    // For PNG, we just resize

    // Resize to target dimensions
    logoImage = logoImage.resize(targetWidth, targetHeight, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
    });

    // Ensure PNG with alpha for compositing
    return await logoImage.png().toBuffer();
  }

  /**
   * Create a preview composite (lower quality for faster processing)
   */
  async createPreview(options: CompositeOptions): Promise<CompositeResult> {
    // Scale down for preview
    const previewScale = 0.5;
    const previewLayout = {
      ...options.layout,
      canvasWidth: Math.round(options.layout.canvasWidth * previewScale),
      canvasHeight: Math.round(options.layout.canvasHeight * previewScale),
      logoWidth: Math.round(options.layout.logoWidth * previewScale),
      logoHeight: Math.round(options.layout.logoHeight * previewScale),
      logoX: Math.round(options.layout.logoX * previewScale),
      logoY: Math.round(options.layout.logoY * previewScale),
    };

    // Scale background
    const previewBackground = await sharp(options.background)
      .resize(previewLayout.canvasWidth, previewLayout.canvasHeight)
      .toBuffer();

    return this.composite({
      ...options,
      background: previewBackground,
      layout: previewLayout,
      outputFormat: 'jpeg',
      quality: 70,
    });
  }

  /**
   * Batch composite multiple variants
   */
  async batchComposite(variants: CompositeOptions[]): Promise<CompositeResult[]> {
    const results: CompositeResult[] = [];

    for (const variant of variants) {
      try {
        const result = await this.composite(variant);
        results.push(result);
      } catch (error) {
        console.error('Batch composite error for variant:', error);
        // Continue with other variants
      }
    }

    return results;
  }

  /**
   * Add watermark to composite
   */
  async addWatermark(
    image: Buffer,
    watermarkText: string,
    position: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left' = 'bottom-right',
  ): Promise<Buffer> {
    const metadata = await sharp(image).metadata();
    const width = metadata.width || 1000;
    const height = metadata.height || 1000;

    // Create watermark SVG
    const watermarkSvg = this.createWatermarkSVG(watermarkText, position, width, height);

    return await sharp(image)
      .composite([
        {
          input: Buffer.from(watermarkSvg),
          gravity: this.positionToGravity(position),
        },
      ])
      .toBuffer();
  }

  /**
   * Create watermark SVG
   */
  private createWatermarkSVG(
    text: string,
    position: string,
    imageWidth: number,
    imageHeight: number,
  ): string {
    const fontSize = Math.max(12, Math.min(imageWidth, imageHeight) * 0.02);
    const padding = fontSize;

    return `
      <svg width="${imageWidth}" height="${imageHeight}">
        <text
          x="${padding}"
          y="${imageHeight - padding}"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          fill="rgba(255, 255, 255, 0.7)"
          stroke="rgba(0, 0, 0, 0.3)"
          stroke-width="0.5"
        >${text}</text>
      </svg>
    `;
  }

  /**
   * Convert position to Sharp gravity
   */
  private positionToGravity(
    position: string,
  ):
    | 'north'
    | 'northeast'
    | 'east'
    | 'southeast'
    | 'south'
    | 'southwest'
    | 'west'
    | 'northwest'
    | 'center' {
    switch (position) {
      case 'top-left':
        return 'northwest';
      case 'top-right':
        return 'northeast';
      case 'bottom-left':
        return 'southwest';
      case 'bottom-right':
        return 'southeast';
      default:
        return 'southeast';
    }
  }
}

export const imageCompositorService = new ImageCompositorService();

/**
 * ColorReplacer - Replace colors in SVG and raster images
 */

import sharp from 'sharp';
// import type { Color } from './colorExtractor';

export interface ColorReplacement {
  from: string;
  to: string;
  tolerance?: number; // 0-255, how similar colors must be to match
}

export class ColorReplacer {
  /**
   * Replace colors in SVG content
   */
  async replaceInSVG(svgContent: string, replacements: ColorReplacement[]): Promise<string> {
    let modified = svgContent;

    for (const replacement of replacements) {
      const { from, to } = replacement;

      // Replace in fill attributes
      modified = modified.replace(
        new RegExp(`fill="${this.escapeRegex(from)}"`, 'g'),
        `fill="${to}"`,
      );

      // Replace in stroke attributes
      modified = modified.replace(
        new RegExp(`stroke="${this.escapeRegex(from)}"`, 'g'),
        `stroke="${to}"`,
      );

      // Replace in style attributes
      modified = modified.replace(
        new RegExp(`fill:\\s*${this.escapeRegex(from)}`, 'g'),
        `fill: ${to}`,
      );
      modified = modified.replace(
        new RegExp(`stroke:\\s*${this.escapeRegex(from)}`, 'g'),
        `stroke: ${to}`,
      );
    }

    return modified;
  }

  /**
   * Replace colors in raster image
   * Uses sharp to manipulate pixel data
   */
  async replaceInImage(
    imagePath: string,
    outputPath: string,
    replacements: ColorReplacement[],
  ): Promise<void> {
    try {
      const image = sharp(imagePath);
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

      const modifiedData = Buffer.from(data);

      // Replace each pixel
      for (let i = 0; i < modifiedData.length; i += info.channels) {
        const r = modifiedData[i];
        const g = modifiedData[i + 1];
        const b = modifiedData[i + 2];

        // Check each replacement
        for (const replacement of replacements) {
          const fromRgb = this.parseHexColor(replacement.from);
          const toRgb = this.parseHexColor(replacement.to);
          const tolerance = replacement.tolerance || 10;

          if (this.colorsMatch({ r, g, b }, fromRgb, tolerance)) {
            modifiedData[i] = toRgb.r;
            modifiedData[i + 1] = toRgb.g;
            modifiedData[i + 2] = toRgb.b;
            break; // Only apply first matching replacement
          }
        }
      }

      // Write modified image
      await sharp(modifiedData, {
        raw: {
          width: info.width,
          height: info.height,
          channels: info.channels,
        },
      })
        .toFormat(info.format || 'png')
        .toFile(outputPath);
    } catch (error) {
      console.error('[ColorReplacer] Error replacing in image:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to replace colors: ${message}`);
    }
  }

  /**
   * Check if two colors match within tolerance
   */
  private colorsMatch(
    color1: { r: number; g: number; b: number },
    color2: { r: number; g: number; b: number },
    tolerance: number,
  ): boolean {
    const dr = Math.abs(color1.r - color2.r);
    const dg = Math.abs(color1.g - color2.g);
    const db = Math.abs(color1.b - color2.b);

    return dr <= tolerance && dg <= tolerance && db <= tolerance;
  }

  /**
   * Parse hex color to RGB
   */
  private parseHexColor(hex: string): { r: number; g: number; b: number } {
    hex = hex.replace('#', '');

    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    } else if (hex.length === 6) {
      return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16),
      };
    }

    throw new Error(`Invalid hex color: ${hex}`);
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Batch replace colors - applies multiple replacements efficiently
   */
  async batchReplace(
    content: string,
    type: 'svg' | 'image',
    replacements: ColorReplacement[],
  ): Promise<string> {
    if (type === 'svg') {
      return this.replaceInSVG(content, replacements);
    }

    throw new Error('Batch replace for images requires file paths');
  }
}

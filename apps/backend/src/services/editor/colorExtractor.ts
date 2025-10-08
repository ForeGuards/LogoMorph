/**
 * ColorExtractor - Extract colors from SVG and raster images
 *
 * Option 1: Use existing color quantization library (pros: tested; cons: dependency)
 * Option 2: Custom implementation (pros: control; cons: complex algorithms)
 * Chosen: Sharp for raster + custom SVG parsing for simplicity
 */

import sharp from 'sharp';

export interface Color {
  hex: string;
  rgb: { r: number; g: number; b: number };
  frequency?: number;
}

export class ColorExtractor {
  /**
   * Extract colors from SVG content
   * Parses SVG XML and extracts fill/stroke attributes
   */
  async extractFromSVG(svgContent: string): Promise<Color[]> {
    const colorMap = new Map<string, number>();

    // Extract fill attributes
    const fillRegex = /fill="([^"]+)"/g;
    let match;
    while ((match = fillRegex.exec(svgContent)) !== null) {
      const color = match[1];
      if (color !== 'none' && color !== 'transparent') {
        colorMap.set(color, (colorMap.get(color) || 0) + 1);
      }
    }

    // Extract stroke attributes
    const strokeRegex = /stroke="([^"]+)"/g;
    while ((match = strokeRegex.exec(svgContent)) !== null) {
      const color = match[1];
      if (color !== 'none' && color !== 'transparent') {
        colorMap.set(color, (colorMap.get(color) || 0) + 1);
      }
    }

    // Extract style attributes
    const styleRegex = /style="([^"]+)"/g;
    while ((match = styleRegex.exec(svgContent)) !== null) {
      const styleContent = match[1];
      const colorMatches = styleContent.match(/(?:fill|stroke):\s*([^;]+)/g);
      if (colorMatches) {
        colorMatches.forEach((colorMatch) => {
          const color = colorMatch.split(':')[1].trim();
          if (color !== 'none' && color !== 'transparent') {
            colorMap.set(color, (colorMap.get(color) || 0) + 1);
          }
        });
      }
    }

    // Convert to Color array
    const colors: Color[] = [];
    colorMap.forEach((frequency, colorStr) => {
      const rgb = this.parseColor(colorStr);
      if (rgb) {
        colors.push({
          hex: this.rgbToHex(rgb),
          rgb,
          frequency,
        });
      }
    });

    // Sort by frequency
    colors.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));

    return colors;
  }

  /**
   * Extract dominant colors from raster image
   * Uses sharp to analyze pixel data
   */
  async extractFromImage(imagePath: string, maxColors: number = 10): Promise<Color[]> {
    try {
      const image = sharp(imagePath);
      await image.metadata();

      // Resize for faster processing
      const resized = await image
        .resize(100, 100, { fit: 'inside' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      const { data, info } = resized;
      const colorMap = new Map<string, number>();

      // Sample pixels (every 4 bytes = 1 pixel in RGB)
      for (let i = 0; i < data.length; i += info.channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = info.channels === 4 ? data[i + 3] : 255;

        // Skip transparent pixels
        if (a < 128) continue;

        // Quantize colors (reduce precision to group similar colors)
        const quantized = {
          r: Math.round(r / 17) * 17,
          g: Math.round(g / 17) * 17,
          b: Math.round(b / 17) * 17,
        };

        const key = `${quantized.r},${quantized.g},${quantized.b}`;
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
      }

      // Convert to Color array
      const colors: Color[] = Array.from(colorMap.entries())
        .map(([key, frequency]) => {
          const [r, g, b] = key.split(',').map(Number);
          return {
            hex: this.rgbToHex({ r, g, b }),
            rgb: { r, g, b },
            frequency,
          };
        })
        .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
        .slice(0, maxColors);

      return colors;
    } catch (error) {
      console.error('[ColorExtractor] Error extracting from image:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to extract colors: ${message}`);
    }
  }

  /**
   * Parse color string to RGB
   * Supports hex (#RGB, #RRGGBB) and rgb() formats
   */
  private parseColor(colorStr: string): { r: number; g: number; b: number } | null {
    colorStr = colorStr.trim();

    // Hex format
    if (colorStr.startsWith('#')) {
      const hex = colorStr.substring(1);

      if (hex.length === 3) {
        // #RGB
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
        };
      } else if (hex.length === 6) {
        // #RRGGBB
        return {
          r: parseInt(hex.substring(0, 2), 16),
          g: parseInt(hex.substring(2, 4), 16),
          b: parseInt(hex.substring(4, 6), 16),
        };
      }
    }

    // rgb() format
    const rgbMatch = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3]),
      };
    }

    // Named colors (basic set)
    const namedColors: Record<string, { r: number; g: number; b: number }> = {
      black: { r: 0, g: 0, b: 0 },
      white: { r: 255, g: 255, b: 255 },
      red: { r: 255, g: 0, b: 0 },
      green: { r: 0, g: 128, b: 0 },
      blue: { r: 0, g: 0, b: 255 },
      yellow: { r: 255, g: 255, b: 0 },
      cyan: { r: 0, g: 255, b: 255 },
      magenta: { r: 255, g: 0, b: 255 },
    };

    return namedColors[colorStr.toLowerCase()] || null;
  }

  /**
   * Convert RGB to hex string
   */
  private rgbToHex(rgb: { r: number; g: number; b: number }): string {
    const toHex = (n: number) => {
      const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  /**
   * Generate color palette based on base color
   * Supports complementary, analogous, and triadic schemes
   */
  generatePalette(baseColor: string, type: 'complementary' | 'analogous' | 'triadic'): Color[] {
    const rgb = this.parseColor(baseColor);
    if (!rgb) {
      throw new Error('Invalid base color');
    }

    // Convert RGB to HSL for easier manipulation
    const hsl = this.rgbToHsl(rgb);
    const colors: Color[] = [];

    switch (type) {
      case 'complementary':
        // Opposite on color wheel (180 degrees)
        colors.push({ hex: baseColor, rgb });
        colors.push(this.hslToColorObject({ ...hsl, h: (hsl.h + 180) % 360 }));
        break;

      case 'analogous':
        // Adjacent colors on wheel (30 degrees apart)
        colors.push(this.hslToColorObject({ ...hsl, h: (hsl.h - 30 + 360) % 360 }));
        colors.push({ hex: baseColor, rgb });
        colors.push(this.hslToColorObject({ ...hsl, h: (hsl.h + 30) % 360 }));
        break;

      case 'triadic':
        // Three colors evenly spaced (120 degrees)
        colors.push({ hex: baseColor, rgb });
        colors.push(this.hslToColorObject({ ...hsl, h: (hsl.h + 120) % 360 }));
        colors.push(this.hslToColorObject({ ...hsl, h: (hsl.h + 240) % 360 }));
        break;
    }

    return colors;
  }

  /**
   * Convert RGB to HSL
   */
  private rgbToHsl(rgb: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) {
      return { h: 0, s: 0, l };
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h = 0;
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }

    return { h: h * 360, s, l };
  }

  /**
   * Convert HSL to Color object
   */
  private hslToColorObject(hsl: { h: number; s: number; l: number }): Color {
    const rgb = this.hslToRgb(hsl);
    return {
      hex: this.rgbToHex(rgb),
      rgb,
    };
  }

  /**
   * Convert HSL to RGB
   */
  private hslToRgb(hsl: { h: number; s: number; l: number }): { r: number; g: number; b: number } {
    const { h: hue, s, l } = hsl;
    const h = hue / 360;

    if (s === 0) {
      const gray = Math.round(l * 255);
      return { r: gray, g: gray, b: gray };
    }

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
      r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      g: Math.round(hue2rgb(p, q, h) * 255),
      b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    };
  }
}

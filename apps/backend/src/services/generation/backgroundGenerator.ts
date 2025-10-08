/*
 * Background Generator Service
 * Creates backgrounds for logo variants (solid colors, gradients, patterns)
 * Option 1: Sharp for raster backgrounds (pros: fast, high quality; cons: raster only)
 * Option 2: SVG generation (pros: scalable; cons: limited effects)
 * Chosen: Sharp for MVP with SVG support planned for Phase 2
 */

import sharp from 'sharp';

export type BackgroundType = 'solid' | 'linear-gradient' | 'radial-gradient' | 'pattern';

export interface SolidBackgroundOptions {
  type: 'solid';
  color: string;
}

export interface LinearGradientOptions {
  type: 'linear-gradient';
  startColor: string;
  endColor: string;
  angle?: number; // Degrees, default 0 (top to bottom)
}

export interface RadialGradientOptions {
  type: 'radial-gradient';
  centerColor: string;
  edgeColor: string;
  centerX?: number; // 0-1, default 0.5
  centerY?: number; // 0-1, default 0.5
}

export interface PatternOptions {
  type: 'pattern';
  patternType: 'dots' | 'grid' | 'diagonal-lines' | 'checkerboard';
  foregroundColor: string;
  backgroundColor: string;
  scale?: number; // Pattern size multiplier, default 1
}

export type BackgroundOptions =
  | SolidBackgroundOptions
  | LinearGradientOptions
  | RadialGradientOptions
  | PatternOptions;

export class BackgroundGeneratorService {
  /**
   * Generate background image buffer
   */
  async generateBackground(
    width: number,
    height: number,
    options: BackgroundOptions,
  ): Promise<Buffer> {
    switch (options.type) {
      case 'solid':
        return this.generateSolid(width, height, options);
      case 'linear-gradient':
        return this.generateLinearGradient(width, height, options);
      case 'radial-gradient':
        return this.generateRadialGradient(width, height, options);
      case 'pattern':
        return this.generatePattern(width, height, options);
      default:
        throw new Error(`Unknown background type`);
    }
  }

  /**
   * Generate solid color background
   */
  private async generateSolid(
    width: number,
    height: number,
    options: SolidBackgroundOptions,
  ): Promise<Buffer> {
    const color = this.parseColor(options.color);

    return await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: color,
      },
    })
      .png()
      .toBuffer();
  }

  /**
   * Generate linear gradient background
   */
  private async generateLinearGradient(
    width: number,
    height: number,
    options: LinearGradientOptions,
  ): Promise<Buffer> {
    const angle = options.angle || 0;
    const startColor = this.parseColor(options.startColor);
    const endColor = this.parseColor(options.endColor);

    // Create SVG gradient
    const svg = this.createLinearGradientSVG(width, height, startColor, endColor, angle);

    // Convert SVG to PNG
    return await sharp(Buffer.from(svg)).png().toBuffer();
  }

  /**
   * Generate radial gradient background
   */
  private async generateRadialGradient(
    width: number,
    height: number,
    options: RadialGradientOptions,
  ): Promise<Buffer> {
    const centerColor = this.parseColor(options.centerColor);
    const edgeColor = this.parseColor(options.edgeColor);
    const centerX = options.centerX ?? 0.5;
    const centerY = options.centerY ?? 0.5;

    // Create SVG gradient
    const svg = this.createRadialGradientSVG(
      width,
      height,
      centerColor,
      edgeColor,
      centerX,
      centerY,
    );

    // Convert SVG to PNG
    return await sharp(Buffer.from(svg)).png().toBuffer();
  }

  /**
   * Generate pattern background
   */
  private async generatePattern(
    width: number,
    height: number,
    options: PatternOptions,
  ): Promise<Buffer> {
    const fg = this.parseColor(options.foregroundColor);
    const bg = this.parseColor(options.backgroundColor);
    const scale = options.scale ?? 1;

    let svg: string;

    switch (options.patternType) {
      case 'dots':
        svg = this.createDotsPattern(width, height, fg, bg, scale);
        break;
      case 'grid':
        svg = this.createGridPattern(width, height, fg, bg, scale);
        break;
      case 'diagonal-lines':
        svg = this.createDiagonalLinesPattern(width, height, fg, bg, scale);
        break;
      case 'checkerboard':
        svg = this.createCheckerboardPattern(width, height, fg, bg, scale);
        break;
      default:
        throw new Error(`Unknown pattern type: ${options.patternType}`);
    }

    return await sharp(Buffer.from(svg)).png().toBuffer();
  }

  /**
   * Create linear gradient SVG
   */
  private createLinearGradientSVG(
    width: number,
    height: number,
    startColor: string,
    endColor: string,
    angle: number,
  ): string {
    // Convert angle to SVG gradient coordinates
    const radians = (angle * Math.PI) / 180;
    const x1 = 50 - 50 * Math.cos(radians);
    const y1 = 50 - 50 * Math.sin(radians);
    const x2 = 50 + 50 * Math.cos(radians);
    const y2 = 50 + 50 * Math.sin(radians);

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
            <stop offset="0%" style="stop-color:${startColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${endColor};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#grad)" />
      </svg>
    `;
  }

  /**
   * Create radial gradient SVG
   */
  private createRadialGradientSVG(
    width: number,
    height: number,
    centerColor: string,
    edgeColor: string,
    centerX: number,
    centerY: number,
  ): string {
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad" cx="${centerX * 100}%" cy="${centerY * 100}%">
            <stop offset="0%" style="stop-color:${centerColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${edgeColor};stop-opacity:1" />
          </radialGradient>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#grad)" />
      </svg>
    `;
  }

  /**
   * Create dots pattern SVG
   */
  private createDotsPattern(
    width: number,
    height: number,
    fg: string,
    bg: string,
    scale: number,
  ): string {
    const spacing = 20 * scale;
    const radius = 3 * scale;

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots" x="0" y="0" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">
            <rect width="${spacing}" height="${spacing}" fill="${bg}" />
            <circle cx="${spacing / 2}" cy="${spacing / 2}" r="${radius}" fill="${fg}" />
          </pattern>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#dots)" />
      </svg>
    `;
  }

  /**
   * Create grid pattern SVG
   */
  private createGridPattern(
    width: number,
    height: number,
    fg: string,
    bg: string,
    scale: number,
  ): string {
    const spacing = 30 * scale;
    const strokeWidth = 1 * scale;

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" x="0" y="0" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">
            <rect width="${spacing}" height="${spacing}" fill="${bg}" />
            <path d="M ${spacing} 0 L 0 0 0 ${spacing}" fill="none" stroke="${fg}" stroke-width="${strokeWidth}" />
          </pattern>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#grid)" />
      </svg>
    `;
  }

  /**
   * Create diagonal lines pattern SVG
   */
  private createDiagonalLinesPattern(
    width: number,
    height: number,
    fg: string,
    bg: string,
    scale: number,
  ): string {
    const spacing = 15 * scale;
    const strokeWidth = 2 * scale;

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="diagonal" x="0" y="0" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse">
            <rect width="${spacing}" height="${spacing}" fill="${bg}" />
            <line x1="0" y1="0" x2="${spacing}" y2="${spacing}" stroke="${fg}" stroke-width="${strokeWidth}" />
          </pattern>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#diagonal)" />
      </svg>
    `;
  }

  /**
   * Create checkerboard pattern SVG
   */
  private createCheckerboardPattern(
    width: number,
    height: number,
    fg: string,
    bg: string,
    scale: number,
  ): string {
    const size = 20 * scale;

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="checker" x="0" y="0" width="${size * 2}" height="${size * 2}" patternUnits="userSpaceOnUse">
            <rect width="${size * 2}" height="${size * 2}" fill="${bg}" />
            <rect x="0" y="0" width="${size}" height="${size}" fill="${fg}" />
            <rect x="${size}" y="${size}" width="${size}" height="${size}" fill="${fg}" />
          </pattern>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#checker)" />
      </svg>
    `;
  }

  /**
   * Parse color string to Sharp-compatible format
   */
  private parseColor(color: string): string {
    // Handle hex colors
    if (color.startsWith('#')) {
      return color;
    }

    // Handle rgb/rgba
    if (color.startsWith('rgb')) {
      return color;
    }

    // Handle named colors
    return color;
  }

  /**
   * Generate background from logo's color palette
   * Uses dominant color with slight adjustments
   */
  async generateFromPalette(
    width: number,
    height: number,
    palette: string[],
    style: 'solid' | 'gradient' = 'gradient',
  ): Promise<Buffer> {
    if (palette.length === 0) {
      // Fallback to white
      return this.generateSolid(width, height, {
        type: 'solid',
        color: '#ffffff',
      });
    }

    if (style === 'solid') {
      return this.generateSolid(width, height, {
        type: 'solid',
        color: palette[0],
      });
    }

    // Generate gradient from first two colors
    const startColor = palette[0];
    const endColor = palette[1] || this.lightenColor(palette[0], 20);

    return this.generateLinearGradient(width, height, {
      type: 'linear-gradient',
      startColor,
      endColor,
      angle: 135, // Diagonal
    });
  }

  /**
   * Lighten a hex color by a percentage
   */
  private lightenColor(hex: string, percent: number): string {
    // Remove # if present
    hex = hex.replace('#', '');

    // Parse RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Lighten
    const newR = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    const newG = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    const newB = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }
}

export const backgroundGeneratorService = new BackgroundGeneratorService();

/*
 * Logo Analyzer Service
 * Unified service that analyzes both SVG and PNG logos
 * Extracts comprehensive metadata for variant generation
 */

import { svgParserService } from './svgParser';
import { pngAnalyzerService } from './pngAnalyzer';

export interface LogoAnalysisResult {
  format: 'svg' | 'png';
  width?: number;
  height?: number;
  aspectRatio?: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  safeMargins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  colorPalette: string[];
  hasText?: boolean;
  hasAlpha?: boolean;
  // SVG-specific data
  svgData?: {
    viewBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    elements: {
      paths: number;
      circles: number;
      rects: number;
      polygons: number;
      text: number;
      groups: number;
    };
  };
  // PNG-specific data
  pngData?: {
    channels: number;
    dominantColors: string[];
    estimatedTrimBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

export class LogoAnalyzerService {
  /**
   * Analyze logo file and extract comprehensive metadata
   */
  async analyzeLogo(buffer: Buffer, mimeType: string): Promise<LogoAnalysisResult> {
    if (mimeType === 'image/svg+xml') {
      return this.analyzeSVG(buffer);
    } else if (mimeType === 'image/png') {
      return this.analyzePNG(buffer);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  /**
   * Analyze SVG logo
   */
  private async analyzeSVG(buffer: Buffer): Promise<LogoAnalysisResult> {
    const svgAnalysis = await svgParserService.parseSVG(buffer);
    const safeMargins = svgParserService.calculateSafeMargins(svgAnalysis.boundingBox);

    return {
      format: 'svg',
      width: svgAnalysis.width,
      height: svgAnalysis.height,
      aspectRatio: svgAnalysis.boundingBox.width / svgAnalysis.boundingBox.height,
      boundingBox: svgAnalysis.boundingBox,
      safeMargins,
      colorPalette: svgAnalysis.colorPalette,
      hasText: svgAnalysis.hasText,
      svgData: {
        viewBox: svgAnalysis.viewBox,
        elements: svgAnalysis.elements,
      },
    };
  }

  /**
   * Analyze PNG logo
   */
  private async analyzePNG(buffer: Buffer): Promise<LogoAnalysisResult> {
    const pngAnalysis = await pngAnalyzerService.analyzePNG(buffer);
    const safeMargins = pngAnalyzerService.calculateSafeMargins(
      pngAnalysis.boundingBox,
      pngAnalysis.estimatedTrimBox,
    );

    return {
      format: 'png',
      width: pngAnalysis.width,
      height: pngAnalysis.height,
      aspectRatio: pngAnalysis.aspectRatio,
      boundingBox: pngAnalysis.boundingBox,
      safeMargins,
      colorPalette: pngAnalysis.dominantColors,
      hasAlpha: pngAnalysis.hasAlpha,
      pngData: {
        channels: pngAnalysis.channels,
        dominantColors: pngAnalysis.dominantColors,
        estimatedTrimBox: pngAnalysis.estimatedTrimBox,
      },
    };
  }

  /**
   * Generate foreground/background mask for PNG
   */
  async generateMask(buffer: Buffer, mimeType: string): Promise<Buffer | null> {
    if (mimeType !== 'image/png') {
      return null;
    }

    return pngAnalyzerService.generateMask(buffer);
  }

  /**
   * Determine optimal export dimensions for a given preset
   */
  calculateOptimalDimensions(
    analysis: LogoAnalysisResult,
    targetWidth: number,
    targetHeight: number,
  ): {
    logoWidth: number;
    logoHeight: number;
    offsetX: number;
    offsetY: number;
    scale: number;
  } {
    const targetAspectRatio = targetWidth / targetHeight;
    const logoAspectRatio = analysis.aspectRatio || 1;

    // Calculate scale to fit logo within target with safe margins
    const marginFactor = 1 - (analysis.safeMargins.left + analysis.safeMargins.right);
    const usableWidth = targetWidth * marginFactor;
    const usableHeight = targetHeight * marginFactor;

    let scale: number;
    let logoWidth: number;
    let logoHeight: number;

    if (logoAspectRatio > targetAspectRatio) {
      // Logo is wider than target
      scale = usableWidth / (analysis.boundingBox.width || targetWidth);
      logoWidth = usableWidth;
      logoHeight = logoWidth / logoAspectRatio;
    } else {
      // Logo is taller than target
      scale = usableHeight / (analysis.boundingBox.height || targetHeight);
      logoHeight = usableHeight;
      logoWidth = logoHeight * logoAspectRatio;
    }

    // Center the logo
    const offsetX = (targetWidth - logoWidth) / 2;
    const offsetY = (targetHeight - logoHeight) / 2;

    return {
      logoWidth: Math.round(logoWidth),
      logoHeight: Math.round(logoHeight),
      offsetX: Math.round(offsetX),
      offsetY: Math.round(offsetY),
      scale,
    };
  }
}

export const logoAnalyzerService = new LogoAnalyzerService();

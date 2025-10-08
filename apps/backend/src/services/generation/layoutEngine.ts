/*
 * Layout Engine Service
 * Handles composition logic for different aspect ratios, scaling, and positioning
 * Option 1: Manual calculations (pros: full control, predictable; cons: more code)
 * Option 2: Use canvas library (pros: simpler; cons: limited precision control)
 * Chosen: Manual calculations for precision and flexibility
 */

import { LogoAnalysisResult } from '../analysis/logoAnalyzer';

export interface LayoutPreset {
  name: string;
  width: number;
  height: number;
  description: string;
  category: 'web' | 'social' | 'mobile' | 'print';
}

export interface LayoutCalculation {
  // Target canvas dimensions
  canvasWidth: number;
  canvasHeight: number;
  canvasAspectRatio: number;

  // Logo dimensions and position
  logoWidth: number;
  logoHeight: number;
  logoX: number;
  logoY: number;
  logoScale: number;

  // Margins applied
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;

  // Usable area (after margins)
  usableWidth: number;
  usableHeight: number;
  usableX: number;
  usableY: number;
}

export type LogoAlignment =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface LayoutOptions {
  alignment?: LogoAlignment;
  customMargins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  maintainAspectRatio?: boolean;
  fillMode?: 'contain' | 'cover' | 'fit';
}

export class LayoutEngineService {
  /**
   * Calculate layout for logo in target dimensions
   */
  calculateLayout(
    analysis: LogoAnalysisResult,
    targetWidth: number,
    targetHeight: number,
    options: LayoutOptions = {},
  ): LayoutCalculation {
    const {
      alignment = 'center',
      customMargins,
      maintainAspectRatio = true,
      fillMode = 'contain',
    } = options;

    // Calculate margins (use custom or from analysis)
    const margins = this.calculateMargins(analysis, customMargins);

    // Calculate usable area
    const usableWidth = targetWidth * (1 - margins.left - margins.right);
    const usableHeight = targetHeight * (1 - margins.top - margins.bottom);
    const usableX = targetWidth * margins.left;
    const usableY = targetHeight * margins.top;

    // Calculate logo dimensions
    const logoDimensions = this.calculateLogoDimensions(
      analysis,
      usableWidth,
      usableHeight,
      maintainAspectRatio,
      fillMode,
    );

    // Calculate logo position based on alignment
    const logoPosition = this.calculatePosition(
      logoDimensions.width,
      logoDimensions.height,
      usableX,
      usableY,
      usableWidth,
      usableHeight,
      alignment,
    );

    return {
      canvasWidth: targetWidth,
      canvasHeight: targetHeight,
      canvasAspectRatio: targetWidth / targetHeight,
      logoWidth: Math.round(logoDimensions.width),
      logoHeight: Math.round(logoDimensions.height),
      logoX: Math.round(logoPosition.x),
      logoY: Math.round(logoPosition.y),
      logoScale: logoDimensions.scale,
      marginTop: margins.top,
      marginRight: margins.right,
      marginBottom: margins.bottom,
      marginLeft: margins.left,
      usableWidth: Math.round(usableWidth),
      usableHeight: Math.round(usableHeight),
      usableX: Math.round(usableX),
      usableY: Math.round(usableY),
    };
  }

  /**
   * Calculate margins to apply
   */
  private calculateMargins(
    analysis: LogoAnalysisResult,
    customMargins?: LayoutOptions['customMargins'],
  ): Required<{ top: number; right: number; bottom: number; left: number }> {
    // Start with safe margins from analysis
    const base = analysis.safeMargins;

    // Override with custom margins if provided
    return {
      top: customMargins?.top ?? base.top,
      right: customMargins?.right ?? base.right,
      bottom: customMargins?.bottom ?? base.bottom,
      left: customMargins?.left ?? base.left,
    };
  }

  /**
   * Calculate logo dimensions to fit within usable area
   */
  private calculateLogoDimensions(
    analysis: LogoAnalysisResult,
    usableWidth: number,
    usableHeight: number,
    maintainAspectRatio: boolean,
    fillMode: 'contain' | 'cover' | 'fit',
  ): { width: number; height: number; scale: number } {
    const logoWidth = analysis.boundingBox.width;
    const logoHeight = analysis.boundingBox.height;
    // Aspect ratio retained via width/height; explicit variable not required

    if (!maintainAspectRatio) {
      // Stretch to fill
      return {
        width: usableWidth,
        height: usableHeight,
        scale: Math.min(usableWidth / logoWidth, usableHeight / logoHeight),
      };
    }

    let scale: number;
    let width: number;
    let height: number;

    if (fillMode === 'contain') {
      // Fit entirely within usable area
      const scaleX = usableWidth / logoWidth;
      const scaleY = usableHeight / logoHeight;
      scale = Math.min(scaleX, scaleY);
      width = logoWidth * scale;
      height = logoHeight * scale;
    } else if (fillMode === 'cover') {
      // Fill entire usable area (may crop logo)
      const scaleX = usableWidth / logoWidth;
      const scaleY = usableHeight / logoHeight;
      scale = Math.max(scaleX, scaleY);
      width = logoWidth * scale;
      height = logoHeight * scale;
    } else {
      // 'fit' - same as contain
      const scaleX = usableWidth / logoWidth;
      const scaleY = usableHeight / logoHeight;
      scale = Math.min(scaleX, scaleY);
      width = logoWidth * scale;
      height = logoHeight * scale;
    }

    return { width, height, scale };
  }

  /**
   * Calculate logo position based on alignment
   */
  private calculatePosition(
    logoWidth: number,
    logoHeight: number,
    usableX: number,
    usableY: number,
    usableWidth: number,
    usableHeight: number,
    alignment: LogoAlignment,
  ): { x: number; y: number } {
    let x: number;
    let y: number;

    // Calculate horizontal position
    switch (alignment) {
      case 'left':
      case 'top-left':
      case 'bottom-left':
        x = usableX;
        break;
      case 'right':
      case 'top-right':
      case 'bottom-right':
        x = usableX + usableWidth - logoWidth;
        break;
      default: // center
        x = usableX + (usableWidth - logoWidth) / 2;
    }

    // Calculate vertical position
    switch (alignment) {
      case 'top':
      case 'top-left':
      case 'top-right':
        y = usableY;
        break;
      case 'bottom':
      case 'bottom-left':
      case 'bottom-right':
        y = usableY + usableHeight - logoHeight;
        break;
      default: // center
        y = usableY + (usableHeight - logoHeight) / 2;
    }

    return { x, y };
  }

  /**
   * Calculate scaling factor for logo to fit target
   */
  calculateScaleFactor(
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number,
    mode: 'contain' | 'cover' = 'contain',
  ): number {
    const scaleX = targetWidth / sourceWidth;
    const scaleY = targetHeight / sourceHeight;

    return mode === 'contain' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);
  }

  /**
   * Adjust layout for specific aspect ratio constraints
   */
  adjustForAspectRatio(layout: LayoutCalculation, targetAspectRatio: number): LayoutCalculation {
    const currentAspectRatio = layout.canvasWidth / layout.canvasHeight;

    if (Math.abs(currentAspectRatio - targetAspectRatio) < 0.01) {
      return layout; // Already correct
    }

    // Adjust canvas dimensions to match target aspect ratio
    let newWidth: number;
    let newHeight: number;

    if (currentAspectRatio > targetAspectRatio) {
      // Too wide, adjust width
      newHeight = layout.canvasHeight;
      newWidth = newHeight * targetAspectRatio;
    } else {
      // Too tall, adjust height
      newWidth = layout.canvasWidth;
      newHeight = newWidth / targetAspectRatio;
    }

    return {
      ...layout,
      canvasWidth: Math.round(newWidth),
      canvasHeight: Math.round(newHeight),
      canvasAspectRatio: targetAspectRatio,
    };
  }
}

export const layoutEngineService = new LayoutEngineService();

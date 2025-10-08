/*
 * Layout Optimizer Service
 * Evaluates and optimizes logo placement using composition principles
 *
 * Option 1: ML model (pros: accurate; cons: complex, needs training)
 * Option 2: Rule-based heuristics (pros: fast, predictable; cons: limited)
 * Option 3: Hybrid approach (pros: best of both; cons: complexity)
 * Chosen: Rule-based with AI enhancement for MVP
 */

import { LayoutCalculation } from '../generation/layoutEngine';
// sharp may be used in future enhancements; suppress unused for now
// import sharp from 'sharp';

export interface LayoutScore {
  overall: number; // 0-100
  balance: number;
  hierarchy: number;
  whitespace: number;
  alignment: number;
  recommendations: string[];
}

export interface OptimizedLayout extends LayoutCalculation {
  score: LayoutScore;
  alternativeLayouts: LayoutCalculation[];
}

export interface LayoutOptimizationRequest {
  logoBuffer: Buffer;
  logoWidth: number;
  logoHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  currentLayout: LayoutCalculation;
}

class LayoutOptimizerService {
  /**
   * Evaluate layout quality
   */
  async evaluateLayout(request: LayoutOptimizationRequest): Promise<LayoutScore> {
    const balanceScore = this.scoreBalance(request);
    const hierarchyScore = this.scoreHierarchy(request);
    const whitespaceScore = this.scoreWhitespace(request);
    const alignmentScore = this.scoreAlignment(request);

    const overall =
      balanceScore * 0.3 + hierarchyScore * 0.25 + whitespaceScore * 0.25 + alignmentScore * 0.2;

    const recommendations = this.generateRecommendations({
      balance: balanceScore,
      hierarchy: hierarchyScore,
      whitespace: whitespaceScore,
      alignment: alignmentScore,
    });

    return {
      overall: Math.round(overall),
      balance: Math.round(balanceScore),
      hierarchy: Math.round(hierarchyScore),
      whitespace: Math.round(whitespaceScore),
      alignment: Math.round(alignmentScore),
      recommendations,
    };
  }

  /**
   * Optimize layout for best composition
   */
  async optimizeLayout(request: LayoutOptimizationRequest): Promise<OptimizedLayout> {
    // Generate alternative layouts
    const alternatives = this.generateAlternatives(request);

    // Score each layout
    const scoredLayouts = await Promise.all(
      alternatives.map(async (layout) => ({
        layout,
        score: await this.evaluateLayout({
          ...request,
          currentLayout: layout,
        }),
      })),
    );

    // Sort by score
    scoredLayouts.sort((a, b) => b.score.overall - a.score.overall);

    const best = scoredLayouts[0];

    return {
      ...best.layout,
      score: best.score,
      alternativeLayouts: scoredLayouts.slice(1, 4).map((s) => s.layout),
    };
  }

  /**
   * Score visual balance (weight distribution)
   */
  private scoreBalance(request: LayoutOptimizationRequest): number {
    const { currentLayout, canvasWidth, canvasHeight } = request;

    // Calculate center of mass
    const logoCenterX = currentLayout.x + currentLayout.width / 2;
    const logoCenterY = currentLayout.y + currentLayout.height / 2;
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;

    // Distance from center (normalized)
    const distanceX = Math.abs(logoCenterX - canvasCenterX) / canvasWidth;
    const distanceY = Math.abs(logoCenterY - canvasCenterY) / canvasHeight;

    // Perfect center = 100, edges = 0
    const balanceScore = 100 * (1 - (distanceX + distanceY) / 2);

    return Math.max(0, balanceScore);
  }

  /**
   * Score visual hierarchy (size relationships)
   */
  private scoreHierarchy(request: LayoutOptimizationRequest): number {
    const { logoWidth, logoHeight, canvasWidth, canvasHeight } = request;

    // Calculate logo-to-canvas ratio
    const logoArea = logoWidth * logoHeight;
    const canvasArea = canvasWidth * canvasHeight;
    const ratio = logoArea / canvasArea;

    // Ideal ratio is 0.15-0.4 (15-40% of canvas)
    let score = 0;
    if (ratio < 0.05) {
      score = 30; // Too small
    } else if (ratio < 0.15) {
      score = 60 + (ratio - 0.05) * 400; // Ramp up
    } else if (ratio <= 0.4) {
      score = 100; // Ideal range
    } else if (ratio < 0.6) {
      score = 100 - (ratio - 0.4) * 200; // Ramp down
    } else {
      score = 20; // Too large
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score whitespace usage
   */
  private scoreWhitespace(request: LayoutOptimizationRequest): number {
    const { currentLayout, canvasWidth, canvasHeight } = request;

    // Calculate margins
    const marginTop = currentLayout.y;
    const marginBottom = canvasHeight - (currentLayout.y + currentLayout.height);
    const marginLeft = currentLayout.x;
    const marginRight = canvasWidth - (currentLayout.x + currentLayout.width);

    // Calculate minimum and balance
    const minMargin = Math.min(marginTop, marginBottom, marginLeft, marginRight);
    const maxMargin = Math.max(marginTop, marginBottom, marginLeft, marginRight);

    // Ideal: margins > 5% of canvas and balanced
    const minRatio = minMargin / Math.max(canvasWidth, canvasHeight);
    const balance = maxMargin > 0 ? minMargin / maxMargin : 0;

    const minScore = Math.min(100, minRatio * 2000); // 5% = 100
    const balanceScore = balance * 100;

    return minScore * 0.6 + balanceScore * 0.4;
  }

  /**
   * Score alignment quality
   */
  private scoreAlignment(request: LayoutOptimizationRequest): number {
    const { currentLayout, canvasWidth, canvasHeight } = request;

    // Check alignment to common grid points
    const gridPoints = {
      centerX: canvasWidth / 2,
      centerY: canvasHeight / 2,
      thirdX: canvasWidth / 3,
      twoThirdX: (canvasWidth * 2) / 3,
      thirdY: canvasHeight / 3,
      twoThirdY: (canvasHeight * 2) / 3,
    };

    const logoCenterX = currentLayout.x + currentLayout.width / 2;
    const logoCenterY = currentLayout.y + currentLayout.height / 2;

    // Calculate distance to nearest grid point
    let minDistance = Infinity;
    Object.values(gridPoints).forEach((point) => {
      const dist = Math.abs(logoCenterX - point) + Math.abs(logoCenterY - point);
      minDistance = Math.min(minDistance, dist);
    });

    // Normalize distance (closer = better)
    const tolerance = Math.max(canvasWidth, canvasHeight) * 0.05; // 5% tolerance
    const score = 100 * (1 - Math.min(minDistance / tolerance, 1));

    return Math.max(0, score);
  }

  /**
   * Generate alternative layout options
   */
  private generateAlternatives(request: LayoutOptimizationRequest): LayoutCalculation[] {
    const { logoWidth, logoHeight, canvasWidth, canvasHeight } = request;
    const alternatives: LayoutCalculation[] = [];

    // Center aligned
    alternatives.push({
      x: (canvasWidth - logoWidth) / 2,
      y: (canvasHeight - logoHeight) / 2,
      width: logoWidth,
      height: logoHeight,
      scale: 1,
    });

    // Rule of thirds positions
    const positions = [
      { x: canvasWidth / 3, y: canvasHeight / 3 },
      { x: (canvasWidth * 2) / 3, y: canvasHeight / 3 },
      { x: canvasWidth / 3, y: (canvasHeight * 2) / 3 },
      { x: (canvasWidth * 2) / 3, y: (canvasHeight * 2) / 3 },
    ];

    positions.forEach((pos) => {
      alternatives.push({
        x: pos.x - logoWidth / 2,
        y: pos.y - logoHeight / 2,
        width: logoWidth,
        height: logoHeight,
        scale: 1,
      });
    });

    // Top center (common for headers)
    alternatives.push({
      x: (canvasWidth - logoWidth) / 2,
      y: canvasHeight * 0.15,
      width: logoWidth,
      height: logoHeight,
      scale: 1,
    });

    // Bottom center (common for footers)
    alternatives.push({
      x: (canvasWidth - logoWidth) / 2,
      y: canvasHeight * 0.8 - logoHeight,
      width: logoWidth,
      height: logoHeight,
      scale: 1,
    });

    return alternatives;
  }

  /**
   * Generate recommendations based on scores
   */
  private generateRecommendations(scores: {
    balance: number;
    hierarchy: number;
    whitespace: number;
    alignment: number;
  }): string[] {
    const recommendations: string[] = [];

    if (scores.balance < 60) {
      recommendations.push('Consider centering the logo for better balance');
    }

    if (scores.hierarchy < 60) {
      recommendations.push('Logo size may be suboptimal - try scaling to 20-35% of canvas');
    }

    if (scores.whitespace < 60) {
      recommendations.push('Add more breathing room around the logo');
    }

    if (scores.alignment < 60) {
      recommendations.push('Align logo to standard grid points (center, thirds)');
    }

    if (scores.balance > 80 && scores.hierarchy > 80) {
      recommendations.push('Layout is well-balanced and appropriately sized');
    }

    return recommendations;
  }

  /**
   * Calculate optimal scale for logo
   */
  calculateOptimalScale(
    logoWidth: number,
    logoHeight: number,
    canvasWidth: number,
    canvasHeight: number,
    targetRatio: number = 0.25, // 25% of canvas
  ): number {
    const currentRatio = (logoWidth * logoHeight) / (canvasWidth * canvasHeight);
    const scale = Math.sqrt(targetRatio / currentRatio);

    // Clamp scale to reasonable range
    return Math.max(0.1, Math.min(2.0, scale));
  }

  /**
   * Detect aspect ratio category for specialized rules
   */
  detectAspectCategory(
    width: number,
    height: number,
  ): 'square' | 'landscape' | 'portrait' | 'wide' | 'tall' {
    const ratio = width / height;

    if (ratio > 2.5) return 'wide'; // 16:9 or wider
    if (ratio > 1.3) return 'landscape'; // Standard landscape
    if (ratio > 0.8 && ratio < 1.2) return 'square'; // Nearly square
    if (ratio < 0.4) return 'tall'; // Very tall
    return 'portrait'; // Standard portrait
  }

  /**
   * Apply aspect-specific optimizations
   */
  async optimizeForAspect(request: LayoutOptimizationRequest): Promise<OptimizedLayout> {
    const { canvasWidth, canvasHeight } = request;
    const category = this.detectAspectCategory(canvasWidth, canvasHeight);

    // Modify request based on aspect
    const modified = { ...request };

    switch (category) {
      case 'wide':
        // For wide formats, prefer horizontal centering
        modified.currentLayout.x = (canvasWidth - request.logoWidth) / 2;
        modified.currentLayout.y = canvasHeight * 0.4 - request.logoHeight / 2;
        break;
      case 'tall':
        // For tall formats, prefer vertical centering
        modified.currentLayout.x = canvasWidth * 0.5 - request.logoWidth / 2;
        modified.currentLayout.y = (canvasHeight - request.logoHeight) / 2;
        break;
      case 'square':
        // For square, perfect center is usually best
        modified.currentLayout.x = (canvasWidth - request.logoWidth) / 2;
        modified.currentLayout.y = (canvasHeight - request.logoHeight) / 2;
        break;
    }

    return this.optimizeLayout(modified);
  }
}

export const layoutOptimizerService = new LayoutOptimizerService();

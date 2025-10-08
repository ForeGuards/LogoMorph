/**
 * PathValidator - Validates path changes don't break logo
 */

import type { ParsedPath } from './pathEditor';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class PathValidator {
  /**
   * Validate a parsed path
   */
  validate(path: ParsedPath): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if path has at least one point
    if (path.points.length === 0) {
      errors.push('Path must have at least one point');
      return { valid: false, errors, warnings };
    }

    // First point should be MoveTo
    if (path.points[0].type !== 'M') {
      errors.push('Path must start with MoveTo (M) command');
    }

    // Check for invalid sequences
    for (let i = 0; i < path.points.length; i++) {
      const point = path.points[i];

      // Validate control points for curve commands
      if (point.type === 'C' && (!point.controlPoints || point.controlPoints.length !== 2)) {
        errors.push(`Cubic bezier at index ${i} requires 2 control points`);
      }

      if (point.type === 'Q' && (!point.controlPoints || point.controlPoints.length !== 1)) {
        errors.push(`Quadratic bezier at index ${i} requires 1 control point`);
      }

      // Check for NaN or Infinity
      if (!isFinite(point.x) || !isFinite(point.y)) {
        errors.push(`Invalid coordinates at index ${i}: (${point.x}, ${point.y})`);
      }

      // Warn about very large coordinates
      if (Math.abs(point.x) > 10000 || Math.abs(point.y) > 10000) {
        warnings.push(`Very large coordinates at index ${i}: (${point.x}, ${point.y})`);
      }
    }

    // Check bounds
    if (!isFinite(path.bounds.width) || !isFinite(path.bounds.height)) {
      errors.push('Invalid path bounds');
    }

    if (path.bounds.width === 0 && path.bounds.height === 0) {
      warnings.push('Path has zero dimensions (all points are the same)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate that path doesn't self-intersect (basic check)
   */
  checkSelfIntersection(path: ParsedPath): boolean {
    // Simple check: compare line segments
    // Full intersection detection is complex, this is a basic version
    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    for (let i = 1; i < path.points.length; i++) {
      const prev = path.points[i - 1];
      const curr = path.points[i];

      if (curr.type === 'L') {
        segments.push({
          x1: prev.x,
          y1: prev.y,
          x2: curr.x,
          y2: curr.y,
        });
      }
    }

    // Check each segment pair
    for (let i = 0; i < segments.length; i++) {
      for (let j = i + 2; j < segments.length; j++) {
        if (this.segmentsIntersect(segments[i], segments[j])) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if two line segments intersect
   */
  private segmentsIntersect(
    seg1: { x1: number; y1: number; x2: number; y2: number },
    seg2: { x1: number; y1: number; x2: number; y2: number },
  ): boolean {
    const ccw = (
      A: { x: number; y: number },
      B: { x: number; y: number },
      C: { x: number; y: number },
    ) => {
      return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
    };

    const A = { x: seg1.x1, y: seg1.y1 };
    const B = { x: seg1.x2, y: seg1.y2 };
    const C = { x: seg2.x1, y: seg2.y1 };
    const D = { x: seg2.x2, y: seg2.y2 };

    return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
  }
}

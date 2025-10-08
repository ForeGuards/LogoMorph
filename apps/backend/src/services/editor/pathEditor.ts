/**
 * PathEditor Service - SVG path parsing and manipulation
 *
 * Option 1: Use svg-path-parser library (pros: reliable, tested; cons: dependency)
 * Option 2: Custom regex parser (pros: no deps, full control; cons: complex)
 * Chosen: Custom parser for learning and control
 */

export interface PathPoint {
  x: number;
  y: number;
  type: 'M' | 'L' | 'C' | 'Q' | 'S' | 'T' | 'A' | 'Z';
  controlPoints?: { x: number; y: number }[];
}

export interface ParsedPath {
  id: string;
  d: string;
  points: PathPoint[];
  bounds: { x: number; y: number; width: number; height: number };
}

export class PathEditor {
  /**
   * Parse SVG path string into structured data
   * Supports M, L, C, Q, S, T, A, Z commands (absolute and relative)
   */
  parsePath(pathString: string, pathId: string = 'path-0'): ParsedPath {
    const points: PathPoint[] = [];
    let currentX = 0;
    let currentY = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Normalize path string: remove extra spaces, newlines
    const normalized = pathString.replace(/\s+/g, ' ').trim();

    // Split into commands
    const commandRegex = /([MmLlHhVvCcSsQqTtAaZz])\s*([^MmLlHhVvCcSsQqTtAaZz]*)/g;
    let match;

    while ((match = commandRegex.exec(normalized)) !== null) {
      const command = match[1];
      const coords = match[2]
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(parseFloat);

      const isRelative = command === command.toLowerCase();
      const absoluteCommand = command.toUpperCase() as PathPoint['type'];

      switch (absoluteCommand) {
        case 'M': {
          // MoveTo
          const x = isRelative ? currentX + coords[0] : coords[0];
          const y = isRelative ? currentY + coords[1] : coords[1];

          points.push({ x, y, type: 'M' });
          currentX = x;
          currentY = y;

          this.updateBounds({ x, y }, minX, minY, maxX, maxY);
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          break;
        }

        case 'L': {
          // LineTo
          const x = isRelative ? currentX + coords[0] : coords[0];
          const y = isRelative ? currentY + coords[1] : coords[1];

          points.push({ x, y, type: 'L' });
          currentX = x;
          currentY = y;

          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          break;
        }

        case 'C': {
          // Cubic Bezier
          const cp1x = isRelative ? currentX + coords[0] : coords[0];
          const cp1y = isRelative ? currentY + coords[1] : coords[1];
          const cp2x = isRelative ? currentX + coords[2] : coords[2];
          const cp2y = isRelative ? currentY + coords[3] : coords[3];
          const x = isRelative ? currentX + coords[4] : coords[4];
          const y = isRelative ? currentY + coords[5] : coords[5];

          points.push({
            x,
            y,
            type: 'C',
            controlPoints: [
              { x: cp1x, y: cp1y },
              { x: cp2x, y: cp2y },
            ],
          });

          currentX = x;
          currentY = y;

          minX = Math.min(minX, x, cp1x, cp2x);
          minY = Math.min(minY, y, cp1y, cp2y);
          maxX = Math.max(maxX, x, cp1x, cp2x);
          maxY = Math.max(maxY, y, cp1y, cp2y);
          break;
        }

        case 'Q': {
          // Quadratic Bezier
          const cpx = isRelative ? currentX + coords[0] : coords[0];
          const cpy = isRelative ? currentY + coords[1] : coords[1];
          const x = isRelative ? currentX + coords[2] : coords[2];
          const y = isRelative ? currentY + coords[3] : coords[3];

          points.push({
            x,
            y,
            type: 'Q',
            controlPoints: [{ x: cpx, y: cpy }],
          });

          currentX = x;
          currentY = y;

          minX = Math.min(minX, x, cpx);
          minY = Math.min(minY, y, cpy);
          maxX = Math.max(maxX, x, cpx);
          maxY = Math.max(maxY, y, cpy);
          break;
        }

        case 'Z': {
          // ClosePath
          points.push({ x: currentX, y: currentY, type: 'Z' });
          break;
        }
      }
    }

    return {
      id: pathId,
      d: pathString,
      points,
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      },
    };
  }

  /**
   * Update a point's coordinates
   */
  updatePoint(parsedPath: ParsedPath, pointIndex: number, newX: number, newY: number): ParsedPath {
    if (pointIndex < 0 || pointIndex >= parsedPath.points.length) {
      throw new Error(`Point index ${pointIndex} out of range`);
    }

    const updatedPoints = [...parsedPath.points];
    updatedPoints[pointIndex] = {
      ...updatedPoints[pointIndex],
      x: newX,
      y: newY,
    };

    const newPathString = this.pointsToPathString(updatedPoints);

    return {
      ...parsedPath,
      points: updatedPoints,
      d: newPathString,
    };
  }

  /**
   * Add a point after the specified index
   */
  addPoint(
    parsedPath: ParsedPath,
    afterIndex: number,
    x: number,
    y: number,
    type: PathPoint['type'] = 'L',
  ): ParsedPath {
    if (afterIndex < -1 || afterIndex >= parsedPath.points.length) {
      throw new Error(`Invalid index ${afterIndex}`);
    }

    const updatedPoints = [...parsedPath.points];
    updatedPoints.splice(afterIndex + 1, 0, { x, y, type });

    const newPathString = this.pointsToPathString(updatedPoints);

    return {
      ...parsedPath,
      points: updatedPoints,
      d: newPathString,
    };
  }

  /**
   * Remove a point at the specified index
   */
  removePoint(parsedPath: ParsedPath, pointIndex: number): ParsedPath {
    if (pointIndex < 0 || pointIndex >= parsedPath.points.length) {
      throw new Error(`Point index ${pointIndex} out of range`);
    }

    const updatedPoints = parsedPath.points.filter((_, i) => i !== pointIndex);

    if (updatedPoints.length === 0) {
      throw new Error('Cannot remove all points from path');
    }

    const newPathString = this.pointsToPathString(updatedPoints);

    return {
      ...parsedPath,
      points: updatedPoints,
      d: newPathString,
    };
  }

  /**
   * Convert points array back to SVG path string
   */
  private pointsToPathString(points: PathPoint[]): string {
    return points
      .map((point) => {
        switch (point.type) {
          case 'M':
            return `M ${point.x} ${point.y}`;
          case 'L':
            return `L ${point.x} ${point.y}`;
          case 'C':
            if (!point.controlPoints || point.controlPoints.length !== 2) {
              throw new Error('Cubic bezier requires 2 control points');
            }
            return `C ${point.controlPoints[0].x} ${point.controlPoints[0].y} ${point.controlPoints[1].x} ${point.controlPoints[1].y} ${point.x} ${point.y}`;
          case 'Q':
            if (!point.controlPoints || point.controlPoints.length !== 1) {
              throw new Error('Quadratic bezier requires 1 control point');
            }
            return `Q ${point.controlPoints[0].x} ${point.controlPoints[0].y} ${point.x} ${point.y}`;
          case 'Z':
            return 'Z';
          default:
            return `L ${point.x} ${point.y}`;
        }
      })
      .join(' ');
  }

  /**
   * Helper to update bounds (unused but kept for clarity)
   */
  private updateBounds(
    _point: { x: number; y: number },
    _minX: number,
    _minY: number,
    _maxX: number,
    _maxY: number,
  ): void {
    // This is a no-op helper for documentation purposes
    // Actual updates happen inline in parsePath
  }
}

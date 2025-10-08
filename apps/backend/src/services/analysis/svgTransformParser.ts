/*
 * SVG Transform Parser Service
 * Handles complex SVG structures with groups, transforms, and nested elements
 * Option 1: Custom parser with matrix operations (pros: lightweight; cons: complex math)
 * Option 2: Use existing library like svg-pathdata (pros: tested; cons: dependency)
 * Option 3: Parse with sax and apply transforms manually (pros: full control; cons: verbose)
 * Chosen: Custom parser with matrix operations for balance of control and performance
 */

import sax from 'sax';

export interface Transform {
  matrix: number[]; // 6-element affine transformation matrix [a, b, c, d, e, f]
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SVGElement {
  type: string;
  attributes: Record<string, string>;
  transform: Transform;
  boundingBox: BoundingBox | null;
  children: SVGElement[];
}

export class SVGTransformParserService {
  /**
   * Parse SVG and extract all elements with their transforms
   */
  async parseSVG(svgContent: string): Promise<SVGElement> {
    return new Promise((resolve, reject) => {
      const parser = sax.parser(true, { trim: true, normalize: true });
      const stack: SVGElement[] = [];
      let root: SVGElement | null = null;

      parser.onopentag = (node) => {
        const element: SVGElement = {
          type: node.name,
          attributes: node.attributes as Record<string, string>,
          transform: this.parseTransformAttribute(node.attributes.transform as string),
          boundingBox: this.extractBoundingBox(
            node.name,
            node.attributes as Record<string, string>,
          ),
          children: [],
        };

        // Apply parent transform if exists
        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          element.transform = this.combineTransforms(parent.transform, element.transform);
          parent.children.push(element);
        } else {
          root = element;
        }

        stack.push(element);
      };

      parser.onclosetag = () => {
        stack.pop();
      };

      parser.onerror = (error) => {
        reject(error);
      };

      parser.onend = () => {
        if (root) {
          resolve(root);
        } else {
          reject(new Error('Failed to parse SVG: no root element'));
        }
      };

      parser.write(svgContent).close();
    });
  }

  /**
   * Parse transform attribute string into matrix
   * Supports: translate, scale, rotate, skewX, skewY, matrix
   */
  parseTransformAttribute(transformStr?: string): Transform {
    if (!transformStr) {
      return { matrix: [1, 0, 0, 1, 0, 0] }; // Identity matrix
    }

    // Start with identity matrix
    let matrix = [1, 0, 0, 1, 0, 0];

    // Match all transform functions
    const transformRegex = /(\w+)\s*\(([^)]+)\)/g;
    let match;

    while ((match = transformRegex.exec(transformStr)) !== null) {
      const type = match[1];
      const args = match[2].split(/[\s,]+/).map(parseFloat);

      const transformMatrix = this.getTransformMatrix(type, args);
      matrix = this.multiplyMatrices(matrix, transformMatrix);
    }

    return { matrix };
  }

  /**
   * Get transformation matrix for a specific transform type
   */
  private getTransformMatrix(type: string, args: number[]): number[] {
    switch (type) {
      case 'translate': {
        const [tx, ty = 0] = args;
        return [1, 0, 0, 1, tx, ty];
      }
      case 'scale': {
        const [sx, sy = sx] = args;
        return [sx, 0, 0, sy, 0, 0];
      }
      case 'rotate': {
        const [angle, cx = 0, cy = 0] = args;
        const rad = (angle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        if (cx === 0 && cy === 0) {
          return [cos, sin, -sin, cos, 0, 0];
        }

        // Rotate around point (cx, cy)
        // translate(-cx, -cy) * rotate(angle) * translate(cx, cy)
        return [cos, sin, -sin, cos, -cx * cos + cy * sin + cx, -cx * sin - cy * cos + cy];
      }
      case 'skewX': {
        const [angle] = args;
        const tan = Math.tan((angle * Math.PI) / 180);
        return [1, 0, tan, 1, 0, 0];
      }
      case 'skewY': {
        const [angle] = args;
        const tan = Math.tan((angle * Math.PI) / 180);
        return [1, tan, 0, 1, 0, 0];
      }
      case 'matrix': {
        return args.slice(0, 6);
      }
      default:
        return [1, 0, 0, 1, 0, 0]; // Identity
    }
  }

  /**
   * Multiply two transformation matrices
   */
  private multiplyMatrices(m1: number[], m2: number[]): number[] {
    const [a1, b1, c1, d1, e1, f1] = m1;
    const [a2, b2, c2, d2, e2, f2] = m2;

    return [
      a1 * a2 + c1 * b2,
      b1 * a2 + d1 * b2,
      a1 * c2 + c1 * d2,
      b1 * c2 + d1 * d2,
      a1 * e2 + c1 * f2 + e1,
      b1 * e2 + d1 * f2 + f1,
    ];
  }

  /**
   * Combine parent and child transforms
   */
  combineTransforms(parent: Transform, child: Transform): Transform {
    return {
      matrix: this.multiplyMatrices(parent.matrix, child.matrix),
    };
  }

  /**
   * Apply transform to a point
   */
  transformPoint(point: { x: number; y: number }, transform: Transform): { x: number; y: number } {
    const [a, b, c, d, e, f] = transform.matrix;
    return {
      x: a * point.x + c * point.y + e,
      y: b * point.x + d * point.y + f,
    };
  }

  /**
   * Extract bounding box from element attributes
   */
  private extractBoundingBox(type: string, attrs: Record<string, string>): BoundingBox | null {
    switch (type) {
      case 'rect': {
        const x = parseFloat(attrs.x || '0');
        const y = parseFloat(attrs.y || '0');
        const width = parseFloat(attrs.width || '0');
        const height = parseFloat(attrs.height || '0');
        return { x, y, width, height };
      }
      case 'circle': {
        const cx = parseFloat(attrs.cx || '0');
        const cy = parseFloat(attrs.cy || '0');
        const r = parseFloat(attrs.r || '0');
        return {
          x: cx - r,
          y: cy - r,
          width: r * 2,
          height: r * 2,
        };
      }
      case 'ellipse': {
        const cx = parseFloat(attrs.cx || '0');
        const cy = parseFloat(attrs.cy || '0');
        const rx = parseFloat(attrs.rx || '0');
        const ry = parseFloat(attrs.ry || '0');
        return {
          x: cx - rx,
          y: cy - ry,
          width: rx * 2,
          height: ry * 2,
        };
      }
      case 'line': {
        const x1 = parseFloat(attrs.x1 || '0');
        const y1 = parseFloat(attrs.y1 || '0');
        const x2 = parseFloat(attrs.x2 || '0');
        const y2 = parseFloat(attrs.y2 || '0');
        return {
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          width: Math.abs(x2 - x1),
          height: Math.abs(y2 - y1),
        };
      }
      case 'svg': {
        const x = parseFloat(attrs.x || '0');
        const y = parseFloat(attrs.y || '0');
        const width = parseFloat(attrs.width || '0');
        const height = parseFloat(attrs.height || '0');
        return { x, y, width, height };
      }
      default:
        return null;
    }
  }

  /**
   * Calculate transformed bounding box
   */
  calculateTransformedBoundingBox(bbox: BoundingBox, transform: Transform): BoundingBox {
    // Transform all four corners
    const corners = [
      { x: bbox.x, y: bbox.y },
      { x: bbox.x + bbox.width, y: bbox.y },
      { x: bbox.x + bbox.width, y: bbox.y + bbox.height },
      { x: bbox.x, y: bbox.y + bbox.height },
    ];

    const transformedCorners = corners.map((corner) => this.transformPoint(corner, transform));

    // Find bounding box of transformed corners
    const xs = transformedCorners.map((c) => c.x);
    const ys = transformedCorners.map((c) => c.y);

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Calculate overall bounding box for entire SVG tree
   */
  calculateOverallBoundingBox(element: SVGElement): BoundingBox {
    const boxes: BoundingBox[] = [];

    // Add this element's bounding box if it has one
    if (element.boundingBox) {
      boxes.push(this.calculateTransformedBoundingBox(element.boundingBox, element.transform));
    }

    // Add children's bounding boxes
    for (const child of element.children) {
      boxes.push(this.calculateOverallBoundingBox(child));
    }

    if (boxes.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    // Find bounding box of all boxes
    const minX = Math.min(...boxes.map((b) => b.x));
    const minY = Math.min(...boxes.map((b) => b.y));
    const maxX = Math.max(...boxes.map((b) => b.x + b.width));
    const maxY = Math.max(...boxes.map((b) => b.y + b.height));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Flatten SVG by applying all transforms and removing groups
   * Returns simplified SVG string
   */
  async flattenSVG(svgContent: string): Promise<string> {
    const root = await this.parseSVG(svgContent);
    const bbox = this.calculateOverallBoundingBox(root);

    // Start building flattened SVG
    let output = `<svg xmlns="http://www.w3.org/2000/svg" width="${bbox.width}" height="${bbox.height}" viewBox="${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}">`;

    // Recursively flatten elements
    const flattenElement = (element: SVGElement) => {
      // Skip SVG and group elements
      if (element.type === 'svg' || element.type === 'g') {
        element.children.forEach(flattenElement);
        return;
      }

      // Apply transform to element
      const [a, b, c, d, e, f] = element.transform.matrix;
      const transformStr = `matrix(${a},${b},${c},${d},${e},${f})`;

      // Build element with transform
      const attrs = Object.entries(element.attributes)
        .filter(([key]) => key !== 'transform')
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');

      output += `<${element.type} ${attrs} transform="${transformStr}"/>`;
    };

    root.children.forEach(flattenElement);
    output += '</svg>';

    return output;
  }
}

export const svgTransformParserService = new SVGTransformParserService();

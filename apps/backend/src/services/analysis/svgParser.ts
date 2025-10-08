/*
 * SVG Parser Service
 * Extracts structural information, bounding boxes, and metadata from SVG files
 * Option 1: sax parser (pros: streaming, low memory; cons: manual state management)
 * Option 2: DOMParser (pros: easier API; cons: requires jsdom, heavier)
 * Chosen: sax for performance and Bun compatibility
 */

// Note: sax parser kept as a potential future optimization; unused for now

export interface SVGBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SVGElement {
  type: string;
  attributes: Record<string, string>;
  children: SVGElement[];
}

export interface SVGAnalysisResult {
  width?: number;
  height?: number;
  viewBox?: SVGBoundingBox;
  boundingBox: SVGBoundingBox;
  elements: {
    paths: number;
    circles: number;
    rects: number;
    polygons: number;
    text: number;
    groups: number;
  };
  hasText: boolean;
  colorPalette: string[];
}

export class SVGParserService {
  /**
   * Parse SVG and extract comprehensive metadata
   */
  async parseSVG(svgBuffer: Buffer): Promise<SVGAnalysisResult> {
    const svgContent = svgBuffer.toString('utf-8');

    // Extract root attributes
    const rootAttributes = this.extractRootAttributes(svgContent);
    const viewBox = this.parseViewBox(rootAttributes.viewBox);
    const width = this.parseSize(rootAttributes.width);
    const height = this.parseSize(rootAttributes.height);

    // Calculate bounding box
    const boundingBox = this.calculateBoundingBox(viewBox, width, height);

    // Extract elements and colors
    const elements = this.extractElements(svgContent);
    const colors = this.extractColors(svgContent);

    return {
      width,
      height,
      viewBox,
      boundingBox,
      elements,
      hasText: elements.text > 0,
      colorPalette: colors,
    };
  }

  /**
   * Extract root SVG element attributes
   */
  private extractRootAttributes(svgContent: string): Record<string, string> {
    const attributes: Record<string, string> = {};

    // Match opening svg tag and its attributes
    const svgTagMatch = svgContent.match(/<svg[^>]*>/);
    if (!svgTagMatch) {
      return attributes;
    }

    const svgTag = svgTagMatch[0];

    // Extract individual attributes
    const attrRegex = /(\w+)\s*=\s*["']([^"']*)["']/g;
    let match;

    while ((match = attrRegex.exec(svgTag)) !== null) {
      attributes[match[1]] = match[2];
    }

    return attributes;
  }

  /**
   * Parse viewBox attribute into bounding box
   */
  private parseViewBox(viewBox?: string): SVGBoundingBox | undefined {
    if (!viewBox) return undefined;

    const parts = viewBox.trim().split(/\s+/);
    if (parts.length !== 4) return undefined;

    return {
      x: parseFloat(parts[0]),
      y: parseFloat(parts[1]),
      width: parseFloat(parts[2]),
      height: parseFloat(parts[3]),
    };
  }

  /**
   * Parse size attribute (removes units like px, pt, etc.)
   */
  private parseSize(size?: string): number | undefined {
    if (!size) return undefined;

    // Remove units and parse number
    const match = size.match(/^(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : undefined;
  }

  /**
   * Calculate effective bounding box from available dimensions
   */
  private calculateBoundingBox(
    viewBox?: SVGBoundingBox,
    width?: number,
    height?: number,
  ): SVGBoundingBox {
    // Priority: viewBox > width/height > default
    if (viewBox) {
      return viewBox;
    }

    if (width && height) {
      return { x: 0, y: 0, width, height };
    }

    // Default fallback
    return { x: 0, y: 0, width: 100, height: 100 };
  }

  /**
   * Extract and count SVG elements
   */
  private extractElements(svgContent: string) {
    const elements = {
      paths: 0,
      circles: 0,
      rects: 0,
      polygons: 0,
      text: 0,
      groups: 0,
    };

    // Count paths
    elements.paths = (svgContent.match(/<path/g) || []).length;

    // Count circles
    elements.circles = (svgContent.match(/<circle/g) || []).length;

    // Count rectangles
    elements.rects = (svgContent.match(/<rect/g) || []).length;

    // Count polygons and polylines
    elements.polygons =
      (svgContent.match(/<polygon/g) || []).length + (svgContent.match(/<polyline/g) || []).length;

    // Count text elements
    elements.text = (svgContent.match(/<text/g) || []).length;

    // Count groups
    elements.groups = (svgContent.match(/<g/g) || []).length;

    return elements;
  }

  /**
   * Extract color palette from SVG
   * Looks for fill, stroke attributes and style properties
   */
  private extractColors(svgContent: string): string[] {
    const colors = new Set<string>();

    // Extract fill colors
    const fillRegex = /fill\s*[:=]\s*["']?([^"'\s;>]+)["']?/g;
    let match;

    while ((match = fillRegex.exec(svgContent)) !== null) {
      const color = match[1];
      if (this.isValidColor(color)) {
        colors.add(color.toLowerCase());
      }
    }

    // Extract stroke colors
    const strokeRegex = /stroke\s*[:=]\s*["']?([^"'\s;>]+)["']?/g;
    while ((match = strokeRegex.exec(svgContent)) !== null) {
      const color = match[1];
      if (this.isValidColor(color)) {
        colors.add(color.toLowerCase());
      }
    }

    // Remove common non-colors
    colors.delete('none');
    colors.delete('transparent');
    colors.delete('currentcolor');

    return Array.from(colors).slice(0, 10); // Limit to 10 colors
  }

  /**
   * Check if string is a valid color value
   */
  private isValidColor(color: string): boolean {
    if (!color || color === 'none' || color === 'transparent') {
      return false;
    }

    // Check for hex colors
    if (/^#[0-9a-f]{3,8}$/i.test(color)) {
      return true;
    }

    // Check for rgb/rgba
    if (/^rgba?\(/i.test(color)) {
      return true;
    }

    // Check for named colors (basic check)
    if (/^[a-z]+$/i.test(color)) {
      return true;
    }

    return false;
  }

  /**
   * Calculate safe margins for logo placement
   * Returns percentage of padding needed on each side
   */
  calculateSafeMargins(boundingBox: SVGBoundingBox): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } {
    // Calculate aspect ratio
    const aspectRatio = boundingBox.width / boundingBox.height;

    // Base margin: 10% for square logos
    let baseMargin = 0.1;

    // Adjust for extreme aspect ratios
    if (aspectRatio > 2 || aspectRatio < 0.5) {
      baseMargin = 0.15; // More padding for wide/tall logos
    }

    return {
      top: baseMargin,
      right: baseMargin,
      bottom: baseMargin,
      left: baseMargin,
    };
  }
}

export const svgParserService = new SVGParserService();

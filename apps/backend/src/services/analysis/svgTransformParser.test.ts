import { test, expect, describe } from 'bun:test';
import { svgTransformParserService } from './svgTransformParser';

describe('SVGTransformParserService', () => {
  test('parseTransformAttribute - translate', () => {
    const result = svgTransformParserService.parseTransformAttribute('translate(10, 20)');
    expect(result.matrix).toEqual([1, 0, 0, 1, 10, 20]);
  });

  test('parseTransformAttribute - scale', () => {
    const result = svgTransformParserService.parseTransformAttribute('scale(2, 3)');
    expect(result.matrix).toEqual([2, 0, 0, 3, 0, 0]);
  });

  test('parseTransformAttribute - rotate', () => {
    const result = svgTransformParserService.parseTransformAttribute('rotate(90)');
    // 90 degrees rotation: cos(90)=0, sin(90)=1
    expect(result.matrix[0]).toBeCloseTo(0, 5);
    expect(result.matrix[1]).toBeCloseTo(1, 5);
    expect(result.matrix[2]).toBeCloseTo(-1, 5);
    expect(result.matrix[3]).toBeCloseTo(0, 5);
  });

  test('parseTransformAttribute - multiple transforms', () => {
    const result = svgTransformParserService.parseTransformAttribute('translate(10, 20) scale(2)');
    // Should combine both transforms
    expect(result.matrix).toBeDefined();
    expect(result.matrix.length).toBe(6);
  });

  test('parseTransformAttribute - matrix', () => {
    const result = svgTransformParserService.parseTransformAttribute('matrix(1, 0, 0, 1, 10, 20)');
    expect(result.matrix).toEqual([1, 0, 0, 1, 10, 20]);
  });

  test('parseTransformAttribute - no transform', () => {
    const result = svgTransformParserService.parseTransformAttribute();
    expect(result.matrix).toEqual([1, 0, 0, 1, 0, 0]); // Identity
  });

  test('transformPoint - translate', () => {
    const transform = { matrix: [1, 0, 0, 1, 10, 20] };
    const point = { x: 5, y: 5 };
    const result = svgTransformParserService.transformPoint(point, transform);
    expect(result.x).toBe(15);
    expect(result.y).toBe(25);
  });

  test('transformPoint - scale', () => {
    const transform = { matrix: [2, 0, 0, 2, 0, 0] };
    const point = { x: 5, y: 10 };
    const result = svgTransformParserService.transformPoint(point, transform);
    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
  });

  test('combineTransforms - combines correctly', () => {
    const parent = { matrix: [1, 0, 0, 1, 10, 0] }; // translate(10, 0)
    const child = { matrix: [2, 0, 0, 2, 0, 0] }; // scale(2)
    const result = svgTransformParserService.combineTransforms(parent, child);

    // Should apply parent then child: scale then translate
    expect(result.matrix).toBeDefined();
    expect(result.matrix.length).toBe(6);
  });

  test('calculateTransformedBoundingBox - identity', () => {
    const bbox = { x: 0, y: 0, width: 100, height: 100 };
    const transform = { matrix: [1, 0, 0, 1, 0, 0] }; // Identity
    const result = svgTransformParserService.calculateTransformedBoundingBox(bbox, transform);

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
  });

  test('calculateTransformedBoundingBox - translate', () => {
    const bbox = { x: 0, y: 0, width: 100, height: 100 };
    const transform = { matrix: [1, 0, 0, 1, 50, 50] }; // translate(50, 50)
    const result = svgTransformParserService.calculateTransformedBoundingBox(bbox, transform);

    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
  });

  test('calculateTransformedBoundingBox - scale', () => {
    const bbox = { x: 0, y: 0, width: 100, height: 100 };
    const transform = { matrix: [2, 0, 0, 2, 0, 0] }; // scale(2)
    const result = svgTransformParserService.calculateTransformedBoundingBox(bbox, transform);

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
  });

  test('parseSVG - simple rect', async () => {
    const svg = '<svg><rect x="10" y="20" width="100" height="50"/></svg>';
    const result = await svgTransformParserService.parseSVG(svg);

    expect(result.type).toBe('svg');
    expect(result.children.length).toBe(1);
    expect(result.children[0].type).toBe('rect');
    expect(result.children[0].boundingBox).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  test('parseSVG - rect with transform', async () => {
    const svg =
      '<svg><rect x="0" y="0" width="100" height="100" transform="translate(10, 20)"/></svg>';
    const result = await svgTransformParserService.parseSVG(svg);

    expect(result.children[0].transform.matrix).toEqual([1, 0, 0, 1, 10, 20]);
  });

  test('parseSVG - nested groups', async () => {
    const svg = `
      <svg>
        <g transform="translate(10, 0)">
          <rect x="0" y="0" width="50" height="50"/>
        </g>
      </svg>
    `;
    const result = await svgTransformParserService.parseSVG(svg);

    expect(result.children.length).toBe(1);
    expect(result.children[0].type).toBe('g');
    expect(result.children[0].children.length).toBe(1);

    // Child should inherit parent transform
    const rect = result.children[0].children[0];
    expect(rect.transform.matrix).toEqual([1, 0, 0, 1, 10, 0]);
  });

  test('parseSVG - circle', async () => {
    const svg = '<svg><circle cx="50" cy="50" r="25"/></svg>';
    const result = await svgTransformParserService.parseSVG(svg);

    expect(result.children[0].type).toBe('circle');
    expect(result.children[0].boundingBox).toEqual({ x: 25, y: 25, width: 50, height: 50 });
  });

  test('calculateOverallBoundingBox - single element', async () => {
    const svg = '<svg width="200" height="200"><rect x="10" y="20" width="100" height="50"/></svg>';
    const root = await svgTransformParserService.parseSVG(svg);
    const bbox = svgTransformParserService.calculateOverallBoundingBox(root);

    // Bounding box should encompass both SVG root and child rect
    expect(bbox.x).toBe(0); // SVG root starts at 0
    expect(bbox.y).toBe(0);
    expect(bbox.width).toBeGreaterThanOrEqual(100);
    expect(bbox.height).toBeGreaterThanOrEqual(50);
  });

  test('calculateOverallBoundingBox - multiple elements', async () => {
    const svg = `
      <svg>
        <rect x="0" y="0" width="50" height="50"/>
        <rect x="100" y="100" width="50" height="50"/>
      </svg>
    `;
    const root = await svgTransformParserService.parseSVG(svg);
    const bbox = svgTransformParserService.calculateOverallBoundingBox(root);

    expect(bbox.x).toBe(0);
    expect(bbox.y).toBe(0);
    expect(bbox.width).toBe(150);
    expect(bbox.height).toBe(150);
  });

  test('flattenSVG - simple case', async () => {
    const svg = '<svg><rect x="0" y="0" width="100" height="100"/></svg>';
    const flattened = await svgTransformParserService.flattenSVG(svg);

    expect(flattened).toContain('<svg');
    expect(flattened).toContain('rect');
    expect(flattened).toContain('</svg>');
  });

  test('flattenSVG - with groups', async () => {
    const svg = `
      <svg>
        <g transform="translate(10, 20)">
          <rect x="0" y="0" width="100" height="100"/>
        </g>
      </svg>
    `;
    const flattened = await svgTransformParserService.flattenSVG(svg);

    // Should not contain <g> tags
    expect(flattened).not.toContain('<g');
    // Should contain rect with transform
    expect(flattened).toContain('rect');
    expect(flattened).toContain('transform');
  });
});

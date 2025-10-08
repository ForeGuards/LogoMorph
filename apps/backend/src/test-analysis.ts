/*
 * Test Script for Logo Analysis
 * Run with: bun run src/test-analysis.ts
 */

import { svgParserService } from './services/analysis/svgParser';
import { logoAnalyzerService } from './services/analysis/logoAnalyzer';

// Sample SVG for testing
const sampleSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="50" y="50" width="100" height="100" fill="#ff0000" stroke="#000000" stroke-width="2"/>
  <circle cx="100" cy="100" r="30" fill="#00ff00"/>
  <text x="100" y="180" text-anchor="middle" fill="#0000ff">Logo</text>
</svg>`;

async function testSVGAnalysis() {
  console.log('=== Testing SVG Analysis ===\n');

  try {
    const buffer = Buffer.from(sampleSVG, 'utf-8');
    const result = await svgParserService.parseSVG(buffer);

    console.log('SVG Analysis Result:');
    console.log('- Width:', result.width);
    console.log('- Height:', result.height);
    console.log('- ViewBox:', result.viewBox);
    console.log('- Bounding Box:', result.boundingBox);
    console.log('- Elements:', result.elements);
    console.log('- Has Text:', result.hasText);
    console.log('- Color Palette:', result.colorPalette);

    const margins = svgParserService.calculateSafeMargins(result.boundingBox);
    console.log('- Safe Margins:', margins);

    console.log('\n✅ SVG analysis successful!\n');
  } catch (error) {
    console.error('❌ SVG analysis failed:', error);
  }
}

async function testUnifiedAnalyzer() {
  console.log('=== Testing Unified Logo Analyzer ===\n');

  try {
    const buffer = Buffer.from(sampleSVG, 'utf-8');
    const result = await logoAnalyzerService.analyzeLogo(buffer, 'image/svg+xml');

    console.log('Unified Analysis Result:');
    console.log('- Format:', result.format);
    console.log('- Width:', result.width);
    console.log('- Height:', result.height);
    console.log('- Aspect Ratio:', result.aspectRatio);
    console.log('- Bounding Box:', result.boundingBox);
    console.log('- Safe Margins:', result.safeMargins);
    console.log('- Color Palette:', result.colorPalette);
    console.log('- Has Text:', result.hasText);
    console.log('- SVG Data:', result.svgData);

    // Test optimal dimensions calculation
    const dimensions = logoAnalyzerService.calculateOptimalDimensions(result, 1600, 400);

    console.log('\nOptimal Dimensions for 1600×400 target:');
    console.log('- Logo Width:', dimensions.logoWidth);
    console.log('- Logo Height:', dimensions.logoHeight);
    console.log('- Offset X:', dimensions.offsetX);
    console.log('- Offset Y:', dimensions.offsetY);
    console.log('- Scale:', dimensions.scale);

    console.log('\n✅ Unified analyzer successful!\n');
  } catch (error) {
    console.error('❌ Unified analyzer failed:', error);
  }
}

async function main() {
  console.log('\n🧪 Logo Analysis Test Suite\n');
  console.log('='.repeat(50) + '\n');

  await testSVGAnalysis();
  await testUnifiedAnalyzer();

  console.log('='.repeat(50));
  console.log('\n✨ All tests completed!\n');
}

main();

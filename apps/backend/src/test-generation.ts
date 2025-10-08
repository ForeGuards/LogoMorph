/*
 * Test Script for Layout Engine and Background Generator
 * Run with: bun run src/test-generation.ts
 */

import { layoutEngineService } from './services/generation/layoutEngine';
import { backgroundGeneratorService } from './services/generation/backgroundGenerator';
import { logoAnalyzerService } from './services/analysis/logoAnalyzer';

// Sample SVG for testing
const sampleSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="50" y="50" width="100" height="100" fill="#ff0000" stroke="#000000" stroke-width="2"/>
  <circle cx="100" cy="100" r="30" fill="#00ff00"/>
</svg>`;

async function testLayoutEngine() {
  console.log('=== Testing Layout Engine ===\n');

  try {
    const buffer = Buffer.from(sampleSVG, 'utf-8');
    const analysis = await logoAnalyzerService.analyzeLogo(buffer, 'image/svg+xml');

    // Test 1: Center alignment
    const centerLayout = layoutEngineService.calculateLayout(analysis, 1600, 400, {
      alignment: 'center',
    });

    console.log('Layout for 1600×400 (center):');
    console.log('- Canvas:', centerLayout.canvasWidth, 'x', centerLayout.canvasHeight);
    console.log('- Logo position:', centerLayout.logoX, ',', centerLayout.logoY);
    console.log('- Logo size:', centerLayout.logoWidth, 'x', centerLayout.logoHeight);
    console.log('- Scale:', centerLayout.logoScale);
    console.log('- Usable area:', centerLayout.usableWidth, 'x', centerLayout.usableHeight);

    // Test 2: Top-left alignment
    const topLeftLayout = layoutEngineService.calculateLayout(analysis, 1200, 1200, {
      alignment: 'top-left',
    });

    console.log('\nLayout for 1200×1200 (top-left):');
    console.log('- Logo position:', topLeftLayout.logoX, ',', topLeftLayout.logoY);
    console.log('- Logo size:', topLeftLayout.logoWidth, 'x', topLeftLayout.logoHeight);

    // Test 3: Custom margins
    const customLayout = layoutEngineService.calculateLayout(analysis, 1024, 1024, {
      alignment: 'center',
      customMargins: { top: 0.2, right: 0.2, bottom: 0.2, left: 0.2 },
    });

    console.log('\nLayout for 1024×1024 (custom margins 20%):');
    console.log('- Usable area:', customLayout.usableWidth, 'x', customLayout.usableHeight);
    console.log('- Logo size:', customLayout.logoWidth, 'x', customLayout.logoHeight);

    console.log('\n✅ Layout engine tests successful!\n');
  } catch (error) {
    console.error('❌ Layout engine tests failed:', error);
  }
}

async function testBackgroundGenerator() {
  console.log('=== Testing Background Generator ===\n');

  try {
    // Test 1: Solid color
    const solidBg = await backgroundGeneratorService.generateBackground(800, 600, {
      type: 'solid',
      color: '#3498db',
    });
    console.log('✓ Generated solid background:', solidBg.length, 'bytes');

    // Test 2: Linear gradient
    const linearGradient = await backgroundGeneratorService.generateBackground(800, 600, {
      type: 'linear-gradient',
      startColor: '#ff6b6b',
      endColor: '#4ecdc4',
      angle: 45,
    });
    console.log('✓ Generated linear gradient:', linearGradient.length, 'bytes');

    // Test 3: Radial gradient
    const radialGradient = await backgroundGeneratorService.generateBackground(800, 600, {
      type: 'radial-gradient',
      centerColor: '#ffd93d',
      edgeColor: '#6bcf7f',
      centerX: 0.5,
      centerY: 0.5,
    });
    console.log('✓ Generated radial gradient:', radialGradient.length, 'bytes');

    // Test 4: Dots pattern
    const dotsPattern = await backgroundGeneratorService.generateBackground(800, 600, {
      type: 'pattern',
      patternType: 'dots',
      foregroundColor: '#2c3e50',
      backgroundColor: '#ecf0f1',
      scale: 1.5,
    });
    console.log('✓ Generated dots pattern:', dotsPattern.length, 'bytes');

    // Test 5: Grid pattern
    const gridPattern = await backgroundGeneratorService.generateBackground(800, 600, {
      type: 'pattern',
      patternType: 'grid',
      foregroundColor: '#95a5a6',
      backgroundColor: '#ffffff',
    });
    console.log('✓ Generated grid pattern:', gridPattern.length, 'bytes');

    // Test 6: Diagonal lines pattern
    const diagonalPattern = await backgroundGeneratorService.generateBackground(800, 600, {
      type: 'pattern',
      patternType: 'diagonal-lines',
      foregroundColor: '#e74c3c',
      backgroundColor: '#f9e79f',
    });
    console.log('✓ Generated diagonal lines pattern:', diagonalPattern.length, 'bytes');

    // Test 7: Checkerboard pattern
    const checkerPattern = await backgroundGeneratorService.generateBackground(800, 600, {
      type: 'pattern',
      patternType: 'checkerboard',
      foregroundColor: '#34495e',
      backgroundColor: '#ecf0f1',
    });
    console.log('✓ Generated checkerboard pattern:', checkerPattern.length, 'bytes');

    // Test 8: From palette
    const paletteColors = ['#e74c3c', '#3498db', '#2ecc71'];
    const paletteBg = await backgroundGeneratorService.generateFromPalette(
      800,
      600,
      paletteColors,
      'gradient',
    );
    console.log('✓ Generated background from palette:', paletteBg.length, 'bytes');

    console.log('\n✅ Background generator tests successful!\n');
  } catch (error) {
    console.error('❌ Background generator tests failed:', error);
  }
}

async function testIntegration() {
  console.log('=== Testing Integration ===\n');

  try {
    const buffer = Buffer.from(sampleSVG, 'utf-8');
    const analysis = await logoAnalyzerService.analyzeLogo(buffer, 'image/svg+xml');

    // Calculate layout
    const layout = layoutEngineService.calculateLayout(analysis, 1600, 400);

    // Generate background based on logo colors
    const background = await backgroundGeneratorService.generateFromPalette(
      layout.canvasWidth,
      layout.canvasHeight,
      analysis.colorPalette,
      'gradient',
    );

    console.log('Integration test:');
    console.log('- Analyzed logo:', analysis.width, 'x', analysis.height);
    console.log('- Color palette:', analysis.colorPalette);
    console.log('- Target size:', layout.canvasWidth, 'x', layout.canvasHeight);
    console.log('- Logo placement:', layout.logoX, ',', layout.logoY);
    console.log('- Logo size:', layout.logoWidth, 'x', layout.logoHeight);
    console.log('- Background size:', background.length, 'bytes');

    console.log('\n✅ Integration test successful!\n');
  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

async function main() {
  console.log('\n🧪 Generation Services Test Suite\n');
  console.log('='.repeat(50) + '\n');

  await testLayoutEngine();
  await testBackgroundGenerator();
  await testIntegration();

  console.log('='.repeat(50));
  console.log('\n✨ All tests completed!\n');
}

main();

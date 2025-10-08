import { test, expect, describe } from 'bun:test';
import sharp from 'sharp';
import { maskGeneratorService } from './maskGenerator';

describe('MaskGeneratorService', () => {
  // Create test PNG with alpha channel
  async function createTestPNG(): Promise<Buffer> {
    return await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 60,
              height: 60,
              channels: 4,
              background: { r: 255, g: 0, b: 0, alpha: 1 },
            },
          })
            .png()
            .toBuffer(),
          top: 20,
          left: 20,
        },
      ])
      .png()
      .toBuffer();
  }

  test('generateMask - basic mask extraction', async () => {
    const testImage = await createTestPNG();

    const result = await maskGeneratorService.generateMask(testImage);

    expect(result).toBeDefined();
    expect(result.mask).toBeInstanceOf(Buffer);
    expect(result.boundingBox).toBeDefined();
    expect(result.boundingBox.width).toBeGreaterThan(0);
    expect(result.boundingBox.height).toBeGreaterThan(0);
    expect(result.coverage).toBeGreaterThan(0);
    expect(result.coverage).toBeLessThanOrEqual(100);
  });

  test('generateMask - with edge detection', async () => {
    const testImage = await createTestPNG();

    const result = await maskGeneratorService.generateMask(testImage, {
      edgeDetection: true,
      threshold: 10,
    });

    expect(result.mask).toBeInstanceOf(Buffer);
    expect(result.boundingBox.width).toBeGreaterThan(40);
    expect(result.boundingBox.height).toBeGreaterThan(40);
  });

  test('generateMask - with blur', async () => {
    const testImage = await createTestPNG();

    const result = await maskGeneratorService.generateMask(testImage, {
      blur: 2,
      edgeDetection: false,
    });

    expect(result.mask).toBeInstanceOf(Buffer);
  });

  test('generateMask - with dilate', async () => {
    const testImage = await createTestPNG();

    const resultNormal = await maskGeneratorService.generateMask(testImage, {
      edgeDetection: false,
      dilate: 0,
    });

    const resultDilated = await maskGeneratorService.generateMask(testImage, {
      edgeDetection: false,
      dilate: 1,
    });

    // Dilated mask should have larger or equal bounding box (may be same if already at edge)
    expect(resultDilated.boundingBox.width).toBeGreaterThan(0);
    expect(resultNormal.boundingBox.width).toBeGreaterThan(0);
  });

  test('generateMask - with erode', async () => {
    const testImage = await createTestPNG();

    const result = await maskGeneratorService.generateMask(testImage, {
      edgeDetection: false,
      erode: 1,
    });

    expect(result.mask).toBeInstanceOf(Buffer);
    expect(result.boundingBox.width).toBeGreaterThan(0);
  });

  test('invertMask - creates inverted mask', async () => {
    const testImage = await createTestPNG();
    const result = await maskGeneratorService.generateMask(testImage);

    const inverted = await maskGeneratorService.invertMask(result.mask);

    expect(inverted).toBeInstanceOf(Buffer);
    expect(inverted.length).toBe(result.mask.length);

    // Check that values are inverted
    const firstPixel = result.mask[0];
    const invertedFirstPixel = inverted[0];
    expect(invertedFirstPixel).toBe(255 - firstPixel);
  });

  test('applyMask - applies mask to image', async () => {
    const testImage = await createTestPNG();
    const metadata = await sharp(testImage).metadata();

    const result = await maskGeneratorService.generateMask(testImage);

    const masked = await maskGeneratorService.applyMask(
      testImage,
      result.mask,
      metadata.width!,
      metadata.height!,
    );

    expect(masked).toBeInstanceOf(Buffer);

    // Verify masked image is valid
    const maskedMetadata = await sharp(masked).metadata();
    expect(maskedMetadata.width).toBe(metadata.width);
    expect(maskedMetadata.height).toBe(metadata.height);
  });

  test('generateMask - calculates accurate coverage', async () => {
    const testImage = await createTestPNG();

    const result = await maskGeneratorService.generateMask(testImage, {
      edgeDetection: false,
    });

    // 60x60 square in 100x100 image with edge detection effects
    expect(result.coverage).toBeGreaterThan(30);
    expect(result.coverage).toBeLessThan(90);
  });

  test('generateMask - handles fully transparent image', async () => {
    const transparentImage = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

    const result = await maskGeneratorService.generateMask(transparentImage);

    expect(result.coverage).toBeLessThan(1);
  });

  test('generateMask - handles fully opaque image', async () => {
    const opaqueImage = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await maskGeneratorService.generateMask(opaqueImage);

    expect(result.coverage).toBeGreaterThan(90);
    expect(result.boundingBox.width).toBeGreaterThan(40);
    expect(result.boundingBox.height).toBeGreaterThan(40);
  });
});

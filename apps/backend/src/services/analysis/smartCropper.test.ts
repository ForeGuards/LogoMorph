import { test, expect, describe } from 'bun:test';
import sharp from 'sharp';
import { smartCropperService } from './smartCropper';

describe('SmartCropperService', () => {
  // Create test image with content in specific region
  async function createTestImage(
    width: number,
    height: number,
    contentRegion?: { x: number; y: number; width: number; height: number },
  ): Promise<Buffer> {
    const base = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    });

    if (contentRegion) {
      // Add colored content in specified region
      const content = await sharp({
        create: {
          width: contentRegion.width,
          height: contentRegion.height,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      return await base
        .composite([
          {
            input: content,
            top: contentRegion.y,
            left: contentRegion.x,
          },
        ])
        .png()
        .toBuffer();
    }

    return await base.png().toBuffer();
  }

  test('smartCrop - center mode', async () => {
    const testImage = await createTestImage(400, 300);

    const result = await smartCropperService.smartCrop(testImage, {
      targetWidth: 200,
      targetHeight: 200,
      mode: 'center',
    });

    expect(result.buffer).toBeInstanceOf(Buffer);

    // Verify output dimensions
    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.width).toBe(200);
    expect(metadata.height).toBe(200);
  });

  test('smartCrop - already target size', async () => {
    const testImage = await createTestImage(200, 200);

    const result = await smartCropperService.smartCrop(testImage, {
      targetWidth: 200,
      targetHeight: 200,
    });

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
  });

  test('smartCrop - smart mode with centered content', async () => {
    const testImage = await createTestImage(400, 400, {
      x: 150,
      y: 150,
      width: 100,
      height: 100,
    });

    const result = await smartCropperService.smartCrop(testImage, {
      targetWidth: 200,
      targetHeight: 200,
      mode: 'smart',
    });

    expect(result.buffer).toBeInstanceOf(Buffer);

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.width).toBe(200);
    expect(metadata.height).toBe(200);
  });

  test('smartCrop - smart mode with off-center content', async () => {
    const testImage = await createTestImage(400, 400, {
      x: 50,
      y: 50,
      width: 100,
      height: 100,
    });

    const result = await smartCropperService.smartCrop(testImage, {
      targetWidth: 200,
      targetHeight: 200,
      mode: 'smart',
    });

    expect(result.buffer).toBeInstanceOf(Buffer);

    // Crop should be positioned to include the content
    expect(result.x).toBeLessThanOrEqual(50);
    expect(result.y).toBeLessThanOrEqual(50);
  });

  test('smartCrop - with padding', async () => {
    const testImage = await createTestImage(400, 400, {
      x: 150,
      y: 150,
      width: 100,
      height: 100,
    });

    const result = await smartCropperService.smartCrop(testImage, {
      targetWidth: 300,
      targetHeight: 300,
      mode: 'smart',
      padding: 20,
    });

    expect(result.buffer).toBeInstanceOf(Buffer);

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.width).toBe(300);
    expect(metadata.height).toBe(300);
  });

  test('smartCrop - attention mode', async () => {
    const testImage = await createTestImage(400, 400, {
      x: 250,
      y: 250,
      width: 100,
      height: 100,
    });

    const result = await smartCropperService.smartCrop(testImage, {
      targetWidth: 200,
      targetHeight: 200,
      mode: 'attention',
    });

    expect(result.buffer).toBeInstanceOf(Buffer);

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.width).toBe(200);
    expect(metadata.height).toBe(200);
  });

  test('smartCrop - landscape to square', async () => {
    const testImage = await createTestImage(800, 400);

    const result = await smartCropperService.smartCrop(testImage, {
      targetWidth: 400,
      targetHeight: 400,
      mode: 'center',
    });

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.width).toBe(400); // Should crop width
    expect(result.height).toBe(400);

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.width).toBe(400);
    expect(metadata.height).toBe(400);
  });

  test('smartCrop - portrait to square', async () => {
    const testImage = await createTestImage(400, 800);

    const result = await smartCropperService.smartCrop(testImage, {
      targetWidth: 400,
      targetHeight: 400,
      mode: 'center',
    });

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.width).toBe(400);
    expect(result.height).toBe(400); // Should crop height

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.width).toBe(400);
    expect(metadata.height).toBe(400);
  });

  test('smartCrop - preserves aspect ratio', async () => {
    const testImage = await createTestImage(1600, 900);

    const result = await smartCropperService.smartCrop(testImage, {
      targetWidth: 1920,
      targetHeight: 1080,
      mode: 'center',
    });

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.width).toBe(1920);
    expect(metadata.height).toBe(1080);

    // Verify aspect ratio
    const aspectRatio = metadata.width! / metadata.height!;
    expect(aspectRatio).toBeCloseTo(16 / 9, 2);
  });

  test('smartCrop - handles small images', async () => {
    const testImage = await createTestImage(100, 100);

    const result = await smartCropperService.smartCrop(testImage, {
      targetWidth: 50,
      targetHeight: 50,
      mode: 'center',
    });

    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.width).toBe(50);
    expect(metadata.height).toBe(50);
  });
});

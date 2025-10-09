/*
 * Variants Worker
 * Processes logo variant generation jobs from the queue
 * This runs as a separate process for better scalability
 */

import { Worker, Job } from 'bullmq';
import { redisConfig } from '../config/redis';
import { GenerateVariantsJobData } from '../services/jobs/queueService';
import { getPresetByName } from '../config/presets';
import { layoutEngineService } from '../services/generation/layoutEngine';
import {
  backgroundGeneratorService,
  BackgroundType,
} from '../services/generation/backgroundGenerator';
import { fileStorageService } from '../services/storage/fileStorage';
import { imageCompositorService } from '../services/generation/imageCompositor';

// TODO: Replace with Supabase client
// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

class VariantsWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker<GenerateVariantsJobData>(
      'logo-variants',
      async (job) => this.processJob(job),
      {
        connection: redisConfig.connection,
        concurrency: 2, // Process 2 jobs simultaneously
      },
    );

    this.worker.on('completed', (job) => {
      console.log(`✓ Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`✗ Job ${job?.id} failed:`, err.message);
    });

    console.log('Variants worker started and ready to process jobs');
  }

  /**
   * Process a variant generation job
   */
  private async processJob(job: Job<GenerateVariantsJobData>) {
    const { userId, logoId, presets, backgroundType, backgroundColor } = job.data;

    console.log(`Processing job ${job.id} for logo ${logoId}`);

    try {
      // Step 1: Fetch logo from Convex
      const logo = await convex.query(api.logos.getLogo, { logoId: logoId as Id<'logos'> });

      if (!logo) {
        throw new Error(`Logo not found: ${logoId}`);
      }

      console.log(`  - Logo fetched: ${logo.filename} (${logo.format})`);

      // Step 2: Download logo file from storage
      const logoBuffer = await fileStorageService.downloadFile(logo.storagePath);

      if (!logoBuffer) {
        throw new Error(`Failed to download logo from storage: ${logo.storagePath}`);
      }

      // Extract logo metadata
      const logoMetadata = logo.metadata;
      const logoColors = logoMetadata.colorPalette || ['#000000'];

      const totalPresets = presets.length;
      const variants: Array<{
        presetName: string;
        width: number;
        height: number;
        format: string;
        size: number;
        storagePath: string;
        storageUrl: string;
        status: 'completed';
      }> = [];

      // Process each preset
      for (let i = 0; i < presets.length; i++) {
        const presetName = presets[i];
        const preset = getPresetByName(presetName);

        if (!preset) {
          console.warn(`Preset not found: ${presetName}`);
          continue;
        }

        // Update progress
        await job.updateProgress({
          completed: i,
          total: totalPresets,
          currentPreset: presetName,
        });

        console.log(
          `  - Generating variant for preset: ${presetName} (${preset.width}×${preset.height})`,
        );

        // Step 3: Calculate layout
        const layout = layoutEngineService.calculateLayout({
          logoWidth: logoMetadata.width || preset.width,
          logoHeight: logoMetadata.height || preset.height,
          canvasWidth: preset.width,
          canvasHeight: preset.height,
          alignment: preset.defaults?.alignment || 'center',
          fillMode: preset.defaults?.fillMode || 'contain',
          customMargin: preset.defaults?.margin,
        });

        // Step 4: Generate background
        const bgType = (backgroundType ||
          preset.defaults?.background?.type ||
          'solid') as BackgroundType;
        const bgColor = backgroundColor || logoColors[0];

        const background = await backgroundGeneratorService.generateBackground({
          type: bgType,
          width: preset.width,
          height: preset.height,
          colors: [bgColor],
        });

        // Step 5: Composite logo onto background
        const composite = await imageCompositorService.composite({
          background,
          logo: logoBuffer,
          layout,
          logoFormat: logo.format as 'svg' | 'png',
          outputFormat: 'png',
          quality: 90,
        });

        // Step 6: Upload variant to storage
        const variantFilename = `${logo.filename.split('.')[0]}_${presetName}.png`;
        const variantPath = `variants/${userId}/${variantFilename}`;

        const uploadResult = await fileStorageService.uploadFile(
          composite.buffer,
          variantPath,
          'image/png',
        );

        console.log(`  ✓ Variant uploaded: ${uploadResult.path}`);

        // Step 7: Store variant data
        const variantData = {
          presetName,
          width: composite.width,
          height: composite.height,
          format: composite.format,
          size: composite.size,
          storagePath: uploadResult.path,
          storageUrl: uploadResult.url,
          status: 'completed',
        };

        variants.push(variantData);
      }

      // Update final progress
      await job.updateProgress({
        completed: totalPresets,
        total: totalPresets,
      });

      console.log(`✓ Generated ${variants.length} variants for logo ${logoId}`);

      // Return job result
      return {
        success: true,
        logoId,
        variants,
        generatedAt: Date.now(),
      };
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Gracefully close the worker
   */
  async close() {
    await this.worker.close();
    console.log('Variants worker closed');
  }
}

// Create and export worker instance
export const variantsWorker = new VariantsWorker();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing worker...');
  await variantsWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing worker...');
  await variantsWorker.close();
  process.exit(0);
});

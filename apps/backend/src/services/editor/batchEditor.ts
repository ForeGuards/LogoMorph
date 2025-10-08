/**
 * Batch Editor Service
 * Apply edits to multiple logos simultaneously with progress tracking
 *
 * Option 1: Sequential processing (pros: simple, predictable; cons: slow)
 * Option 2: Parallel processing with worker threads (pros: fast; cons: resource intensive)
 * Option 3: Queue-based with BullMQ (pros: scalable, resumable; cons: complex)
 * Chosen: Option 2 with concurrency limits for balance
 */

import type { ColorReplacement } from './colorReplacer';
import type { MaskOptions } from './advancedMasking';
import Bun from 'bun';

export interface BatchOperation {
  type: 'effect' | 'colorReplace' | 'resize' | 'mask' | 'export';
  params:
    | Record<string, unknown>
    | ColorReplacement[]
    | { width: number; height: number }
    | { presetName: string }
    | { formats: Array<'png' | 'jpeg' | 'webp'> }
    | MaskOptions;
}

export interface BatchJob {
  id: string;
  userId: string;
  fileIds: string[];
  operations: BatchOperation[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  results?: BatchResult[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchResult {
  fileId: string;
  success: boolean;
  outputPath?: string;
  error?: string;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
}

export class BatchEditor {
  private jobs: Map<string, BatchJob> = new Map();
  private maxConcurrency: number = 4;

  /**
   * Create a new batch job
   */
  public createBatchJob(userId: string, fileIds: string[], operations: BatchOperation[]): string {
    const jobId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const job: BatchJob = {
      id: jobId,
      userId,
      fileIds,
      operations,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Start processing asynchronously
    this.processBatchJob(jobId).catch((error) => {
      console.error(`[BatchEditor] Job ${jobId} failed:`, error);
      this.updateJobStatus(jobId, 'failed', error.message);
    });

    return jobId;
  }

  /**
   * Get batch job status
   */
  public getJobStatus(jobId: string): BatchJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get batch job progress
   */
  public getJobProgress(jobId: string): BatchProgress | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const total = job.fileIds.length;
    const results = job.results || [];
    const completed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      total,
      completed,
      failed,
      percentage: job.progress,
    };
  }

  /**
   * Cancel a batch job
   */
  public cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    this.updateJobStatus(jobId, 'failed', 'Cancelled by user');
    return true;
  }

  /**
   * Apply operations to a single file
   */
  public async applySingleOperation(
    filePath: string,
    operations: BatchOperation[],
  ): Promise<string> {
    let currentPath = filePath;

    for (const operation of operations) {
      currentPath = await this.applyOperation(currentPath, operation);
    }

    return currentPath;
  }

  /**
   * Apply effect preset to multiple files
   */
  public async applyEffectPreset(
    fileIds: string[],
    presetName: string,
    userId: string,
  ): Promise<string> {
    const operation: BatchOperation = {
      type: 'effect',
      params: { presetName },
    };

    return this.createBatchJob(userId, fileIds, [operation]);
  }

  /**
   * Batch color replacement across multiple files
   */
  public async batchColorReplace(
    fileIds: string[],
    replacements: ColorReplacement[],
    userId: string,
  ): Promise<string> {
    const operation: BatchOperation = {
      type: 'colorReplace',
      params: { replacements },
    };

    return this.createBatchJob(userId, fileIds, [operation]);
  }

  /**
   * Batch resize operations
   */
  public async batchResize(
    fileIds: string[],
    width: number,
    height: number,
    userId: string,
  ): Promise<string> {
    const operation: BatchOperation = {
      type: 'resize',
      params: { width, height },
    };

    return this.createBatchJob(userId, fileIds, [operation]);
  }

  /**
   * Batch export in multiple formats
   */
  public async batchExport(fileIds: string[], formats: string[], userId: string): Promise<string> {
    const operation: BatchOperation = {
      type: 'export',
      params: { formats },
    };

    return this.createBatchJob(userId, fileIds, [operation]);
  }

  // Private methods

  private async processBatchJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');

    this.updateJobStatus(jobId, 'processing');

    const results: BatchResult[] = [];
    const fileIds = job.fileIds;

    // Process files in batches with concurrency limit
    for (let i = 0; i < fileIds.length; i += this.maxConcurrency) {
      const batch = fileIds.slice(i, i + this.maxConcurrency);

      const batchResults = await Promise.allSettled(
        batch.map((fileId) => this.processFile(fileId, job.operations)),
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const fileId = batch[j];

        if (result.status === 'fulfilled') {
          results.push({
            fileId,
            success: true,
            outputPath: result.value,
          });
        } else {
          results.push({
            fileId,
            success: false,
            error: result.reason.message,
          });
        }
      }

      // Update progress
      const progress = Math.round((results.length / fileIds.length) * 100);
      job.progress = progress;
      job.results = results;
      job.updatedAt = new Date();
    }

    // Mark as completed
    this.updateJobStatus(jobId, 'completed');
    job.results = results;
  }

  private async processFile(fileId: string, operations: BatchOperation[]): Promise<string> {
    // In production, fetch the file from storage
    const filePath = `/tmp/${fileId}`;

    return await this.applySingleOperation(filePath, operations);
  }

  private async applyOperation(filePath: string, operation: BatchOperation): Promise<string> {
    // Placeholder - in production, integrate with actual services
    switch (operation.type) {
      case 'effect':
        return await this.applyEffectOperation(filePath, operation.params);
      case 'colorReplace':
        return await this.applyColorReplaceOperation(filePath, operation.params);
      case 'resize':
        return await this.applyResizeOperation(filePath, operation.params);
      case 'mask':
        return await this.applyMaskOperation(filePath, operation.params);
      case 'export':
        return await this.applyExportOperation(filePath, operation.params);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private async applyEffectOperation(
    filePath: string,
    params: { presetName: string },
  ): Promise<string> {
    // Import and use EffectsLibrary
    const { EffectsLibrary } = await import('./effectsLibrary');
    const effectsLibrary = new EffectsLibrary();

    // Read file, apply effect, write output
    const content = await Bun.file(filePath).text();
    const presets = effectsLibrary.getPresets();
    const effects = presets[params.presetName];

    if (!effects) {
      throw new Error(`Preset not found: ${params.presetName}`);
    }

    const modified = effectsLibrary.applyEffects(content, effects);

    const outputPath = `${filePath}.modified.svg`;
    await Bun.write(outputPath, modified);

    return outputPath;
  }

  private async applyColorReplaceOperation(
    filePath: string,
    params: { replacements: ColorReplacement[] },
  ): Promise<string> {
    const { ColorReplacer } = await import('./colorReplacer');
    const colorReplacer = new ColorReplacer();

    const content = await Bun.file(filePath).text();
    const modified = await colorReplacer.replaceInSVG(content, params.replacements);

    const outputPath = `${filePath}.modified.svg`;
    await Bun.write(outputPath, modified);

    return outputPath;
  }

  private async applyResizeOperation(
    filePath: string,
    params: { width: number; height: number },
  ): Promise<string> {
    // Use sharp for image resizing
    const sharp = (await import('sharp')).default;

    const buffer = await sharp(filePath)
      .resize(params.width, params.height, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toBuffer();

    const outputPath = `${filePath}.resized.png`;
    await Bun.write(outputPath, buffer);

    return outputPath;
  }

  private async applyMaskOperation(filePath: string, params: MaskOptions): Promise<string> {
    const { AdvancedMasking } = await import('./advancedMasking');
    const masking = new AdvancedMasking();

    const maskBuffer = await masking.createMaskFromAlpha(filePath, params);

    const outputPath = `${filePath}.masked.png`;
    await Bun.write(outputPath, maskBuffer);

    return outputPath;
  }

  private async applyExportOperation(
    filePath: string,
    params: { formats: Array<'png' | 'jpeg' | 'webp'> },
  ): Promise<string> {
    // Export to multiple formats
    const sharp = (await import('sharp')).default;
    const image = sharp(filePath);

    const outputPaths: string[] = [];

    for (const format of params.formats) {
      const outputPath = `${filePath}.${format}`;

      switch (format) {
        case 'png':
          await image.clone().png().toFile(outputPath);
          break;
        case 'jpeg':
        case 'jpg':
          await image.clone().jpeg({ quality: 90 }).toFile(outputPath);
          break;
        case 'webp':
          await image.clone().webp({ quality: 90 }).toFile(outputPath);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      outputPaths.push(outputPath);
    }

    return outputPaths[0]; // Return first format as primary output
  }

  private updateJobStatus(jobId: string, status: BatchJob['status'], error?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = status;
    job.updatedAt = new Date();

    if (error) {
      job.error = error;
    }

    if (status === 'completed') {
      job.progress = 100;
    }
  }
}

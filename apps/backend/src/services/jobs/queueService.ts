/*
 * Job Queue Service
 * Manages job queues for asynchronous logo variant generation
 * Option 1: BullMQ (pros: Redis-based, feature-rich, reliable; cons: Redis dependency)
 * Option 2: Built-in Bun worker threads (pros: no external deps; cons: no persistence)
 * Chosen: BullMQ for reliability and job persistence
 */

import { Queue, QueueEvents } from 'bullmq';
import { redisConfig } from '../../config/redis';

export interface GenerateVariantsJobData {
  userId: string;
  logoId: string;
  presets: string[]; // Preset names
  backgroundType?: 'solid' | 'gradient' | 'pattern';
  backgroundColor?: string;
}

export interface JobProgress {
  completed: number;
  total: number;
  currentPreset?: string;
}

class JobQueueService {
  private variantsQueue: Queue<GenerateVariantsJobData>;
  private queueEvents: QueueEvents;

  constructor() {
    // Initialize queue
    this.variantsQueue = new Queue('logo-variants', {
      connection: redisConfig.connection,
      defaultJobOptions: redisConfig.defaultJobOptions,
    });

    // Initialize queue events for monitoring
    this.queueEvents = new QueueEvents('logo-variants', {
      connection: redisConfig.connection,
    });

    this.setupEventListeners();
  }

  /**
   * Add a variant generation job to the queue
   */
  async addGenerateVariantsJob(data: GenerateVariantsJobData): Promise<string> {
    const job = await this.variantsQueue.add('generate-variants', data, {
      priority: 1,
      jobId: `${data.logoId}-${Date.now()}`, // Unique job ID
    });

    return job.id!;
  }

  /**
   * Get job status and progress
   */
  async getJobStatus(jobId: string) {
    const job = await this.variantsQueue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress as JobProgress | undefined;

    return {
      id: job.id,
      state,
      progress: progress || { completed: 0, total: 0 },
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
    };
  }

  /**
   * Get all jobs for a user
   */
  async getUserJobs(userId: string) {
    const jobs = await this.variantsQueue.getJobs(['active', 'waiting', 'completed', 'failed']);

    // Filter jobs by userId
    return jobs.filter((job) => job.data.userId === userId);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.variantsQueue.getJob(jobId);
    if (!job) {
      return false;
    }

    await job.remove();
    return true;
  }

  /**
   * Setup event listeners for monitoring
   */
  private setupEventListeners() {
    this.queueEvents.on('completed', ({ jobId }) => {
      console.log(`Job ${jobId} completed`);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`Job ${jobId} failed:`, failedReason);
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      console.log(`Job ${jobId} progress:`, data);
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.variantsQueue.getWaitingCount(),
      this.variantsQueue.getActiveCount(),
      this.variantsQueue.getCompletedCount(),
      this.variantsQueue.getFailedCount(),
      this.variantsQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  /**
   * Close queue connections
   */
  async close() {
    await this.variantsQueue.close();
    await this.queueEvents.close();
  }
}

export const queueService = new JobQueueService();

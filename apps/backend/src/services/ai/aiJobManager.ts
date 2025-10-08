/*
 * AI Job Manager
 * Manages AI-intensive jobs with prioritization, cost estimation, and progress tracking
 *
 * Option 1: Extend existing queue (pros: consistent; cons: limited specialization)
 * Option 2: Separate AI queue (pros: specialized; cons: complexity)
 * Chosen: Extend existing with AI-specific metadata
 */

import { Queue, Job } from 'bullmq';
import { redisConfig } from '../../config/redis';
import { aiConfig } from '../../config/ai';

export interface AIJobMetadata {
  type: 'background-generation' | 'vision-analysis' | 'background-removal' | 'style-transfer';
  provider: 'openai' | 'replicate' | 'stable-diffusion' | 'removebg';
  estimatedCost: number;
  estimatedDuration: number; // seconds
  priority: number; // 1-10, higher = more important
  requiresGPU: boolean;
}

export interface AIJobProgress {
  stage: string;
  completed: number;
  total: number;
  currentOperation?: string;
  estimatedTimeRemaining?: number; // seconds
  costSoFar?: number;
}

export interface CostEstimate {
  min: number;
  max: number;
  average: number;
  breakdown: Record<string, number>;
}

class AIJobManager {
  private aiQueue: Queue;
  private costTracking: Map<string, number> = new Map();

  constructor() {
    this.aiQueue = new Queue('ai-jobs', {
      connection: redisConfig.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });
  }

  /**
   * Add AI job to queue with cost estimation
   */
  async addAIJob<T>(jobName: string, data: T, metadata: AIJobMetadata): Promise<Job> {
    // Check budget before adding
    if (!this.isWithinBudget(metadata.estimatedCost)) {
      throw new Error(`Job exceeds budget limits. Estimated cost: $${metadata.estimatedCost}`);
    }

    // Add job with priority
    const job = await this.aiQueue.add(
      jobName,
      {
        ...data,
        _aiMetadata: metadata,
      },
      {
        priority: this.calculateJobPriority(metadata),
        jobId: this.generateJobId(jobName),
      },
    );

    // Track cost
    this.costTracking.set(job.id!, metadata.estimatedCost);

    return job;
  }

  /**
   * Estimate cost for a batch of operations
   */
  estimateBatchCost(operations: AIJobMetadata[]): CostEstimate {
    const costs = operations.map((op) => op.estimatedCost);
    const breakdown: Record<string, number> = {};

    operations.forEach((op) => {
      const key = `${op.type}_${op.provider}`;
      breakdown[key] = (breakdown[key] || 0) + op.estimatedCost;
    });

    return {
      min: Math.min(...costs) * operations.length,
      max: Math.max(...costs) * operations.length,
      average: costs.reduce((a, b) => a + b, 0),
      breakdown,
    };
  }

  /**
   * Calculate job priority based on multiple factors
   */
  private calculateJobPriority(metadata: AIJobMetadata): number {
    let priority = metadata.priority || 5;

    // Boost priority for quick jobs
    if (metadata.estimatedDuration < 10) {
      priority += 2;
    }

    // Lower priority for expensive jobs during high usage
    if (metadata.estimatedCost > 0.05) {
      priority -= 1;
    }

    // Prioritize non-GPU jobs when GPU is busy
    if (!metadata.requiresGPU) {
      priority += 1;
    }

    return Math.max(1, Math.min(10, priority));
  }

  /**
   * Check if operation is within budget
   */
  private isWithinBudget(estimatedCost: number): boolean {
    // Check per-job limit
    if (estimatedCost > aiConfig.maxCostPerJob) {
      return false;
    }

    // Check monthly budget
    const monthlySpend = this.getMonthlySpend();
    if (monthlySpend + estimatedCost > aiConfig.monthlyBudget) {
      return false;
    }

    return true;
  }

  /**
   * Get monthly spend from tracking
   */
  private getMonthlySpend(): number {
    // In production, this would query from database
    // For now, sum from in-memory tracking
    let total = 0;
    this.costTracking.forEach((cost) => {
      total += cost;
    });
    return total;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(jobName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${jobName}_${timestamp}_${random}`;
  }

  /**
   * Estimate time remaining for job
   */
  async estimateTimeRemaining(jobId: string): Promise<number> {
    const job = await this.aiQueue.getJob(jobId);
    if (!job) return 0;

    const metadata = job.data._aiMetadata as AIJobMetadata;
    const progress = await job.progress();

    if (typeof progress === 'object' && 'completed' in progress) {
      const progressData = progress as AIJobProgress;
      const percentComplete = progressData.completed / progressData.total;

      if (percentComplete > 0) {
        const elapsed = Date.now() - (job.processedOn || job.timestamp);
        const totalEstimated = elapsed / percentComplete;
        return Math.max(0, totalEstimated - elapsed) / 1000; // Convert to seconds
      }
    }

    return metadata.estimatedDuration;
  }

  /**
   * Get cost breakdown for user/project
   */
  async getCostBreakdown(
    _userId: string,
    _period: 'day' | 'week' | 'month' = 'month',
  ): Promise<{
    total: number;
    byProvider: Record<string, number>;
    byType: Record<string, number>;
    jobs: number;
  }> {
    // In production, query from database with time filter
    // For now, return in-memory data
    const breakdown = {
      total: 0,
      byProvider: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      jobs: 0,
    };

    this.costTracking.forEach((cost) => {
      breakdown.total += cost;
      breakdown.jobs += 1;
    });

    return breakdown;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    estimatedCost: number;
  }> {
    const counts = await this.aiQueue.getJobCounts();

    // Calculate estimated cost for waiting jobs
    const waitingJobs = await this.aiQueue.getWaiting(0, 100);
    const estimatedCost = waitingJobs.reduce((total, job) => {
      const metadata = job.data._aiMetadata as AIJobMetadata;
      return total + (metadata?.estimatedCost || 0);
    }, 0);

    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      estimatedCost,
    };
  }

  /**
   * Cancel job and refund cost
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.aiQueue.getJob(jobId);
    if (!job) return false;

    await job.remove();
    this.costTracking.delete(jobId);
    return true;
  }

  /**
   * Pause queue (e.g., when approaching budget limit)
   */
  async pauseQueue(reason: string): Promise<void> {
    await this.aiQueue.pause();
    console.log(`AI queue paused: ${reason}`);
  }

  /**
   * Resume queue
   */
  async resumeQueue(): Promise<void> {
    await this.aiQueue.resume();
    console.log('AI queue resumed');
  }

  /**
   * Auto-pause if budget exceeded
   */
  async checkBudgetAndPause(): Promise<void> {
    const spend = this.getMonthlySpend();
    const remaining = aiConfig.monthlyBudget - spend;

    if (remaining <= 0) {
      await this.pauseQueue('Monthly budget exceeded');
    } else if (remaining < aiConfig.monthlyBudget * 0.1) {
      console.warn(`⚠️  AI budget warning: Only $${remaining.toFixed(2)} remaining`);
    }
  }

  /**
   * Estimate cost for specific operation types
   */
  static estimateOperationCost(
    type: AIJobMetadata['type'],
    provider: AIJobMetadata['provider'],
  ): number {
    const costMap: Record<string, Record<string, number>> = {
      'background-generation': {
        replicate: 0.015,
        'stable-diffusion': 0,
      },
      'vision-analysis': {
        openai: 0.025,
      },
      'background-removal': {
        removebg: 0.01,
      },
      'style-transfer': {
        replicate: 0.02,
      },
    };

    return costMap[type]?.[provider] || 0;
  }

  /**
   * Estimate duration for specific operations
   */
  static estimateOperationDuration(
    type: AIJobMetadata['type'],
    provider: AIJobMetadata['provider'],
  ): number {
    const durationMap: Record<string, Record<string, number>> = {
      'background-generation': {
        replicate: 20,
        'stable-diffusion': 10,
      },
      'vision-analysis': {
        openai: 5,
      },
      'background-removal': {
        removebg: 3,
      },
      'style-transfer': {
        replicate: 25,
      },
    };

    return durationMap[type]?.[provider] || 30;
  }
}

export const aiJobManager = new AIJobManager();

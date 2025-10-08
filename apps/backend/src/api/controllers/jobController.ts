/*
 * Job Controller
 * Handles job creation, status tracking, and management
 */

import { Request, Response } from 'express';
import { queueService } from '../../services/jobs/queueService';
import { DEFAULT_PRESETS } from '../../config/presets';

/**
 * Create a new variant generation job
 * POST /api/jobs/generate
 */
export async function createGenerateJob(req: Request, res: Response) {
  try {
    const { userId } = req.auth || {};
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { logoId, presets, backgroundType, backgroundColor } = req.body;

    // Validate required fields
    if (!logoId) {
      return res.status(400).json({
        success: false,
        error: 'logoId is required',
      });
    }

    // Use default presets if none provided
    const presetsToGenerate =
      presets && presets.length > 0 ? presets : DEFAULT_PRESETS.map((p) => p.name);

    // Add job to queue
    const jobId = await queueService.addGenerateVariantsJob({
      userId,
      logoId,
      presets: presetsToGenerate,
      backgroundType: backgroundType || 'gradient',
      backgroundColor: backgroundColor || '#ffffff',
    });

    return res.status(202).json({
      success: true,
      data: {
        jobId,
        message: 'Variant generation job queued',
      },
    });
  } catch (error) {
    console.error('Create job error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create job',
    });
  }
}

/**
 * Get job status
 * GET /api/jobs/:jobId
 */
export async function getJobStatus(req: Request, res: Response) {
  try {
    const { userId } = req.auth || {};
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { jobId } = req.params;

    const job = await queueService.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // Verify user owns this job
    if (job.data.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      });
    }

    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Get job status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get job status',
    });
  }
}

/**
 * Get all jobs for current user
 * GET /api/jobs
 */
export async function getUserJobs(req: Request, res: Response) {
  try {
    const { userId } = req.auth || {};
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const jobs = await queueService.getUserJobs(userId);

    return res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    console.error('Get user jobs error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get jobs',
    });
  }
}

/**
 * Cancel a job
 * DELETE /api/jobs/:jobId
 */
export async function cancelJob(req: Request, res: Response) {
  try {
    const { userId } = req.auth || {};
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { jobId } = req.params;

    // Verify user owns this job
    const job = await queueService.getJobStatus(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.data.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
      });
    }

    const cancelled = await queueService.cancelJob(jobId);

    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: 'Job not found or already completed',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Job cancelled',
    });
  } catch (error) {
    console.error('Cancel job error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel job',
    });
  }
}

/**
 * Get queue statistics (admin only, for monitoring)
 * GET /api/jobs/stats
 */
export async function getQueueStats(req: Request, res: Response) {
  try {
    const { userId } = req.auth || {};
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const stats = await queueService.getQueueStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get queue stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get queue stats',
    });
  }
}

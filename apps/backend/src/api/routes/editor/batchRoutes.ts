/**
 * Batch Editor API Routes
 * Phase 6.1: Advanced Editing Features - Batch Operations
 */

import { Router } from 'express';
import { requireAuth, getAuth } from '@clerk/express';
import { BatchEditor } from '../../../services/editor/batchEditor';

const router = Router();
const batchEditor = new BatchEditor();

const handleRouteError = (
  res: express.Response,
  label: string,
  error: unknown,
  defaultMessage: string,
) => {
  console.error(label, error);
  const message = error instanceof Error ? error.message : defaultMessage;
  return res.status(500).json({
    success: false,
    error: message,
  });
};

/**
 * @swagger
 * /api/editor/batch/create:
 *   post:
 *     summary: Create a new batch editing job
 *     tags: [Editor - Batch]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileIds
 *               - operations
 *             properties:
 *               fileIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               operations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [effect, colorReplace, resize, mask, export]
 *                     params:
 *                       type: object
 *     responses:
 *       200:
 *         description: Batch job created successfully
 */
router.post('/create', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    const { fileIds, operations } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'fileIds must be a non-empty array',
      });
    }

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'operations must be a non-empty array',
      });
    }

    const jobId = batchEditor.createBatchJob(auth.userId!, fileIds, operations);

    return res.json({
      success: true,
      data: {
        jobId,
        fileCount: fileIds.length,
        operationCount: operations.length,
      },
    });
  } catch (error) {
    return handleRouteError(
      res,
      '[BatchRoutes] Create job error:',
      error,
      'Failed to create batch job',
    );
  }
});

/**
 * @swagger
 * /api/editor/batch/status/{jobId}:
 *   get:
 *     summary: Get batch job status
 *     tags: [Editor - Batch]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Batch job status
 */
router.get('/status/:jobId', requireAuth(), async (req, res) => {
  try {
    const { jobId } = req.params;
    const auth = getAuth(req);

    const job = batchEditor.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // Verify user owns this job
    if (job.userId !== auth.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    return res.json({
      success: true,
      data: { job },
    });
  } catch (error) {
    return handleRouteError(
      res,
      '[BatchRoutes] Get status error:',
      error,
      'Failed to get job status',
    );
  }
});

/**
 * @swagger
 * /api/editor/batch/progress/{jobId}:
 *   get:
 *     summary: Get batch job progress
 *     tags: [Editor - Batch]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Batch job progress
 */
router.get('/progress/:jobId', requireAuth(), async (req, res) => {
  try {
    const { jobId } = req.params;
    const auth = getAuth(req);

    const job = batchEditor.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.userId !== auth.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const progress = batchEditor.getJobProgress(jobId);

    return res.json({
      success: true,
      data: { progress },
    });
  } catch (error) {
    return handleRouteError(
      res,
      '[BatchRoutes] Get progress error:',
      error,
      'Failed to get job progress',
    );
  }
});

/**
 * @swagger
 * /api/editor/batch/cancel/{jobId}:
 *   post:
 *     summary: Cancel a batch job
 *     tags: [Editor - Batch]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job cancelled successfully
 */
router.post('/cancel/:jobId', requireAuth(), async (req, res) => {
  try {
    const { jobId } = req.params;
    const auth = getAuth(req);

    const job = batchEditor.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.userId !== auth.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const cancelled = batchEditor.cancelJob(jobId);

    return res.json({
      success: cancelled,
      message: cancelled ? 'Job cancelled' : 'Job cannot be cancelled',
    });
  } catch (error) {
    return handleRouteError(res, '[BatchRoutes] Cancel job error:', error, 'Failed to cancel job');
  }
});

/**
 * @swagger
 * /api/editor/batch/effect-preset:
 *   post:
 *     summary: Apply effect preset to multiple files
 *     tags: [Editor - Batch]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileIds
 *               - presetName
 *             properties:
 *               fileIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               presetName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Batch job created
 */
router.post('/effect-preset', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    const { fileIds, presetName } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'fileIds must be a non-empty array',
      });
    }

    if (!presetName || typeof presetName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'presetName is required',
      });
    }

    const jobId = await batchEditor.applyEffectPreset(fileIds, presetName, auth.userId!);

    return res.json({
      success: true,
      data: {
        jobId,
        fileCount: fileIds.length,
        presetName,
      },
    });
  } catch (error) {
    return handleRouteError(
      res,
      '[BatchRoutes] Apply effect preset error:',
      error,
      'Failed to apply effect preset',
    );
  }
});

/**
 * @swagger
 * /api/editor/batch/resize:
 *   post:
 *     summary: Batch resize multiple files
 *     tags: [Editor - Batch]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileIds
 *               - width
 *               - height
 *             properties:
 *               fileIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               width:
 *                 type: number
 *               height:
 *                 type: number
 *     responses:
 *       200:
 *         description: Batch job created
 */
router.post('/resize', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    const { fileIds, width, height } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'fileIds must be a non-empty array',
      });
    }

    if (typeof width !== 'number' || typeof height !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'width and height must be numbers',
      });
    }

    const jobId = await batchEditor.batchResize(fileIds, width, height, auth.userId!);

    return res.json({
      success: true,
      data: {
        jobId,
        fileCount: fileIds.length,
        dimensions: { width, height },
      },
    });
  } catch (error) {
    return handleRouteError(
      res,
      '[BatchRoutes] Batch resize error:',
      error,
      'Failed to batch resize',
    );
  }
});

/**
 * @swagger
 * /api/editor/batch/export:
 *   post:
 *     summary: Batch export files in multiple formats
 *     tags: [Editor - Batch]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fileIds
 *               - formats
 *             properties:
 *               fileIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               formats:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [png, jpeg, jpg, webp, svg]
 *     responses:
 *       200:
 *         description: Batch job created
 */
router.post('/export', requireAuth(), async (req, res) => {
  try {
    const auth = getAuth(req);
    const { fileIds, formats } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'fileIds must be a non-empty array',
      });
    }

    if (!formats || !Array.isArray(formats) || formats.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'formats must be a non-empty array',
      });
    }

    const jobId = await batchEditor.batchExport(fileIds, formats, auth.userId!);

    return res.json({
      success: true,
      data: {
        jobId,
        fileCount: fileIds.length,
        formats,
      },
    });
  } catch (error) {
    return handleRouteError(
      res,
      '[BatchRoutes] Batch export error:',
      error,
      'Failed to batch export',
    );
  }
});

export default router;

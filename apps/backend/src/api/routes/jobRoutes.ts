import { Router } from 'express';
import { requireAuth } from '@clerk/express';
import {
  createGenerateJob,
  getJobStatus,
  getUserJobs,
  cancelJob,
  getQueueStats,
} from '../controllers/jobController';

const router = Router();

// All routes require authentication
router.use(requireAuth());

// Create variant generation job
router.post('/generate', createGenerateJob);

// Get all jobs for user
router.get('/', getUserJobs);

// Get queue statistics
router.get('/stats', getQueueStats);

// Get specific job status
router.get('/:jobId', getJobStatus);

// Cancel job
router.delete('/:jobId', cancelJob);

export default router;

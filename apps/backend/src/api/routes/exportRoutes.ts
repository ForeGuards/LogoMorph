import { Router } from 'express';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import {
  exportAsZip,
  convertFormat,
  getExportPresets,
  estimateZipSize,
} from '../controllers/exportController';

const router = Router();

// Apply Clerk middleware
router.use(clerkMiddleware());

// Export routes
router.post('/zip', requireAuth(), exportAsZip);
router.post('/convert', requireAuth(), convertFormat);
router.get('/presets', getExportPresets);
router.post('/estimate', requireAuth(), estimateZipSize);

export default router;

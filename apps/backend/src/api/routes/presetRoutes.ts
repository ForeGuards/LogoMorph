import { Router } from 'express';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import {
  createPreset,
  getUserPresets,
  getPublicPresets,
  updatePreset,
  deletePreset,
  duplicatePreset,
} from '../controllers/presetController';

const router = Router();

// Apply Clerk middleware
router.use(clerkMiddleware());

// Preset routes
router.post('/', requireAuth(), createPreset);
router.get('/', requireAuth(), getUserPresets);
router.get('/public', getPublicPresets);
router.put('/:presetId', requireAuth(), updatePreset);
router.delete('/:presetId', requireAuth(), deletePreset);
router.post('/:presetId/duplicate', requireAuth(), duplicatePreset);

export default router;

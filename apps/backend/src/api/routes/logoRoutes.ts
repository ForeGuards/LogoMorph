import { Router } from 'express';
import { requireAuth } from '@clerk/express';
import { uploadLogo, getUserLogos, deleteLogo, analyzeLogo } from '../controllers/uploadController';

const router = Router();

// All routes require authentication
router.use(requireAuth());

// Upload logo
router.post('/upload', uploadLogo);

// Analyze logo without uploading
router.post('/analyze', analyzeLogo);

// Get user's logos
router.get('/logos', getUserLogos);

// Delete logo
router.delete('/logos/:logoId', deleteLogo);

export default router;

import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth';
import {
  analyzeCVATS,
  analyzeDraftATS,
  listCVATSHistory,
  createCV,
  deleteCV,
  exportPDF,
  getCV,
  listCVs,
  parseCVUpload,
  listCVVersions,
  restoreVersion,
  tailorCVATS,
  tailorDraftATS,
  updateCV,
} from '../controllers/cvController';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(authMiddleware);

router.get('/', listCVs);
router.post('/', createCV);
router.post('/analyze-draft', analyzeDraftATS);
router.post('/tailor-draft', tailorDraftATS);
router.post('/import/parse', upload.single('file'), parseCVUpload);
router.get('/:id', getCV);
router.post('/:id/analyze', analyzeCVATS);
router.post('/:id/tailor', tailorCVATS);
router.get('/:id/ats-history', listCVATSHistory);
router.put('/:id', updateCV);
router.delete('/:id', deleteCV);
router.get('/:id/pdf', exportPDF);
router.get('/:id/versions', listCVVersions);
router.post('/:id/versions/:versionId/restore', restoreVersion);

export default router;

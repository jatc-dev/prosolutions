import { Router } from 'express';
import multer from 'multer';
import { requireAdmin } from '../middleware/admin';
import {
  getSystemStats,
  getChartData,
  getAuditLogs,
  getPlatformSettings,
  updatePlatformSetting,
  bulkUpdatePlatformSettings,
  deletePlatformSetting,
  uploadLogo,
} from '../controllers/adminController';

const router = Router();

// Multer configuration for file uploads
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// All admin routes require admin authentication
router.use(requireAdmin);

// System stats
router.get('/stats', getSystemStats);
router.get('/charts', getChartData);

// Audit logs
router.get('/audit-logs', getAuditLogs);

// Platform Settings
router.get('/settings', getPlatformSettings);
router.put('/settings/:key', updatePlatformSetting);
router.put('/settings', bulkUpdatePlatformSettings);
router.delete('/settings/:key', deletePlatformSetting);

// File Uploads
router.post('/upload/logo', upload.single('logo'), uploadLogo);

export default router;

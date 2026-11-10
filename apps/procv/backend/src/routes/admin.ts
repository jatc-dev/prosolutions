import { Router } from 'express';
import multer from 'multer';
import { requireAdmin, requireProcvPermission } from '../middleware/admin';
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
router.get('/stats', requireProcvPermission('procv.analytics.read'), getSystemStats);
router.get('/charts', requireProcvPermission('procv.analytics.read'), getChartData);

// Audit logs
router.get('/audit-logs', requireProcvPermission('procv.audit.read'), getAuditLogs);

// Platform Settings
router.get('/settings', requireProcvPermission('procv.settings.read'), getPlatformSettings);
router.put('/settings/:key', requireProcvPermission('procv.settings.manage'), updatePlatformSetting);
router.put('/settings', requireProcvPermission('procv.settings.manage'), bulkUpdatePlatformSettings);
router.delete('/settings/:key', requireProcvPermission('procv.settings.manage'), deletePlatformSetting);

// File Uploads
router.post('/upload/logo', requireProcvPermission('procv.branding.manage'), upload.single('logo'), uploadLogo);

export default router;

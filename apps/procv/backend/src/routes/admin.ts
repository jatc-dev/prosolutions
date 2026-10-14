import { Router } from 'express';
import multer from 'multer';
import { requireAdmin } from '../middleware/admin';
import {
  getUsers,
  updateUser,
  deleteUser,
  resetUserPassword,
  getSystemStats,
  getChartData,
  getAuditLogs,
  exportUsersCSV,
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

// User management
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/reset-password', resetUserPassword);

// System stats
router.get('/stats', getSystemStats);
router.get('/charts', getChartData);

// Audit logs
router.get('/audit-logs', getAuditLogs);

// Export
router.get('/export/users/csv', exportUsersCSV);

// Platform Settings
router.get('/settings', getPlatformSettings);
router.put('/settings/:key', updatePlatformSetting);
router.put('/settings', bulkUpdatePlatformSettings);
router.delete('/settings/:key', deletePlatformSetting);

// File Uploads
router.post('/upload/logo', upload.single('logo'), uploadLogo);

export default router;

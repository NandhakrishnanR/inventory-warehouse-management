import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/stock-summary', ReportsController.getStockSummary);
router.get('/valuation', ReportsController.getValuationReport);
router.get('/audit-logs', ReportsController.getAuditLogs);
router.get('/notifications', ReportsController.getNotifications);
router.put('/notifications/:id/read', ReportsController.markNotificationRead);

export default router;

import { Router } from 'express';
import { ReceivingController } from './receiving.controller';
import { authenticateToken } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';

const router = Router();

router.use(authenticateToken);

router.get('/goods-receipts', ReceivingController.listReceipts);
router.post(
  '/goods-receipts',
  requireRoles('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF'),
  ReceivingController.createReceipt
);
router.get('/putaway-tasks', ReceivingController.listPutawayTasks);
router.post(
  '/putaway-tasks/:id/confirm',
  requireRoles('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF'),
  ReceivingController.confirmPutaway
);

export default router;

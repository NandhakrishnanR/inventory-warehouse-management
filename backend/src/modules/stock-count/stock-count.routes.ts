import { Router } from 'express';
import { StockCountController } from './stock-count.controller';
import { authenticateToken } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';

const router = Router();

router.use(authenticateToken);

router.get('/', StockCountController.listCounts);
router.post('/', requireRoles('ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_MANAGER'), StockCountController.createCount);
router.post('/:id/record-quantities', requireRoles('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF'), StockCountController.recordQuantities);
router.post('/:id/post-adjustments', requireRoles('ADMIN', 'INVENTORY_MANAGER'), StockCountController.postAdjustments);

export default router;

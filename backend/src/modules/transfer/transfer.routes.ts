import { Router } from 'express';
import { TransferController } from './transfer.controller';
import { authenticateToken } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';

const router = Router();

router.use(authenticateToken);

router.get('/', TransferController.listTransfers);
router.post('/', requireRoles('ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_MANAGER'), TransferController.createTransfer);
router.post('/:id/dispatch', requireRoles('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF'), TransferController.dispatchTransfer);
router.post('/:id/receive', requireRoles('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF'), TransferController.receiveTransfer);

export default router;

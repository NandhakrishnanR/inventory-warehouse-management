import { Router } from 'express';
import { InventoryController } from './inventory.controller';
import { authenticateToken } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';

const router = Router();

router.use(authenticateToken);

router.get('/balances', InventoryController.listBalances);
router.get('/movements', InventoryController.listMovements);
router.get('/ledger', InventoryController.listMovements);
router.post('/direct-receipt', requireRoles('ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_MANAGER'), InventoryController.postDirectReceipt);
router.get('/issues', InventoryController.listIssues);
router.post('/issues', requireRoles('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF'), InventoryController.issueStock);

export default router;

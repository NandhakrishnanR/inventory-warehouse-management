import { Router } from 'express';
import { WarehouseController } from './warehouse.controller';
import { authenticateToken } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';

const router = Router();

router.use(authenticateToken);

router.get('/tree', WarehouseController.getLocationTree);
router.get('/', WarehouseController.listWarehouses);
router.get('/:id/tree', WarehouseController.getWarehouseTree);
router.post('/', requireRoles('ADMIN', 'INVENTORY_MANAGER'), WarehouseController.createWarehouse);
router.post('/zones', requireRoles('ADMIN', 'WAREHOUSE_MANAGER'), WarehouseController.createZone);
router.post('/racks', requireRoles('ADMIN', 'WAREHOUSE_MANAGER'), WarehouseController.createRack);
router.post('/bins', requireRoles('ADMIN', 'WAREHOUSE_MANAGER'), WarehouseController.createBin);
router.put('/bins/:id/toggle-status', requireRoles('ADMIN', 'WAREHOUSE_MANAGER'), WarehouseController.toggleBinStatus);

export default router;

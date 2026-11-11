import { Router } from 'express';
import { WarehouseController } from './warehouse.controller';
import { authenticateToken } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';

const router = Router();

router.use(authenticateToken);

// Tree & General
router.get('/tree', WarehouseController.getLocationTree);
router.get('/', WarehouseController.listWarehouses);
router.get('/:id/tree', WarehouseController.getWarehouseTree);
router.get('/:id/bins', WarehouseController.listWarehouseBins);

// Companies
router.get('/companies', WarehouseController.listCompanies);
router.post('/companies', requireRoles('ADMIN'), WarehouseController.createCompany);
router.put('/companies/:id', requireRoles('ADMIN'), WarehouseController.updateCompany);
router.delete('/companies/:id', requireRoles('ADMIN'), WarehouseController.deleteCompany);
router.put('/companies/:id/toggle-status', requireRoles('ADMIN'), WarehouseController.toggleCompanyStatus);

// Regions
router.post('/regions', requireRoles('ADMIN'), WarehouseController.createRegion);
router.put('/regions/:id', requireRoles('ADMIN'), WarehouseController.updateRegion);
router.delete('/regions/:id', requireRoles('ADMIN'), WarehouseController.deleteRegion);

// Cities
router.post('/cities', requireRoles('ADMIN'), WarehouseController.createCity);
router.put('/cities/:id', requireRoles('ADMIN'), WarehouseController.updateCity);
router.delete('/cities/:id', requireRoles('ADMIN'), WarehouseController.deleteCity);

// Sites
router.post('/sites', requireRoles('ADMIN'), WarehouseController.createSite);
router.put('/sites/:id', requireRoles('ADMIN'), WarehouseController.updateSite);
router.delete('/sites/:id', requireRoles('ADMIN'), WarehouseController.deleteSite);

// Warehouses
router.post('/', requireRoles('ADMIN', 'INVENTORY_MANAGER'), WarehouseController.createWarehouse);
router.put('/:id', requireRoles('ADMIN', 'INVENTORY_MANAGER'), WarehouseController.updateWarehouse);
router.delete('/:id', requireRoles('ADMIN', 'INVENTORY_MANAGER'), WarehouseController.deleteWarehouse);

// Zones
router.post('/zones', requireRoles('ADMIN', 'WAREHOUSE_MANAGER'), WarehouseController.createZone);
router.put('/zones/:id', requireRoles('ADMIN', 'WAREHOUSE_MANAGER'), WarehouseController.updateZone);
router.delete('/zones/:id', requireRoles('ADMIN', 'WAREHOUSE_MANAGER'), WarehouseController.deleteZone);

// Racks
router.post('/racks', requireRoles('ADMIN', 'WAREHOUSE_MANAGER'), WarehouseController.createRack);
router.put('/racks/:id', requireRoles('ADMIN', 'WAREHOUSE_MANAGER'), WarehouseController.updateRack);
router.delete('/racks/:id', requireRoles('ADMIN', 'WAREHOUSE_MANAGER'), WarehouseController.deleteRack);

// Bins
router.post('/bins', requireRoles('ADMIN', 'WAREHOUSE_MANAGER'), WarehouseController.createBin);
router.put('/bins/:id', requireRoles('ADMIN', 'WAREHOUSE_MANAGER'), WarehouseController.updateBin);
router.delete('/bins/:id', requireRoles('ADMIN', 'WAREHOUSE_MANAGER'), WarehouseController.deleteBin);
router.put('/bins/:id/toggle-status', requireRoles('ADMIN', 'WAREHOUSE_MANAGER'), WarehouseController.toggleBinStatus);

export default router;

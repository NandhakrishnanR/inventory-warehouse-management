import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import warehouseRoutes from '../modules/warehouse/warehouse.routes';
import { WarehouseController } from '../modules/warehouse/warehouse.controller';
import { authenticateToken } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import productRoutes from '../modules/product/product.routes';
import procurementRoutes from '../modules/procurement/procurement.routes';
import receivingRoutes from '../modules/receiving/receiving.routes';
import inventoryRoutes from '../modules/inventory/inventory.routes';
import transferRoutes from '../modules/transfer/transfer.routes';
import stockCountRoutes from '../modules/stock-count/stock-count.routes';
import approvalRoutes from '../modules/approval/approval.routes';
import reportRoutes from '../modules/reports/reports.routes';
import { ReportsController } from '../modules/reports/reports.controller';

const router = Router();

// Dedicated /companies alias
const companyRouter = Router();
companyRouter.use(authenticateToken);
companyRouter.get('/', WarehouseController.listCompanies);
companyRouter.post('/', requireRoles('ADMIN'), WarehouseController.createCompany);
companyRouter.put('/:id', requireRoles('ADMIN'), WarehouseController.updateCompany);
companyRouter.delete('/:id', requireRoles('ADMIN'), WarehouseController.deleteCompany);
companyRouter.put('/:id/toggle-status', requireRoles('ADMIN'), WarehouseController.toggleCompanyStatus);

router.use('/auth', authRoutes);
router.use('/companies', companyRouter);
router.use('/warehouses', warehouseRoutes);
router.use('/products', productRoutes);
router.use('/procurement', procurementRoutes);
router.use('/receiving', receivingRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/transfers', transferRoutes);
router.use('/stock-counts', stockCountRoutes);
router.use('/approvals', approvalRoutes);
router.use('/reports', reportRoutes);
router.get('/audit-logs', authenticateToken, ReportsController.getAuditLogs);
router.get('/audit', authenticateToken, ReportsController.getAuditLogs);

export default router;

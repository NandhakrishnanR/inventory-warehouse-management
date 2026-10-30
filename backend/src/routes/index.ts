import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import warehouseRoutes from '../modules/warehouse/warehouse.routes';
import productRoutes from '../modules/product/product.routes';
import procurementRoutes from '../modules/procurement/procurement.routes';
import receivingRoutes from '../modules/receiving/receiving.routes';
import inventoryRoutes from '../modules/inventory/inventory.routes';
import transferRoutes from '../modules/transfer/transfer.routes';
import stockCountRoutes from '../modules/stock-count/stock-count.routes';
import approvalRoutes from '../modules/approval/approval.routes';
import reportRoutes from '../modules/reports/reports.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/warehouses', warehouseRoutes);
router.use('/products', productRoutes);
router.use('/procurement', procurementRoutes);
router.use('/receiving', receivingRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/transfers', transferRoutes);
router.use('/stock-counts', stockCountRoutes);
router.use('/approvals', approvalRoutes);
router.use('/reports', reportRoutes);

export default router;

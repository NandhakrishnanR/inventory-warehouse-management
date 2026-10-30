import { Router } from 'express';
import { ProcurementController } from './procurement.controller';
import { authenticateToken } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';

const router = Router();

router.use(authenticateToken);

router.get('/suppliers', ProcurementController.listSuppliers);
router.get('/departments', ProcurementController.listDepartments);
router.get('/requisitions', ProcurementController.listRequisitions);
router.post(
  '/requisitions',
  requireRoles('ADMIN', 'DEPARTMENT_MANAGER', 'PROCUREMENT_OFFICER'),
  ProcurementController.createRequisition
);
router.post(
  '/requisitions/:id/submit',
  requireRoles('ADMIN', 'DEPARTMENT_MANAGER', 'PROCUREMENT_OFFICER'),
  ProcurementController.submitRequisition
);
router.get('/orders', ProcurementController.listOrders);
router.post('/orders', requireRoles('ADMIN', 'PROCUREMENT_OFFICER'), ProcurementController.createOrder);

export default router;

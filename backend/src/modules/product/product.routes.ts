import { Router } from 'express';
import { ProductController } from './product.controller';
import { authenticateToken } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';

const router = Router();

router.use(authenticateToken);

router.get('/categories', ProductController.listCategories);
router.get('/units', ProductController.listUnits);
router.get('/', ProductController.listProducts);
router.get('/:id', ProductController.getProductById);
router.post('/', requireRoles('ADMIN', 'INVENTORY_MANAGER', 'PROCUREMENT_OFFICER'), ProductController.createProduct);

export default router;

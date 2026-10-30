import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateToken } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';

const router = Router();

router.post('/login', AuthController.login);
router.post('/logout', authenticateToken, AuthController.logout);
router.get('/me', authenticateToken, AuthController.me);
router.get('/users', authenticateToken, AuthController.listUsers);
router.get('/roles', authenticateToken, AuthController.listRoles);
router.get('/permissions', authenticateToken, AuthController.listPermissions);

// Admin-only management endpoints
router.post('/users/:id/assign-role', authenticateToken, requireRoles('ADMIN'), AuthController.assignRole);
router.delete('/users/:id/roles/:roleId', authenticateToken, requireRoles('ADMIN'), AuthController.removeRole);
router.put('/users/:id/toggle-status', authenticateToken, requireRoles('ADMIN'), AuthController.toggleUserStatus);

export default router;

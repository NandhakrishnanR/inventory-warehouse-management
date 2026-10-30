import { Router } from 'express';
import { ApprovalController } from './approval.controller';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/inbox', ApprovalController.getInbox);
router.post('/:id/approve', ApprovalController.approve);
router.post('/:id/reject', ApprovalController.reject);
router.post('/:id/return', ApprovalController.returnForCorrection);

export default router;

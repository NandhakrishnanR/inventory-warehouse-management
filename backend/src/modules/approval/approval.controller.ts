import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../shared/prisma';
import { logAudit } from '../../shared/audit';
import { createNotification, notifyUsersByRole } from '../../shared/notification';

const actionSchema = z.object({
  comments: z.string().optional(),
});

export class ApprovalController {
  // GET /api/approvals/inbox
  static async getInbox(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRoles = req.user!.roles || [];
      const isAdmin = userRoles.includes('ADMIN');
      const isFinanceApprover = userRoles.includes('FINANCE_APPROVER');
      const isAuditor = userRoles.includes('AUDITOR');
      const userId = req.user!.id;
      const scope = (req.query.scope as string) || 'assigned'; // 'assigned', 'submitted', 'history', 'all'

      let whereClause: any = {};

      if (scope === 'submitted') {
        // Requests initiated by the current user
        whereClause = {
          initiatedById: userId,
        };
      } else if (scope === 'history') {
        // Completed/terminal requests
        whereClause = {
          status: { in: ['APPROVED', 'REJECTED', 'RETURNED'] },
          ...(!isAdmin && !isFinanceApprover && !isAuditor && {
            OR: [
              { initiatedById: userId },
              { actions: { some: { actorId: userId } } },
            ],
          }),
        };
      } else if (scope === 'all' && (isAdmin || isAuditor || isFinanceApprover)) {
        // Full oversight for Admin, Auditor, or Finance Approver
        whereClause = {};
      } else {
        // 'assigned': Pending approvals awaiting action
        // Admins see all pending; Finance Approvers see items matching their role OR any pending Purchase Requisitions
        whereClause = {
          status: 'PENDING',
          ...(!isAdmin && (isFinanceApprover
            ? {
                OR: [
                  { currentStep: { approverRole: { in: userRoles } } },
                  { documentType: 'PURCHASE_REQUISITION' },
                ],
              }
            : {
                currentStep: {
                  approverRole: { in: userRoles },
                },
              }
          )),
        };
      }

      const instances = await prisma.approvalInstance.findMany({
        where: whereClause,
        include: {
          workflow: true,
          currentStep: true,
          initiatedBy: { select: { id: true, username: true, email: true } },
          actions: {
            include: { actor: { select: { id: true, username: true } }, step: true },
            orderBy: { actionDate: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Enrich with document details (PR, PO, StockTransfer)
      const enriched = await Promise.all(
        instances.map(async (inst) => {
          let documentDetails: any = null;
          if (inst.documentType === 'PURCHASE_REQUISITION') {
            documentDetails = await prisma.purchaseRequisition.findUnique({
              where: { id: inst.documentId },
              include: { department: true, items: { include: { product: true } } },
            });
          } else if (inst.documentType === 'PURCHASE_ORDER') {
            documentDetails = await prisma.purchaseOrder.findUnique({
              where: { id: inst.documentId },
              include: { supplier: true, items: { include: { product: true } } },
            });
          } else if (inst.documentType === 'STOCK_TRANSFER') {
            documentDetails = await prisma.stockTransfer.findUnique({
              where: { id: inst.documentId },
              include: { sourceWarehouse: true, destWarehouse: true, items: { include: { product: true } } },
            });
          }
          return {
            ...inst,
            document: documentDetails,
          };
        })
      );

      res.json({ success: true, data: enriched });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/approvals/:id/approve
  static async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { comments } = actionSchema.parse(req.body);

      const instance = await prisma.approvalInstance.findUnique({
        where: { id },
        include: {
          workflow: { include: { steps: { orderBy: { stepOrder: 'asc' } } } },
          currentStep: true,
        },
      });

      if (!instance || instance.status !== 'PENDING') {
        res.status(400).json({ success: false, message: 'Invalid or non-pending approval instance' });
        return;
      }

      // Separation of duties: check if self-approval
      if (instance.initiatedById === req.user!.id && !req.user!.roles.includes('ADMIN')) {
        res.status(403).json({
          success: false,
          message: 'Separation of duties violation: Initiator cannot approve their own submission.',
        });
        return;
      }

      // Check role authorization
      const isRoleAuthorized =
        (instance.currentStep && req.user!.roles.includes(instance.currentStep.approverRole)) ||
        req.user!.roles.includes('ADMIN') ||
        (instance.documentType === 'PURCHASE_REQUISITION' && req.user!.roles.includes('FINANCE_APPROVER'));

      if (!isRoleAuthorized) {
        res.status(403).json({
          success: false,
          message: `Forbidden: This step requires role ${instance.currentStep?.approverRole}`,
        });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        // Record action
        await tx.approvalAction.create({
          data: {
            instanceId: instance.id,
            stepId: instance.currentStepId,
            action: 'APPROVE',
            actorId: req.user!.id,
            comments,
          },
        });

        // Check document amount if applicable
        let documentAmount = 0;
        if (instance.documentType === 'PURCHASE_REQUISITION') {
          const pr = await tx.purchaseRequisition.findUnique({ where: { id: instance.documentId } });
          documentAmount = pr?.totalEstimatedCost || 0;
        }

        // Determine next step or final approval based on step ordering and amount thresholds
        const currentOrder = instance.currentStep?.stepOrder || 1;
        const candidateSteps = instance.workflow.steps.filter((s) => s.stepOrder > currentOrder);
        const nextStep = candidateSteps.find((s) => {
          if (s.minAmount !== null && documentAmount < s.minAmount) return false;
          if (s.maxAmount !== null && documentAmount > s.maxAmount) return false;
          return true;
        });

        // If approved by FINANCE_APPROVER on a Purchase Requisition, treat as final authorization
        const isFinanceFinal = req.user!.roles.includes('FINANCE_APPROVER') && instance.documentType === 'PURCHASE_REQUISITION';

        if (nextStep && !instance.currentStep?.isFinal && !isFinanceFinal) {
          // Advance to next step
          const updated = await tx.approvalInstance.update({
            where: { id },
            data: {
              currentStepId: nextStep.id,
              status: 'PENDING',
            },
          });

          // Notify next step approver role
          await notifyUsersByRole(
            nextStep.approverRole,
            `Pending Approval: Step ${nextStep.stepOrder} (${instance.documentType})`,
            `Document advanced to ${nextStep.stepName} for review.`,
            '/approvals',
            'APPROVAL'
          );

          return updated;
        } else {
          // Final approval
          const updated = await tx.approvalInstance.update({
            where: { id },
            data: {
              status: 'APPROVED',
            },
          });

          // Update underlying document status
          if (instance.documentType === 'PURCHASE_REQUISITION') {
            await tx.purchaseRequisition.update({
              where: { id: instance.documentId },
              data: { status: 'APPROVED' },
            });
          }

          // Notify initiator
          await createNotification({
            userId: instance.initiatedById,
            title: `Approved: ${instance.documentType}`,
            message: `Your ${instance.documentType} has received final approval.`,
            type: 'SUCCESS',
          });

          return updated;
        }
      });

      await logAudit({
        actorId: req.user!.id,
        action: 'APPROVE',
        entity: 'ApprovalInstance',
        entityId: instance.id,
        reference: `${instance.documentType} / ${instance.documentId}`,
        afterValue: { comments, status: result.status },
      });

      res.json({ success: true, message: 'Approval step completed', data: result });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/approvals/:id/reject
  static async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { comments } = actionSchema.parse(req.body);

      const instance = await prisma.approvalInstance.findUnique({
        where: { id },
        include: { currentStep: true },
      });

      if (!instance || instance.status !== 'PENDING') {
        res.status(400).json({ success: false, message: 'Invalid or non-pending approval instance' });
        return;
      }

      // Check role authorization
      const isRoleAuthorized =
        (instance.currentStep && req.user!.roles.includes(instance.currentStep.approverRole)) ||
        req.user!.roles.includes('ADMIN') ||
        (instance.documentType === 'PURCHASE_REQUISITION' && req.user!.roles.includes('FINANCE_APPROVER'));

      if (!isRoleAuthorized) {
        res.status(403).json({
          success: false,
          message: `Forbidden: This step requires role ${instance.currentStep?.approverRole}`,
        });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.approvalAction.create({
          data: {
            instanceId: instance.id,
            stepId: instance.currentStepId,
            action: 'REJECT',
            actorId: req.user!.id,
            comments,
          },
        });

        await tx.approvalInstance.update({
          where: { id },
          data: { status: 'REJECTED' },
        });

        if (instance.documentType === 'PURCHASE_REQUISITION') {
          await tx.purchaseRequisition.update({
            where: { id: instance.documentId },
            data: { status: 'REJECTED' },
          });
        }
      });

      await createNotification({
        userId: instance.initiatedById,
        title: `Rejected: ${instance.documentType}`,
        message: `Your ${instance.documentType} was rejected. Reason: ${comments || 'No comment provided'}`,
        type: 'ALERT',
      });

      await logAudit({
        actorId: req.user!.id,
        action: 'REJECT',
        entity: 'ApprovalInstance',
        entityId: instance.id,
        reference: `${instance.documentType} / ${instance.documentId}`,
      });

      res.json({ success: true, message: 'Document rejected' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/approvals/:id/return (Return for correction)
  static async returnForCorrection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { comments } = actionSchema.parse(req.body);

      const instance = await prisma.approvalInstance.findUnique({
        where: { id },
        include: { currentStep: true },
      });

      if (!instance || instance.status !== 'PENDING') {
        res.status(400).json({ success: false, message: 'Invalid or non-pending approval instance' });
        return;
      }

      // Check role authorization
      const isRoleAuthorized =
        (instance.currentStep && req.user!.roles.includes(instance.currentStep.approverRole)) ||
        req.user!.roles.includes('ADMIN') ||
        (instance.documentType === 'PURCHASE_REQUISITION' && req.user!.roles.includes('FINANCE_APPROVER'));

      if (!isRoleAuthorized) {
        res.status(403).json({
          success: false,
          message: `Forbidden: This step requires role ${instance.currentStep?.approverRole}`,
        });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.approvalAction.create({
          data: {
            instanceId: instance.id,
            stepId: instance.currentStepId,
            action: 'RETURN',
            actorId: req.user!.id,
            comments,
          },
        });

        await tx.approvalInstance.update({
          where: { id },
          data: { status: 'RETURNED' },
        });

        if (instance.documentType === 'PURCHASE_REQUISITION') {
          await tx.purchaseRequisition.update({
            where: { id: instance.documentId },
            data: { status: 'DRAFT' },
          });
        }
      });

      await createNotification({
        userId: instance.initiatedById,
        title: `Returned for Correction: ${instance.documentType}`,
        message: `Your ${instance.documentType} was returned for edits. Feedback: ${comments || 'Please revise'}`,
        type: 'WARNING',
      });

      await logAudit({
        actorId: req.user!.id,
        action: 'RETURN',
        entity: 'ApprovalInstance',
        entityId: instance.id,
        reference: `${instance.documentType} / ${instance.documentId}`,
        afterValue: { comments, status: 'RETURNED' },
      });

      res.json({ success: true, message: 'Returned for correction' });
    } catch (err) {
      next(err);
    }
  }
}

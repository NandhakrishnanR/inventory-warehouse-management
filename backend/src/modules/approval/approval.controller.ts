import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../shared/prisma';
import { logAudit } from '../../shared/audit';
import { createNotification } from '../../shared/notification';

const actionSchema = z.object({
  comments: z.string().optional(),
});

export class ApprovalController {
  // GET /api/approvals/inbox
  static async getInbox(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRoles = req.user!.roles;

      // Find pending instances where current step requires one of the user's roles
      const instances = await prisma.approvalInstance.findMany({
        where: {
          status: 'PENDING',
          currentStep: {
            approverRole: { in: userRoles },
          },
        },
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

      // Enrich with document details (e.g., PR or PO)
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
      if (instance.currentStep && !req.user!.roles.includes(instance.currentStep.approverRole) && !req.user!.roles.includes('ADMIN')) {
        res.status(403).json({
          success: false,
          message: `Forbidden: This step requires role ${instance.currentStep.approverRole}`,
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

        // Determine next step or final approval
        const currentOrder = instance.currentStep?.stepOrder || 1;
        const nextStep = instance.workflow.steps.find((s) => s.stepOrder > currentOrder);

        if (nextStep && !instance.currentStep?.isFinal) {
          // Advance to next step
          return await tx.approvalInstance.update({
            where: { id },
            data: {
              currentStepId: nextStep.id,
              status: 'PENDING',
            },
          });
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
      if (instance.currentStep && !req.user!.roles.includes(instance.currentStep.approverRole) && !req.user!.roles.includes('ADMIN')) {
        res.status(403).json({
          success: false,
          message: `Forbidden: This step requires role ${instance.currentStep.approverRole}`,
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
      if (instance.currentStep && !req.user!.roles.includes(instance.currentStep.approverRole) && !req.user!.roles.includes('ADMIN')) {
        res.status(403).json({
          success: false,
          message: `Forbidden: This step requires role ${instance.currentStep.approverRole}`,
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

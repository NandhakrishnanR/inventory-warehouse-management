import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../shared/prisma';
import { logAudit } from '../../shared/audit';
import { notifyUsersByRole } from '../../shared/notification';

const createPRSchema = z.object({
  departmentId: z.string().uuid(),
  justification: z.string().min(5),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().positive(),
      estimatedUnitCost: z.number().nonnegative(),
      notes: z.string().optional(),
    })
  ).min(1, 'At least one item is required'),
});

const createPOSchema = z.object({
  requisitionId: z.string().uuid().optional(),
  supplierId: z.string().uuid(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      orderedQty: z.number().positive(),
      unitPrice: z.number().nonnegative(),
    })
  ).min(1),
});

export class ProcurementController {
  // GET /api/procurement/requisitions
  static async listRequisitions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requisitions = await prisma.purchaseRequisition.findMany({
        include: {
          department: true,
          requestedBy: { select: { id: true, username: true, email: true } },
          items: { include: { product: true } },
          purchaseOrders: {
            select: {
              id: true,
              poNumber: true,
              status: true,
              totalAmount: true,
              createdAt: true,
              orderDate: true,
              supplier: { select: { id: true, name: true, code: true } },
              items: {
                select: {
                  id: true,
                  productId: true,
                  orderedQty: true,
                  receivedQty: true,
                },
              },
              goodsReceipts: {
                select: {
                  id: true,
                  grnNumber: true,
                  status: true,
                  createdAt: true,
                  warehouse: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Enrich with latest approval instance details (active step, approver role, and full action trail)
      const prIds = requisitions.map((r) => r.id);
      const instances = await prisma.approvalInstance.findMany({
        where: {
          documentType: 'PURCHASE_REQUISITION',
          documentId: { in: prIds },
        },
        include: {
          currentStep: true,
          actions: {
            include: { actor: { select: { id: true, username: true } }, step: true },
            orderBy: { actionDate: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const instanceMap = new Map<string, any>();
      instances.forEach((inst) => {
        if (!instanceMap.has(inst.documentId)) {
          instanceMap.set(inst.documentId, inst);
        }
      });

      const enriched = requisitions.map((pr) => ({
        ...pr,
        approvalInstance: instanceMap.get(pr.id) || null,
      }));

      res.json({ success: true, data: enriched });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/procurement/requisitions
  static async createRequisition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createPRSchema.parse(req.body);
      const prNumber = `PR-${Date.now().toString().slice(-6)}`;
      const totalEstimatedCost = data.items.reduce((sum, item) => sum + item.quantity * item.estimatedUnitCost, 0);

      const pr = await prisma.purchaseRequisition.create({
        data: {
          prNumber,
          departmentId: data.departmentId,
          requestedById: req.user!.id,
          justification: data.justification,
          status: 'DRAFT',
          totalEstimatedCost,
          items: {
            create: data.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              estimatedUnitCost: i.estimatedUnitCost,
              estimatedTotalCost: i.quantity * i.estimatedUnitCost,
              notes: i.notes,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      await logAudit({
        actorId: req.user!.id,
        action: 'CREATE',
        entity: 'PurchaseRequisition',
        entityId: pr.id,
        reference: pr.prNumber,
        afterValue: pr,
      });

      res.status(201).json({ success: true, data: pr });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/procurement/requisitions/:id/submit
  static async submitRequisition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const pr = await prisma.purchaseRequisition.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!pr) {
        res.status(404).json({ success: false, message: 'Requisition not found' });
        return;
      }

      if (pr.status !== 'DRAFT') {
        res.status(400).json({ success: false, message: `Cannot submit requisition in status ${pr.status}` });
        return;
      }

      // Check if workflow exists for PURCHASE_REQUISITION
      const workflow = await prisma.approvalWorkflow.findUnique({
        where: { documentType: 'PURCHASE_REQUISITION' },
        include: { steps: { orderBy: { stepOrder: 'asc' } } },
      });

      let updatedPR;
      if (workflow && workflow.steps.length > 0) {
        // If initiator is already a Department Manager, departmental review is already endorsed by the department head.
        // Route directly to Finance Budget Authorization (FINANCE_APPROVER) so separation of duties is maintained.
        const isDeptManager = req.user!.roles?.includes('DEPARTMENT_MANAGER');
        const financeStep = workflow.steps.find((s) => s.approverRole === 'FINANCE_APPROVER');
        const assignedStep = (isDeptManager && financeStep) ? financeStep : workflow.steps[0];

        // Create approval instance
        const instance = await prisma.approvalInstance.create({
          data: {
            workflowId: workflow.id,
            documentType: 'PURCHASE_REQUISITION',
            documentId: pr.id,
            currentStepId: assignedStep.id,
            status: 'PENDING',
            initiatedById: req.user!.id,
          },
        });

        updatedPR = await prisma.purchaseRequisition.update({
          where: { id },
          data: { status: 'SUBMITTED' },
        });

        // Notify approver role
        await notifyUsersByRole(
          assignedStep.approverRole,
          `Pending Approval: ${pr.prNumber}`,
          `Purchase requisition ${pr.prNumber} is submitted for your review ($${pr.totalEstimatedCost.toFixed(2)}).`,
          '/approvals',
          'APPROVAL'
        );
      } else {
        // Auto-approve if no workflow configured
        updatedPR = await prisma.purchaseRequisition.update({
          where: { id },
          data: { status: 'APPROVED' },
        });
      }

      await logAudit({
        actorId: req.user!.id,
        action: 'SUBMIT',
        entity: 'PurchaseRequisition',
        entityId: pr.id,
        reference: pr.prNumber,
      });

      res.json({ success: true, data: updatedPR });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/procurement/orders
  static async listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orders = await prisma.purchaseOrder.findMany({
        include: {
          supplier: true,
          createdBy: { select: { id: true, username: true } },
          approvedBy: { select: { id: true, username: true } },
          items: { include: { product: true } },
          requisition: {
            select: {
              id: true,
              prNumber: true,
              status: true,
              totalEstimatedCost: true,
              requestedBy: { select: { username: true } },
            },
          },
          goodsReceipts: {
            include: {
              warehouse: { select: { id: true, name: true, code: true } },
              receivedBy: { select: { username: true } },
              items: {
                include: {
                  product: { select: { id: true, name: true, sku: true } },
                  putawayTasks: {
                    include: {
                      targetBin: { select: { id: true, code: true, name: true, binType: true } },
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: orders });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/procurement/orders
  static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createPOSchema.parse(req.body);
      const poNumber = `PO-${Date.now().toString().slice(-6)}`;
      const totalAmount = data.items.reduce((sum, item) => sum + item.orderedQty * item.unitPrice, 0);

      const po = await prisma.purchaseOrder.create({
        data: {
          poNumber,
          requisitionId: data.requisitionId || null,
          supplierId: data.supplierId,
          status: 'APPROVED', // Ready for goods receipt
          orderDate: new Date(),
          expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
          totalAmount,
          notes: data.notes,
          createdById: req.user!.id,
          approvedById: req.user!.id,
          items: {
            create: data.items.map((i) => ({
              productId: i.productId,
              orderedQty: i.orderedQty,
              receivedQty: 0,
              cancelledQty: 0,
              unitPrice: i.unitPrice,
              totalPrice: i.orderedQty * i.unitPrice,
            })),
          },
        },
        include: { items: { include: { product: true } }, supplier: true },
      });

      // If PR linked, mark PR as ORDERED
      if (data.requisitionId) {
        await prisma.purchaseRequisition.update({
          where: { id: data.requisitionId },
          data: { status: 'ORDERED' },
        });
      }

      await logAudit({
        actorId: req.user!.id,
        action: 'CREATE',
        entity: 'PurchaseOrder',
        entityId: po.id,
        reference: po.poNumber,
        afterValue: po,
      });

      res.status(201).json({ success: true, data: po });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/procurement/departments
  static async listDepartments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const departments = await prisma.department.findMany({
        orderBy: { name: 'asc' },
      });
      res.json({ success: true, data: departments });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/procurement/suppliers
  static async listSuppliers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { isActive: true },
        include: { contacts: true },
        orderBy: { name: 'asc' },
      });
      res.json({ success: true, data: suppliers });
    } catch (err) {
      next(err);
    }
  }
}

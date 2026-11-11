import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../shared/prisma';
import { logAudit } from '../../shared/audit';
import { createNotification } from '../../shared/notification';

const createGRNSchema = z.object({
  purchaseOrderId: z.string().uuid().optional(),
  supplierId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  remarks: z.string().optional(),
  items: z.array(
    z.object({
      poItemId: z.string().uuid().optional(),
      productId: z.string().uuid(),
      deliveredQty: z.number().positive(),
      acceptedQty: z.number().nonnegative(),
      damagedQty: z.number().nonnegative().default(0),
      rejectedQty: z.number().nonnegative().default(0),
      batchNumber: z.string().optional(),
      targetBinId: z.string().uuid().optional(), // If putaway assigned directly
      remarks: z.string().optional(),
    })
  ).min(1),
});

const confirmPutawaySchema = z.object({
  targetBinId: z.string().uuid(),
  quantity: z.number().positive().optional(),
});

export class ReceivingController {
  // GET /api/goods-receipts
  static async listReceipts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const receipts = await prisma.goodsReceipt.findMany({
        include: {
          purchaseOrder: true,
          supplier: true,
          warehouse: true,
          receivedBy: { select: { id: true, username: true } },
          items: {
            include: {
              product: { include: { uom: true } },
              putawayTasks: { include: { targetBin: true, assignedTo: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: receipts });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/goods-receipts
  static async createReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createGRNSchema.parse(req.body);
      const grnNumber = `GRN-${Date.now().toString().slice(-6)}`;

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create Goods Receipt
        const grn = await tx.goodsReceipt.create({
          data: {
            grnNumber,
            purchaseOrderId: data.purchaseOrderId || null,
            supplierId: data.supplierId,
            warehouseId: data.warehouseId,
            receivedById: req.user!.id,
            status: 'PUTAWAY_PENDING',
            remarks: data.remarks,
          },
        });

        // 2. Create Receipt Items and Putaway tasks
        for (const item of data.items) {
          // Resolve poItemId if purchaseOrderId is linked and poItemId was not directly supplied
          let resolvedPoItemId = item.poItemId;
          if (!resolvedPoItemId && data.purchaseOrderId) {
            const poItem = await tx.purchaseOrderItem.findFirst({
              where: {
                purchaseOrderId: data.purchaseOrderId,
                productId: item.productId,
              },
            });
            if (poItem) resolvedPoItemId = poItem.id;
          }

          const grnItem = await tx.goodsReceiptItem.create({
            data: {
              goodsReceiptId: grn.id,
              poItemId: resolvedPoItemId || null,
              productId: item.productId,
              deliveredQty: item.deliveredQty,
              acceptedQty: item.acceptedQty,
              damagedQty: item.damagedQty,
              rejectedQty: item.rejectedQty,
              batchNumber: item.batchNumber || null,
              remarks: item.remarks || null,
            },
          });

          // Update PO received quantity if PO item linked
          if (resolvedPoItemId) {
            await tx.purchaseOrderItem.update({
              where: { id: resolvedPoItemId },
              data: {
                receivedQty: { increment: item.acceptedQty },
              },
            });
          }

          // If accepted quantity > 0, generate Putaway task
          if (item.acceptedQty > 0) {
            // Find a valid storage bin if not specified
            let targetBinId = item.targetBinId;
            if (!targetBinId) {
              const defaultBin = await tx.warehouseBin.findFirst({
                where: { warehouseId: data.warehouseId, isActive: true },
              });
              if (defaultBin) targetBinId = defaultBin.id;
            }

            // Fallback to any active bin in the system if receiving warehouse has no bin configured yet
            if (!targetBinId) {
              const anyBin = await tx.warehouseBin.findFirst({
                where: { isActive: true },
              });
              if (anyBin) targetBinId = anyBin.id;
            }

            if (targetBinId) {
              await tx.putawayTask.create({
                data: {
                  goodsReceiptItemId: grnItem.id,
                  productId: item.productId,
                  quantity: item.acceptedQty,
                  targetBinId,
                  status: 'PENDING',
                  assignedToId: req.user!.id,
                },
              });
            }
          }
        }

        // Check if purchase order is completed and update status
        let linkedRequisition: any = null;
        if (data.purchaseOrderId) {
          const poItems = await tx.purchaseOrderItem.findMany({
            where: { purchaseOrderId: data.purchaseOrderId },
          });
          const allReceived = poItems.every((poi) => poi.receivedQty >= poi.orderedQty);
          const anyReceived = poItems.some((poi) => poi.receivedQty > 0);
          const poStatus = allReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : 'APPROVED';

          const updatedPo = await tx.purchaseOrder.update({
            where: { id: data.purchaseOrderId },
            data: { status: poStatus },
          });

          // Check and update linked Purchase Requisition
          if (updatedPo.requisitionId) {
            const linkedPos = await tx.purchaseOrder.findMany({
              where: { requisitionId: updatedPo.requisitionId },
            });
            const allPosReceived = linkedPos.length > 0 && linkedPos.every((po) => po.status === 'RECEIVED');
            const anyPosReceived = linkedPos.some((po) => po.status === 'RECEIVED' || po.status === 'PARTIALLY_RECEIVED');

            const prStatus = allPosReceived ? 'FULFILLED' : anyPosReceived ? 'PARTIALLY_FULFILLED' : 'ORDERED';
            linkedRequisition = await tx.purchaseRequisition.update({
              where: { id: updatedPo.requisitionId },
              data: { status: prStatus },
            });
          }
        }

        return { grn, linkedRequisition };
      });

      await logAudit({
        actorId: req.user!.id,
        action: 'CREATE',
        entity: 'GoodsReceipt',
        entityId: result.grn.id,
        reference: result.grn.grnNumber,
        afterValue: result.grn,
      });

      if (result.linkedRequisition) {
        await logAudit({
          actorId: req.user!.id,
          action: result.linkedRequisition.status === 'FULFILLED' ? 'FULFILL' : 'PARTIAL_RECEIPT',
          entity: 'PurchaseRequisition',
          entityId: result.linkedRequisition.id,
          reference: result.linkedRequisition.prNumber,
          afterValue: { status: result.linkedRequisition.status },
        });

        if (result.linkedRequisition.requestedById) {
          await createNotification({
            userId: result.linkedRequisition.requestedById,
            title: `Requisition ${result.linkedRequisition.status === 'FULFILLED' ? 'Fulfilled' : 'Updated'}: ${result.linkedRequisition.prNumber}`,
            message: `Shipment received at warehouse for requisition ${result.linkedRequisition.prNumber} (GRN ${result.grn.grnNumber}).`,
            type: 'SUCCESS',
            link: '/procurement',
          });
        }
      }

      res.status(201).json({ success: true, data: result.grn });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/putaway-tasks
  static async listPutawayTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tasks = await prisma.putawayTask.findMany({
        include: {
          product: { include: { uom: true } },
          targetBin: { include: { warehouse: true, rack: true } },
          assignedTo: { select: { id: true, username: true } },
          goodsReceiptItem: { include: { goodsReceipt: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: tasks });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/putaway-tasks/:id/confirm
  static async confirmPutaway(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const body = confirmPutawaySchema.parse(req.body);

      const task = await prisma.putawayTask.findUnique({
        where: { id },
        include: {
          product: { include: { uom: true } },
          goodsReceiptItem: { include: { goodsReceipt: true } },
          targetBin: true,
        },
      });

      if (!task) {
        res.status(404).json({ success: false, message: 'Putaway task not found' });
        return;
      }

      if (task.status === 'COMPLETED') {
        res.status(400).json({ success: false, message: 'Putaway task is already completed' });
        return;
      }

      const targetBinId = body.targetBinId || task.targetBinId;
      const quantity = body.quantity || task.quantity;

      const bin = await prisma.warehouseBin.findUnique({
        where: { id: targetBinId },
      });

      if (!bin || !bin.isActive) {
        res.status(400).json({ success: false, message: 'Selected target bin is invalid or inactive' });
        return;
      }

      // Execute atomic transaction: Update task -> Upsert stock balance -> Post stock movement to ledger
      const result = await prisma.$transaction(async (tx) => {
        // 1. Mark Putaway task as completed
        const updatedTask = await tx.putawayTask.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            targetBinId,
            completedAt: new Date(),
          },
        });

        // 2. Post to Stock Movement Ledger (atomic audit trail)
        const txnNumber = `TXN-GRN-${Date.now().toString().slice(-6)}`;
        const movement = await tx.stockMovement.create({
          data: {
            transactionNumber: txnNumber,
            productId: task.productId,
            destWarehouseId: bin.warehouseId,
            destBinId: bin.id,
            quantity,
            uomId: task.product.uomId,
            transactionType: 'RECEIPT',
            referenceType: 'GOODS_RECEIPT',
            referenceId: task.goodsReceiptItem.goodsReceipt.grnNumber,
            batchNumber: task.goodsReceiptItem.batchNumber,
            performedById: req.user!.id,
            notes: `Putaway confirmed for GRN ${task.goodsReceiptItem.goodsReceipt.grnNumber}`,
          },
        });

        // 3. Upsert Stock Balance consistently with ledger
        const balance = await tx.stockBalance.upsert({
          where: {
            productId_warehouseId_binId_batchNumber: {
              productId: task.productId,
              warehouseId: bin.warehouseId,
              binId: bin.id,
              batchNumber: task.goodsReceiptItem.batchNumber || '',
            },
          },
          update: {
            onHandQty: { increment: quantity },
            lastMovementAt: new Date(),
          },
          create: {
            productId: task.productId,
            warehouseId: bin.warehouseId,
            binId: bin.id,
            batchNumber: task.goodsReceiptItem.batchNumber || '',
            onHandQty: quantity,
            reservedQty: 0,
            damagedQty: 0,
            quarantinedQty: 0,
            inTransitQty: 0,
            lastMovementAt: new Date(),
          },
        });

        // Check if all putaway tasks for this GRN are completed
        const remainingTasks = await tx.putawayTask.count({
          where: {
            goodsReceiptItem: { goodsReceiptId: task.goodsReceiptItem.goodsReceiptId },
            status: { not: 'COMPLETED' },
          },
        });

        let fullyPutawayPo: any = null;
        if (remainingTasks === 0) {
          await tx.goodsReceipt.update({
            where: { id: task.goodsReceiptItem.goodsReceiptId },
            data: { status: 'COMPLETED' },
          });

          const poId = task.goodsReceiptItem.goodsReceipt.purchaseOrderId;
          if (poId) {
            const incompleteGrns = await tx.goodsReceipt.count({
              where: {
                purchaseOrderId: poId,
                status: { not: 'COMPLETED' },
              },
            });
            if (incompleteGrns === 0) {
              fullyPutawayPo = await tx.purchaseOrder.findUnique({
                where: { id: poId },
                include: { requisition: true },
              });
            }
          }
        }

        return { task: updatedTask, movement, balance, fullyPutawayPo };
      });

      await logAudit({
        actorId: req.user!.id,
        action: 'POST_LEDGER',
        entity: 'StockMovement',
        entityId: result.movement.id,
        reference: result.movement.transactionNumber,
        afterValue: {
          product: task.product.sku,
          quantity,
          destBin: bin.code,
          warehouseId: bin.warehouseId,
        },
      });

      if (result.fullyPutawayPo?.requisition?.requestedById) {
        await createNotification({
          userId: result.fullyPutawayPo.requisition.requestedById,
          title: `Stock Stored in Warehouse: ${result.fullyPutawayPo.requisition.prNumber}`,
          message: `Putaway completed for order ${result.fullyPutawayPo.poNumber}. Items are safely placed in warehouse bins and available for use.`,
          type: 'SUCCESS',
          link: '/procurement',
        });
      }

      res.json({
        success: true,
        message: 'Putaway completed and stock ledger posted successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

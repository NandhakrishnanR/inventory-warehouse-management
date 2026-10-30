import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../shared/prisma';
import { logAudit } from '../../shared/audit';

const createCountSchema = z.object({
  warehouseId: z.string().uuid(),
  zoneId: z.string().uuid().optional(),
  countType: z.enum(['CYCLE', 'FULL', 'SPOT']).default('CYCLE'),
  notes: z.string().optional(),
});

const submitCountCountsSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string().uuid(),
      countedQty: z.number().nonnegative(),
      reasonCode: z.enum(['DAMAGE', 'LOSS', 'SURPLUS', 'DATA_ENTRY']).optional(),
      notes: z.string().optional(),
    })
  ).min(1),
});

export class StockCountController {
  // GET /api/stock-counts
  static async listCounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const counts = await prisma.stockCount.findMany({
        include: {
          warehouse: true,
          zone: true,
          conductedBy: { select: { id: true, username: true } },
          approvedBy: { select: { id: true, username: true } },
          items: {
            include: { product: true, bin: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: counts });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/stock-counts (Initiates cycle count and snapshots system quantities)
  static async createCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createCountSchema.parse(req.body);
      const countNumber = `CNT-${Date.now().toString().slice(-6)}`;

      // Fetch existing balances in that warehouse/zone to snapshot system quantities
      const balances = await prisma.stockBalance.findMany({
        where: {
          warehouseId: data.warehouseId,
          ...(data.zoneId ? { bin: { rack: { zoneId: data.zoneId } } } : {}),
        },
        include: { product: true },
      });

      const count = await prisma.stockCount.create({
        data: {
          countNumber,
          warehouseId: data.warehouseId,
          zoneId: data.zoneId || null,
          countType: data.countType,
          status: 'IN_PROGRESS',
          plannedDate: new Date(),
          conductedById: req.user!.id,
          notes: data.notes,
          items: {
            create: balances.map((b) => ({
              productId: b.productId,
              binId: b.binId,
              systemQty: b.onHandQty,
              countedQty: b.onHandQty, // default to system until updated
              varianceQty: 0,
            })),
          },
        },
        include: { items: { include: { product: true, bin: true } } },
      });

      await logAudit({
        actorId: req.user!.id,
        action: 'CREATE',
        entity: 'StockCount',
        entityId: count.id,
        reference: count.countNumber,
        afterValue: count,
      });

      res.status(201).json({ success: true, data: count });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/stock-counts/:id/record-quantities
  static async recordQuantities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const body = submitCountCountsSchema.parse(req.body);

      const count = await prisma.stockCount.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!count) {
        res.status(404).json({ success: false, message: 'Stock count not found' });
        return;
      }

      await prisma.$transaction(async (tx) => {
        for (const itemInput of body.items) {
          const item = count.items.find((i) => i.id === itemInput.itemId);
          if (!item) continue;

          const varianceQty = itemInput.countedQty - item.systemQty;

          await tx.stockCountItem.update({
            where: { id: item.id },
            data: {
              countedQty: itemInput.countedQty,
              varianceQty,
              reasonCode: itemInput.reasonCode || (varianceQty > 0 ? 'SURPLUS' : varianceQty < 0 ? 'LOSS' : null),
              notes: itemInput.notes,
            },
          });
        }

        await tx.stockCount.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            conductedDate: new Date(),
          },
        });
      });

      const updated = await prisma.stockCount.findUnique({
        where: { id },
        include: { items: { include: { product: true, bin: true } } },
      });

      res.json({ success: true, message: 'Stock counts recorded', data: updated });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/stock-counts/:id/post-adjustments (Approved adjustment posted to ledger)
  static async postAdjustments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const count = await prisma.stockCount.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      });

      if (!count) {
        res.status(404).json({ success: false, message: 'Stock count not found' });
        return;
      }

      if (count.status !== 'COMPLETED') {
        res.status(400).json({ success: false, message: 'Stock count must be completed before posting adjustments' });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        const adjustmentNumber = `ADJ-${Date.now().toString().slice(-6)}`;

        // Post ledger movements for items with non-zero variance
        for (const item of count.items) {
          if (item.varianceQty === 0) continue;

          const isUp = item.varianceQty > 0;
          const absQty = Math.abs(item.varianceQty);

          // 1. Post to immutable stock movement ledger
          await tx.stockMovement.create({
            data: {
              transactionNumber: `TXN-ADJ-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
              productId: item.productId,
              sourceWarehouseId: !isUp ? count.warehouseId : null,
              sourceBinId: !isUp ? item.binId : null,
              destWarehouseId: isUp ? count.warehouseId : null,
              destBinId: isUp ? item.binId : null,
              quantity: absQty,
              uomId: item.product.uomId,
              transactionType: isUp ? 'ADJUSTMENT_UP' : 'ADJUSTMENT_DOWN',
              referenceType: 'STOCK_COUNT',
              referenceId: count.countNumber,
              performedById: req.user!.id,
              notes: `Stock count adjustment (${item.reasonCode || 'VARIANCE'}): System ${item.systemQty} vs Counted ${item.countedQty}`,
            },
          });

          // 2. Adjust stock balance
          await tx.stockBalance.upsert({
            where: {
              productId_warehouseId_binId_batchNumber: {
                productId: item.productId,
                warehouseId: count.warehouseId,
                binId: item.binId || '',
                batchNumber: '',
              },
            },
            update: {
              onHandQty: item.countedQty,
              lastMovementAt: new Date(),
            },
            create: {
              productId: item.productId,
              warehouseId: count.warehouseId,
              binId: item.binId,
              batchNumber: '',
              onHandQty: item.countedQty,
              reservedQty: 0,
              damagedQty: 0,
              quarantinedQty: 0,
              inTransitQty: 0,
            },
          });
        }

        // Create adjustment record
        await tx.stockAdjustment.create({
          data: {
            adjustmentNumber,
            stockCountId: count.id,
            warehouseId: count.warehouseId,
            status: 'POSTED',
            requestedById: req.user!.id,
            approvedById: req.user!.id,
            adjustmentDate: new Date(),
            reason: `Variance reconciliation for ${count.countNumber}`,
          },
        });

        // Mark count as APPROVED
        return await tx.stockCount.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedById: req.user!.id,
          },
        });
      });

      await logAudit({
        actorId: req.user!.id,
        action: 'POST_LEDGER',
        entity: 'StockAdjustment',
        entityId: count.id,
        reference: count.countNumber,
      });

      res.json({
        success: true,
        message: 'Adjustments successfully posted to stock ledger and balances reconciled',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../shared/prisma';
import { logAudit } from '../../shared/audit';

const createIssueSchema = z.object({
  departmentId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  materialRequestId: z.string().uuid().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      binId: z.string().uuid(),
      quantity: z.number().positive(),
      batchNumber: z.string().optional(),
    })
  ).min(1),
});

const manualReceiptSchema = z.object({
  warehouseId: z.string().uuid(),
  binId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  batchNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
});

export class InventoryController {
  // GET /api/stock-balances
  static async listBalances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { warehouseId, productId, binId } = req.query;

      const whereClause: any = {};
      if (warehouseId) whereClause.warehouseId = String(warehouseId);
      if (productId) whereClause.productId = String(productId);
      if (binId) whereClause.binId = String(binId);

      const balances = await prisma.stockBalance.findMany({
        where: whereClause,
        include: {
          product: { include: { uom: true, category: true } },
          warehouse: { include: { site: true } },
          bin: { include: { rack: { include: { zone: true } } } },
        },
        orderBy: [{ warehouse: { code: 'asc' } }, { product: { name: 'asc' } }],
      });

      const enriched = balances.map((b) => ({
        ...b,
        availableQty: Math.max(0, b.onHandQty - b.reservedQty - b.damagedQty - b.quarantinedQty),
      }));

      res.json({ success: true, data: enriched });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/stock-movements (The immutable ledger)
  static async listMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId, warehouseId, transactionType, limit = '50', page = '1' } = req.query;

      const whereClause: any = {};
      if (productId) whereClause.productId = String(productId);
      if (transactionType) whereClause.transactionType = String(transactionType);
      if (warehouseId) {
        whereClause.OR = [
          { sourceWarehouseId: String(warehouseId) },
          { destWarehouseId: String(warehouseId) },
        ];
      }

      const take = parseInt(String(limit), 10);
      const skip = (parseInt(String(page), 10) - 1) * take;

      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where: whereClause,
          include: {
            product: { include: { uom: true } },
            sourceWarehouse: true,
            sourceBin: true,
            destWarehouse: true,
            destBin: true,
            performedBy: { select: { id: true, username: true } },
          },
          orderBy: { createdAt: 'desc' },
          take,
          skip,
        }),
        prisma.stockMovement.count({ where: whereClause }),
      ]);

      res.json({
        success: true,
        data: movements,
        pagination: {
          total,
          page: parseInt(String(page), 10),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/inventory/direct-receipt (Controlled initial/direct ledger intake)
  static async postDirectReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = manualReceiptSchema.parse(req.body);

      const product = await prisma.product.findUnique({
        where: { id: body.productId },
        include: { uom: true },
      });

      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      const bin = await prisma.warehouseBin.findUnique({
        where: { id: body.binId },
      });

      if (!bin || !bin.isActive || bin.warehouseId !== body.warehouseId) {
        res.status(400).json({ success: false, message: 'Invalid or inactive storage bin' });
        return;
      }

      const txnNumber = `TXN-REC-${Date.now().toString().slice(-6)}`;

      // Atomic database transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Post to Stock Movement Ledger
        const movement = await tx.stockMovement.create({
          data: {
            transactionNumber: txnNumber,
            productId: body.productId,
            destWarehouseId: body.warehouseId,
            destBinId: body.binId,
            quantity: body.quantity,
            uomId: product.uomId,
            transactionType: 'RECEIPT',
            referenceType: 'MANUAL',
            referenceId: `DIR-${Date.now().toString().slice(-4)}`,
            batchNumber: body.batchNumber || null,
            serialNumber: body.serialNumber || null,
            performedById: req.user!.id,
            notes: body.notes || 'Direct controlled inventory intake',
          },
        });

        // 2. Consistent Stock Balance update
        const balance = await tx.stockBalance.upsert({
          where: {
            productId_warehouseId_binId_batchNumber: {
              productId: body.productId,
              warehouseId: body.warehouseId,
              binId: body.binId,
              batchNumber: body.batchNumber || '',
            },
          },
          update: {
            onHandQty: { increment: body.quantity },
            lastMovementAt: new Date(),
          },
          create: {
            productId: body.productId,
            warehouseId: body.warehouseId,
            binId: body.binId,
            batchNumber: body.batchNumber || '',
            onHandQty: body.quantity,
            reservedQty: 0,
            damagedQty: 0,
            quarantinedQty: 0,
            inTransitQty: 0,
            lastMovementAt: new Date(),
          },
        });

        return { movement, balance };
      });

      await logAudit({
        actorId: req.user!.id,
        action: 'POST_LEDGER',
        entity: 'StockMovement',
        entityId: result.movement.id,
        reference: result.movement.transactionNumber,
        afterValue: {
          product: product.sku,
          quantity: body.quantity,
          warehouseId: body.warehouseId,
          binId: body.binId,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Receipt posted directly to ledger with consistent balance update',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/stock-issues (Departmental material consumption with strict concurrency validation)
  static async issueStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createIssueSchema.parse(req.body);
      const issueNumber = `ISS-${Date.now().toString().slice(-6)}`;

      const result = await prisma.$transaction(async (tx) => {
        // Validate stock availability in each bin first
        for (const item of data.items) {
          const balance = await tx.stockBalance.findUnique({
            where: {
              productId_warehouseId_binId_batchNumber: {
                productId: item.productId,
                warehouseId: data.warehouseId,
                binId: item.binId,
                batchNumber: item.batchNumber || '',
              },
            },
          });

          const available = (balance?.onHandQty || 0) - (balance?.reservedQty || 0) - (balance?.damagedQty || 0) - (balance?.quarantinedQty || 0);

          if (!balance || available < item.quantity) {
            throw new Error(`Insufficient available stock for item in selected bin. Available: ${available}, Requested: ${item.quantity}`);
          }
        }

        // 1. Create Stock Issue record
        const stockIssue = await tx.stockIssue.create({
          data: {
            issueNumber,
            materialRequestId: data.materialRequestId || null,
            departmentId: data.departmentId,
            warehouseId: data.warehouseId,
            issuedById: req.user!.id,
            status: 'COMPLETED',
            notes: data.notes,
            items: {
              create: data.items.map((i) => ({
                productId: i.productId,
                binId: i.binId,
                quantity: i.quantity,
                batchNumber: i.batchNumber || null,
              })),
            },
          },
        });

        // 2. Post movements and update balances
        for (const item of data.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          await tx.stockMovement.create({
            data: {
              transactionNumber: `TXN-ISS-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
              productId: item.productId,
              sourceWarehouseId: data.warehouseId,
              sourceBinId: item.binId,
              quantity: item.quantity,
              uomId: product!.uomId,
              transactionType: 'ISSUE',
              referenceType: 'MATERIAL_REQUEST',
              referenceId: stockIssue.issueNumber,
              batchNumber: item.batchNumber || null,
              performedById: req.user!.id,
              notes: `Departmental stock issue ${stockIssue.issueNumber}`,
            },
          });

          // Decrement stock balance atomically
          await tx.stockBalance.update({
            where: {
              productId_warehouseId_binId_batchNumber: {
                productId: item.productId,
                warehouseId: data.warehouseId,
                binId: item.binId,
                batchNumber: item.batchNumber || '',
              },
            },
            data: {
              onHandQty: { decrement: item.quantity },
              lastMovementAt: new Date(),
            },
          });
        }

        return stockIssue;
      });

      await logAudit({
        actorId: req.user!.id,
        action: 'POST_LEDGER',
        entity: 'StockIssue',
        entityId: result.id,
        reference: result.issueNumber,
        afterValue: result,
      });

      res.status(201).json({
        success: true,
        message: 'Material issued successfully and recorded in stock ledger',
        data: result,
      });
    } catch (err: any) {
      if (err.message && err.message.includes('Insufficient available stock')) {
        res.status(400).json({ success: false, message: err.message });
        return;
      }
      next(err);
    }
  }

  // GET /api/stock-issues
  static async listIssues(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const issues = await prisma.stockIssue.findMany({
        include: {
          department: true,
          warehouse: true,
          issuedBy: { select: { id: true, username: true } },
          items: {
            include: { product: true, bin: true },
          },
        },
        orderBy: { issuedDate: 'desc' },
      });
      res.json({ success: true, data: issues });
    } catch (err) {
      next(err);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../shared/prisma';
import { logAudit } from '../../shared/audit';

const createTransferSchema = z.object({
  sourceWarehouseId: z.string().uuid(),
  destWarehouseId: z.string().uuid(),
  reason: z.string().min(3),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      sourceBinId: z.string().uuid().optional(),
      destBinId: z.string().uuid().optional(),
      requestedQty: z.number().positive(),
      batchNumber: z.string().optional(),
    })
  ).min(1),
});

const dispatchSchema = z.object({
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  notes: z.string().optional(),
});

const receiveSchema = z.object({
  notes: z.string().optional(),
  items: z.array(
    z.object({
      itemId: z.string().uuid(),
      receivedQty: z.number().nonnegative(),
      destBinId: z.string().uuid(),
    })
  ).min(1),
});

export class TransferController {
  // GET /api/stock-transfers
  static async listTransfers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, warehouseId } = req.query;

      const whereClause: any = {};
      if (status) whereClause.status = String(status);
      if (warehouseId) {
        whereClause.OR = [
          { sourceWarehouseId: String(warehouseId) },
          { destWarehouseId: String(warehouseId) },
        ];
      }

      const transfers = await prisma.stockTransfer.findMany({
        where: whereClause,
        include: {
          sourceWarehouse: true,
          destWarehouse: true,
          requestedBy: { select: { id: true, username: true } },
          approvedBy: { select: { id: true, username: true } },
          dispatches: { include: { dispatchedBy: { select: { id: true, username: true } } } },
          receipts: { include: { receivedBy: { select: { id: true, username: true } } } },
          items: {
            include: {
              product: { include: { uom: true } },
              sourceBin: true,
              destBin: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: transfers });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/stock-transfers (Create draft/submitted transfer)
  static async createTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createTransferSchema.parse(req.body);

      // Validate source and destination warehouses are different
      if (data.sourceWarehouseId === data.destWarehouseId) {
        res.status(400).json({
          success: false,
          message: 'Source warehouse and destination warehouse cannot be the same facility.',
        });
        return;
      }

      const transferNumber = `TRF-${Date.now().toString().slice(-6)}`;

      // Validate source stock availability and resolve bin/batch
      const itemsToCreate = [];
      for (const item of data.items) {
        let balance: any = null;

        if (item.sourceBinId) {
          balance = await prisma.stockBalance.findFirst({
            where: {
              productId: item.productId,
              warehouseId: data.sourceWarehouseId,
              binId: item.sourceBinId,
              ...(item.batchNumber ? { batchNumber: item.batchNumber } : {}),
              onHandQty: { gt: 0 },
            },
            orderBy: { onHandQty: 'desc' },
          });

          if (!balance) {
            balance = await prisma.stockBalance.findFirst({
              where: {
                productId: item.productId,
                warehouseId: data.sourceWarehouseId,
                binId: item.sourceBinId,
              },
              orderBy: { onHandQty: 'desc' },
            });
          }
        } else {
          balance = await prisma.stockBalance.findFirst({
            where: {
              productId: item.productId,
              warehouseId: data.sourceWarehouseId,
              ...(item.batchNumber ? { batchNumber: item.batchNumber } : {}),
              onHandQty: { gte: item.requestedQty },
            },
            orderBy: { onHandQty: 'desc' },
          });

          if (!balance) {
            balance = await prisma.stockBalance.findFirst({
              where: {
                productId: item.productId,
                warehouseId: data.sourceWarehouseId,
                onHandQty: { gt: 0 },
              },
              orderBy: { onHandQty: 'desc' },
            });
          }
        }

        const available = (balance?.onHandQty || 0) - (balance?.reservedQty || 0);
        if (!balance || available < item.requestedQty) {
          res.status(400).json({
            success: false,
            message: `Insufficient available stock in source location for item. Available: ${available}, Requested: ${item.requestedQty}`,
          });
          return;
        }

        itemsToCreate.push({
          productId: item.productId,
          sourceBinId: item.sourceBinId || balance.binId || null,
          destBinId: item.destBinId || null,
          requestedQty: item.requestedQty,
          dispatchedQty: 0,
          receivedQty: 0,
          batchNumber: item.batchNumber || balance.batchNumber || null,
        });
      }

      const transfer = await prisma.stockTransfer.create({
        data: {
          transferNumber,
          sourceWarehouseId: data.sourceWarehouseId,
          destWarehouseId: data.destWarehouseId,
          status: 'APPROVED', // Auto-approved for operational demo; can also link to approval workflow
          requestedById: req.user!.id,
          approvedById: req.user!.id,
          reason: data.reason,
          notes: data.notes,
          items: {
            create: itemsToCreate,
          },
        },
        include: { items: { include: { product: true } } },
      });

      await logAudit({
        actorId: req.user!.id,
        action: 'CREATE',
        entity: 'StockTransfer',
        entityId: transfer.id,
        reference: transfer.transferNumber,
        afterValue: transfer,
      });

      res.status(201).json({ success: true, data: transfer });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/stock-transfers/:id/dispatch (Dispatches stock: deducts from source and marks IN_TRANSIT)
  static async dispatchTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const body = dispatchSchema.parse(req.body);

      const transfer = await prisma.stockTransfer.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      });

      if (!transfer) {
        res.status(404).json({ success: false, message: 'Transfer not found' });
        return;
      }

      if (transfer.status !== 'APPROVED') {
        res.status(400).json({ success: false, message: `Cannot dispatch transfer in status ${transfer.status}` });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        // Record dispatch metadata
        await tx.transferDispatch.create({
          data: {
            stockTransferId: transfer.id,
            dispatchedById: req.user!.id,
            trackingNumber: body.trackingNumber,
            carrier: body.carrier,
            notes: body.notes,
          },
        });

        // Deduct source stock and post TRANSFER_OUT movement to ledger
        for (const item of transfer.items) {
          let sourceBinId = item.sourceBinId;
          let batchNumber = item.batchNumber;

          // Find the exact balance record in source warehouse/bin to deduct from
          let sourceBal: any = null;

          if (sourceBinId) {
            // First try matching specific bin with batchNumber (if known) and available stock
            if (batchNumber) {
              sourceBal = await tx.stockBalance.findFirst({
                where: {
                  productId: item.productId,
                  warehouseId: transfer.sourceWarehouseId,
                  binId: sourceBinId,
                  batchNumber,
                  onHandQty: { gte: item.requestedQty },
                },
              });
            }

            // If not found with batchNumber, find any balance in this specific bin with sufficient stock
            if (!sourceBal) {
              sourceBal = await tx.stockBalance.findFirst({
                where: {
                  productId: item.productId,
                  warehouseId: transfer.sourceWarehouseId,
                  binId: sourceBinId,
                  onHandQty: { gte: item.requestedQty },
                },
                orderBy: { onHandQty: 'desc' },
              });
            }

            // Fallback: any balance in this specific bin
            if (!sourceBal) {
              sourceBal = await tx.stockBalance.findFirst({
                where: {
                  productId: item.productId,
                  warehouseId: transfer.sourceWarehouseId,
                  binId: sourceBinId,
                },
                orderBy: { onHandQty: 'desc' },
              });
            }
          }

          // If sourceBinId was not specified or no record in specified bin, find across source warehouse
          if (!sourceBal) {
            sourceBal = await tx.stockBalance.findFirst({
              where: {
                productId: item.productId,
                warehouseId: transfer.sourceWarehouseId,
                onHandQty: { gte: item.requestedQty },
              },
              orderBy: { onHandQty: 'desc' },
            });
          }

          // Ultimate warehouse fallback
          if (!sourceBal) {
            sourceBal = await tx.stockBalance.findFirst({
              where: {
                productId: item.productId,
                warehouseId: transfer.sourceWarehouseId,
              },
              orderBy: { onHandQty: 'desc' },
            });
          }

          if (sourceBal) {
            // Deduct from the exact stock balance by primary key id!
            await tx.stockBalance.update({
              where: { id: sourceBal.id },
              data: {
                onHandQty: { decrement: item.requestedQty },
                lastMovementAt: new Date(),
              },
            });

            sourceBinId = sourceBal.binId;
            batchNumber = item.batchNumber || sourceBal.batchNumber;
          }

          // Post to ledger: TRANSFER_OUT
          await tx.stockMovement.create({
            data: {
              transactionNumber: `TXN-TRF-OUT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
              productId: item.productId,
              sourceWarehouseId: transfer.sourceWarehouseId,
              sourceBinId: sourceBinId || null,
              destWarehouseId: transfer.destWarehouseId,
              quantity: item.requestedQty,
              uomId: item.product.uomId,
              transactionType: 'TRANSFER_OUT',
              referenceType: 'STOCK_TRANSFER',
              referenceId: transfer.transferNumber,
              batchNumber: batchNumber || null,
              performedById: req.user!.id,
              notes: `Dispatched in transfer ${transfer.transferNumber}`,
            },
          });

          // Update transfer item dispatched quantity
          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: {
              dispatchedQty: item.requestedQty,
              status: 'DISPATCHED',
              sourceBinId: sourceBinId || null,
              batchNumber: batchNumber || null,
            },
          });
        }

        // Update transfer status to IN_TRANSIT
        return await tx.stockTransfer.update({
          where: { id },
          data: { status: 'IN_TRANSIT' },
          include: { items: true },
        });
      });

      await logAudit({
        actorId: req.user!.id,
        action: 'DISPATCH',
        entity: 'StockTransfer',
        entityId: transfer.id,
        reference: transfer.transferNumber,
      });

      res.json({
        success: true,
        message: 'Stock dispatched and in transit to destination warehouse',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/stock-transfers/:id/receive (Destination receiving with discrepancy recording)
  static async receiveTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const body = receiveSchema.parse(req.body);

      const transfer = await prisma.stockTransfer.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      });

      if (!transfer) {
        res.status(404).json({ success: false, message: 'Transfer not found' });
        return;
      }

      if (transfer.status !== 'IN_TRANSIT') {
        res.status(400).json({ success: false, message: `Cannot receive transfer in status ${transfer.status}` });
        return;
      }

      const result = await prisma.$transaction(async (tx) => {
        let hasDiscrepancy = false;

        for (const itemRecv of body.items) {
          const item = transfer.items.find((i) => i.id === itemRecv.itemId);
          if (!item) continue;

          const discrepancyQty = item.dispatchedQty - itemRecv.receivedQty;
          if (discrepancyQty !== 0) {
            hasDiscrepancy = true;
          }

          // Update item receipt
          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: {
              receivedQty: itemRecv.receivedQty,
              discrepancyQty,
              destBinId: itemRecv.destBinId,
              status: discrepancyQty === 0 ? 'RECEIVED' : 'DISCREPANCY',
            },
          });

          // If receivedQty > 0, post TRANSFER_IN to ledger and increment destination balance
          if (itemRecv.receivedQty > 0) {
            await tx.stockMovement.create({
              data: {
                transactionNumber: `TXN-TRF-IN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
                productId: item.productId,
                sourceWarehouseId: transfer.sourceWarehouseId,
                destWarehouseId: transfer.destWarehouseId,
                destBinId: itemRecv.destBinId,
                quantity: itemRecv.receivedQty,
                uomId: item.product.uomId,
                transactionType: 'TRANSFER_IN',
                referenceType: 'STOCK_TRANSFER',
                referenceId: transfer.transferNumber,
                batchNumber: item.batchNumber,
                performedById: req.user!.id,
                notes: `Destination received for ${transfer.transferNumber}${discrepancyQty > 0 ? ` (Shortage: ${discrepancyQty})` : ''}`,
              },
            });

            // Upsert destination stock balance
            const targetBatch = item.batchNumber || '';
            const existingDestBal = await tx.stockBalance.findFirst({
              where: {
                productId: item.productId,
                warehouseId: transfer.destWarehouseId,
                binId: itemRecv.destBinId,
                OR: [
                  { batchNumber: targetBatch },
                  { batchNumber: item.batchNumber || null },
                  ...(targetBatch === '' ? [{ batchNumber: null }] : []),
                ],
              },
            });

            if (existingDestBal) {
              await tx.stockBalance.update({
                where: { id: existingDestBal.id },
                data: {
                  onHandQty: { increment: itemRecv.receivedQty },
                  lastMovementAt: new Date(),
                },
              });
            } else {
              await tx.stockBalance.create({
                data: {
                  productId: item.productId,
                  warehouseId: transfer.destWarehouseId,
                  binId: itemRecv.destBinId,
                  batchNumber: targetBatch,
                  onHandQty: itemRecv.receivedQty,
                  reservedQty: 0,
                  damagedQty: 0,
                  quarantinedQty: 0,
                  inTransitQty: 0,
                  lastMovementAt: new Date(),
                },
              });
            }
          }
        }

        // Record destination receipt note
        await tx.transferReceipt.create({
          data: {
            stockTransferId: transfer.id,
            receivedById: req.user!.id,
            notes: body.notes,
            hasDiscrepancy,
          },
        });

        // Update transfer status
        return await tx.stockTransfer.update({
          where: { id },
          data: { status: hasDiscrepancy ? 'PARTIALLY_RECEIVED' : 'RECEIVED' },
          include: { items: true },
        });
      });

      await logAudit({
        actorId: req.user!.id,
        action: 'RECEIVE',
        entity: 'StockTransfer',
        entityId: transfer.id,
        reference: transfer.transferNumber,
        afterValue: result,
      });

      res.json({
        success: true,
        message: 'Destination goods received, balances updated, and discrepancy logged',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

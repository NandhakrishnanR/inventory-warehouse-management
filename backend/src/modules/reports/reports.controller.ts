import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../shared/prisma';

export class ReportsController {
  // GET /api/reports/stock-summary (Location & category aggregations)
  static async getStockSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [balances, totalProducts, lowStockProducts, outOfStockProducts] = await Promise.all([
        prisma.stockBalance.findMany({
          include: {
            product: { include: { category: true } },
            warehouse: { include: { site: { include: { city: true } } } },
          },
        }),
        prisma.product.count({ where: { productStatus: 'ACTIVE' } }),
        prisma.product.count({
          where: {
            stockBalances: {
              none: { onHandQty: { gt: 10 } },
            },
          },
        }),
        prisma.product.count({
          where: {
            stockBalances: {
              none: { onHandQty: { gt: 0 } },
            },
          },
        }),
      ]);

      let totalStockQuantity = 0;
      let totalStockValuation = 0;
      const byCity: Record<string, number> = {};
      const byWarehouse: Record<string, number> = {};
      const byCategory: Record<string, number> = {};

      for (const b of balances) {
        totalStockQuantity += b.onHandQty;
        const val = b.onHandQty * (b.product.costPrice || 0);
        totalStockValuation += val;

        const cityName = b.warehouse.site.city.name;
        byCity[cityName] = (byCity[cityName] || 0) + b.onHandQty;

        const whName = b.warehouse.name;
        byWarehouse[whName] = (byWarehouse[whName] || 0) + b.onHandQty;

        const catName = b.product.category?.name || 'Uncategorized';
        byCategory[catName] = (byCategory[catName] || 0) + b.onHandQty;
      }

      // Counts for pending actions
      const [pendingApprovals, pendingReceipts, transfersInTransit] = await Promise.all([
        prisma.approvalInstance.count({ where: { status: 'PENDING' } }),
        prisma.goodsReceipt.count({ where: { status: 'PUTAWAY_PENDING' } }),
        prisma.stockTransfer.count({ where: { status: 'IN_TRANSIT' } }),
      ]);

      res.json({
        success: true,
        data: {
          metrics: {
            totalProducts,
            totalStockQuantity,
            totalStockValuation: Math.round(totalStockValuation * 100) / 100,
            lowStockProducts,
            outOfStockProducts,
            pendingApprovals,
            pendingReceipts,
            transfersInTransit,
          },
          breakdowns: {
            byCity,
            byWarehouse,
            byCategory,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/reports/valuation
  static async getValuationReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const products = await prisma.product.findMany({
        include: {
          category: true,
          uom: true,
          stockBalances: {
            include: { warehouse: true },
          },
        },
      });

      const report = products.map((p) => {
        const totalQty = p.stockBalances.reduce((sum, b) => sum + b.onHandQty, 0);
        const valuation = totalQty * p.costPrice;
        return {
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category.name,
          uom: p.uom.symbol,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          totalQty,
          valuation: Math.round(valuation * 100) / 100,
        };
      });

      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/reports/audit-logs
  static async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { entity, action, limit = '100' } = req.query;

      const whereClause: any = {};
      if (entity) whereClause.entity = String(entity);
      if (action) whereClause.action = String(action);

      const logs = await prisma.auditLog.findMany({
        where: whereClause,
        include: {
          actor: { select: { id: true, username: true, email: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: parseInt(String(limit), 10),
      });

      res.json({ success: true, data: logs });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/reports/notifications
  static async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      res.json({ success: true, data: notifications });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/reports/notifications/:id/read
  static async markNotificationRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.notification.updateMany({
        where: { id, userId: req.user!.id },
        data: { isRead: true },
      });
      res.json({ success: true, message: 'Notification marked as read' });
    } catch (err) {
      next(err);
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../shared/prisma';
import { logAudit } from '../../shared/audit';

const createProductSchema = z.object({
  sku: z.string().min(2).max(50),
  barcode: z.string().optional().nullable(),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  categoryId: z.string().uuid(),
  uomId: z.string().uuid(),
  brand: z.string().optional().nullable(),
  minStock: z.number().nonnegative().default(0),
  maxStock: z.number().positive().default(1000),
  reorderLevel: z.number().nonnegative().default(10),
  isBatchTracked: z.boolean().default(false),
  isSerialTracked: z.boolean().default(false),
  costPrice: z.number().nonnegative().default(0),
  sellingPrice: z.number().nonnegative().default(0),
});

export class ProductController {
  // GET /api/products
  static async listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { categoryId, search, status, lowStockOnly } = req.query;

      const whereClause: any = {};
      if (categoryId) whereClause.categoryId = String(categoryId);
      if (status) whereClause.productStatus = String(status);
      if (search) {
        whereClause.OR = [
          { sku: { contains: String(search), mode: 'insensitive' } },
          { name: { contains: String(search), mode: 'insensitive' } },
          { barcode: { contains: String(search), mode: 'insensitive' } },
        ];
      }

      const products = await prisma.product.findMany({
        where: whereClause,
        include: {
          category: true,
          uom: true,
          stockBalances: {
            include: { warehouse: true, bin: true },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Calculate total stock and low stock indicator
      const enriched = products.map((p) => {
        const totalOnHand = p.stockBalances.reduce((sum, b) => sum + b.onHandQty, 0);
        const totalReserved = p.stockBalances.reduce((sum, b) => sum + b.reservedQty, 0);
        const totalAvailable = Math.max(0, totalOnHand - totalReserved);
        const isLowStock = totalOnHand <= p.reorderLevel;
        const isOutOfStock = totalOnHand === 0;

        return {
          ...p,
          totalOnHand,
          totalReserved,
          totalAvailable,
          isLowStock,
          isOutOfStock,
        };
      });

      const filtered = lowStockOnly === 'true' ? enriched.filter((p) => p.isLowStock) : enriched;

      res.json({ success: true, data: filtered });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/products/:id
  static async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          uom: true,
          barcodes: true,
          stockBalances: {
            include: { warehouse: true, bin: true },
          },
          stockLots: true,
          serialNumbers: true,
        },
      });

      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      const totalOnHand = product.stockBalances.reduce((sum, b) => sum + b.onHandQty, 0);
      const totalReserved = product.stockBalances.reduce((sum, b) => sum + b.reservedQty, 0);

      res.json({
        success: true,
        data: {
          ...product,
          totalOnHand,
          totalReserved,
          totalAvailable: Math.max(0, totalOnHand - totalReserved),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/products
  static async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createProductSchema.parse(req.body);
      const product = await prisma.product.create({
        data,
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'CREATE',
        entity: 'Product',
        entityId: product.id,
        reference: product.sku,
        afterValue: product,
      });

      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/products/categories
  static async listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await prisma.productCategory.findMany({
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' },
      });
      res.json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/products/units
  static async listUnits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const units = await prisma.unitOfMeasure.findMany({
        orderBy: { name: 'asc' },
      });
      res.json({ success: true, data: units });
    } catch (err) {
      next(err);
    }
  }
}

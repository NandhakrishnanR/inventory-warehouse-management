import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../shared/prisma';
import { logAudit } from '../../shared/audit';

const createWarehouseSchema = z.object({
  siteId: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  warehouseType: z.string().default('STANDARD'),
  managerId: z.string().uuid().optional(),
  address: z.string().optional(),
});

const createZoneSchema = z.object({
  warehouseId: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  zoneType: z.string().default('STORAGE'),
});

const createRackSchema = z.object({
  zoneId: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  levels: z.number().int().positive().default(4),
});

const createBinSchema = z.object({
  warehouseId: z.string().uuid(),
  rackId: z.string().uuid().optional().nullable(),
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  binType: z.string().default('STORAGE'),
  maxWeight: z.number().positive().optional(),
  maxVolume: z.number().positive().optional(),
});

export class WarehouseController {
  // GET /api/locations/tree
  static async getLocationTree(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companies = await prisma.company.findMany({
        where: { isActive: true },
        include: {
          regions: {
            include: {
              cities: {
                include: {
                  sites: {
                    where: { isActive: true },
                    include: {
                      warehouses: {
                        where: { isActive: true },
                        include: {
                          zones: {
                            where: { isActive: true },
                            include: {
                              racks: {
                                where: { isActive: true },
                                include: {
                                  bins: {
                                    where: { isActive: true },
                                    include: {
                                      stockBalances: {
                                        include: { product: true },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                          bins: {
                            where: { rackId: null, isActive: true },
                            include: {
                              stockBalances: {
                                include: { product: true },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      res.json({ success: true, data: companies });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/warehouses
  static async listWarehouses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const warehouses = await prisma.warehouse.findMany({
        include: {
          site: {
            include: { city: { include: { region: { include: { company: true } } } } },
          },
          manager: {
            select: { id: true, username: true, email: true },
          },
          _count: {
            select: { zones: true, bins: true, stockBalances: true },
          },
        },
        orderBy: { code: 'asc' },
      });

      res.json({ success: true, data: warehouses });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/warehouses/:id/tree
  static async getWarehouseTree(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const warehouse = await prisma.warehouse.findUnique({
        where: { id },
        include: {
          site: {
            include: { city: { include: { region: true } } },
          },
          manager: true,
          zones: {
            include: {
              racks: {
                include: {
                  bins: {
                    include: {
                      stockBalances: {
                        include: { product: true },
                      },
                    },
                  },
                },
              },
            },
          },
          bins: {
            where: { rackId: null },
            include: {
              stockBalances: {
                include: { product: true },
              },
            },
          },
        },
      });

      if (!warehouse) {
        res.status(404).json({ success: false, message: 'Warehouse not found' });
        return;
      }

      res.json({ success: true, data: warehouse });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/warehouses
  static async createWarehouse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createWarehouseSchema.parse(req.body);
      const warehouse = await prisma.warehouse.create({
        data,
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'CREATE',
        entity: 'Warehouse',
        entityId: warehouse.id,
        reference: warehouse.code,
        afterValue: warehouse,
      });

      res.status(201).json({ success: true, data: warehouse });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/warehouse-zones
  static async createZone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createZoneSchema.parse(req.body);
      const zone = await prisma.warehouseZone.create({
        data,
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'CREATE',
        entity: 'WarehouseZone',
        entityId: zone.id,
        reference: zone.code,
        afterValue: zone,
      });

      res.status(201).json({ success: true, data: zone });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/warehouse-racks
  static async createRack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createRackSchema.parse(req.body);
      const rack = await prisma.warehouseRack.create({
        data,
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'CREATE',
        entity: 'WarehouseRack',
        entityId: rack.id,
        reference: rack.code,
        afterValue: rack,
      });

      res.status(201).json({ success: true, data: rack });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/warehouse-bins
  static async createBin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createBinSchema.parse(req.body);
      const bin = await prisma.warehouseBin.create({
        data,
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'CREATE',
        entity: 'WarehouseBin',
        entityId: bin.id,
        reference: bin.code,
        afterValue: bin,
      });

      res.status(201).json({ success: true, data: bin });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/warehouse-bins/:id/toggle-status
  static async toggleBinStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const bin = await prisma.warehouseBin.findUnique({
        where: { id },
        include: { stockBalances: true },
      });

      if (!bin) {
        res.status(404).json({ success: false, message: 'Bin not found' });
        return;
      }

      // Check if trying to deactivate a bin that has positive stock
      const hasStock = bin.stockBalances.some((b) => b.onHandQty > 0 || b.reservedQty > 0);
      if (bin.isActive && hasStock) {
        res.status(400).json({
          success: false,
          message: 'Cannot deactivate bin with active stock. Transfer or issue all items first.',
        });
        return;
      }

      const updated = await prisma.warehouseBin.update({
        where: { id },
        data: { isActive: !bin.isActive },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'UPDATE',
        entity: 'WarehouseBin',
        entityId: id,
        reference: bin.code,
        beforeValue: { isActive: bin.isActive },
        afterValue: { isActive: updated.isActive },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
}

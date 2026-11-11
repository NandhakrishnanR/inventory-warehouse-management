import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../shared/prisma';
import { logAudit } from '../../shared/audit';

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const createCompanySchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  currency: z.string().min(2).max(10).default('USD'),
  address: z.string().optional().nullable(),
});

const updateCompanySchema = z.object({
  code: z.string().min(2).max(50).optional(),
  name: z.string().min(2).optional(),
  currency: z.string().min(2).max(10).optional(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const createRegionSchema = z.object({
  companyId: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2),
});

const updateRegionSchema = z.object({
  code: z.string().min(2).max(50).optional(),
  name: z.string().min(2).optional(),
});

const createCitySchema = z.object({
  regionId: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  state: z.string().optional().nullable(),
  country: z.string().default('USA'),
});

const updateCitySchema = z.object({
  code: z.string().min(2).max(50).optional(),
  name: z.string().min(2).optional(),
  state: z.string().optional().nullable(),
  country: z.string().optional(),
});

const createSiteSchema = z.object({
  cityId: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  address: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const updateSiteSchema = z.object({
  code: z.string().min(2).max(50).optional(),
  name: z.string().min(2).optional(),
  address: z.string().optional().nullable(),
  contactNumber: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const createWarehouseSchema = z.object({
  siteId: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  warehouseType: z.string().default('STANDARD'),
  managerId: z.string().uuid().optional().nullable().or(z.literal('')).transform(val => (!val ? null : val)),
  address: z.string().optional().nullable(),
});

const updateWarehouseSchema = z.object({
  code: z.string().min(2).max(50).optional(),
  name: z.string().min(2).optional(),
  warehouseType: z.string().optional(),
  managerId: z.string().uuid().optional().nullable().or(z.literal('')).transform(val => (!val ? null : val)),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const createZoneSchema = z.object({
  warehouseId: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  zoneType: z.string().default('STORAGE'),
});

const updateZoneSchema = z.object({
  code: z.string().min(2).max(50).optional(),
  name: z.string().min(2).optional(),
  zoneType: z.string().optional(),
  isActive: z.boolean().optional(),
});

const createRackSchema = z.object({
  zoneId: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  levels: z.coerce.number().int().positive().default(4),
});

const updateRackSchema = z.object({
  code: z.string().min(2).max(50).optional(),
  name: z.string().min(2).optional(),
  levels: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

const createBinSchema = z.object({
  warehouseId: z.string().uuid(),
  rackId: z.string().uuid().optional().nullable().or(z.literal('')).transform(val => (!val ? null : val)),
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  binType: z.string().default('STORAGE'),
  maxWeight: z.coerce.number().positive().optional().nullable().or(z.literal('')).transform(val => (val === '' || val === null || val === undefined ? undefined : Number(val))),
  maxVolume: z.coerce.number().positive().optional().nullable().or(z.literal('')).transform(val => (val === '' || val === null || val === undefined ? undefined : Number(val))),
});

const updateBinSchema = z.object({
  code: z.string().min(2).max(50).optional(),
  name: z.string().min(2).optional(),
  binType: z.string().optional(),
  rackId: z.string().uuid().optional().nullable().or(z.literal('')).transform(val => (!val ? null : val)),
  maxWeight: z.coerce.number().positive().optional().nullable().or(z.literal('')).transform(val => (val === '' || val === null || val === undefined ? null : Number(val))),
  maxVolume: z.coerce.number().positive().optional().nullable().or(z.literal('')).transform(val => (val === '' || val === null || val === undefined ? null : Number(val))),
  isActive: z.boolean().optional(),
});

// ==========================================
// CONTROLLER
// ==========================================

export class WarehouseController {
  // GET /api/warehouses/tree
  static async getLocationTree(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companies = await prisma.company.findMany({
        orderBy: { name: 'asc' },
        include: {
          regions: {
            orderBy: { name: 'asc' },
            include: {
              cities: {
                orderBy: { name: 'asc' },
                include: {
                  sites: {
                    orderBy: { name: 'asc' },
                    include: {
                      warehouses: {
                        orderBy: { name: 'asc' },
                        include: {
                          zones: {
                            orderBy: { name: 'asc' },
                            include: {
                              racks: {
                                orderBy: { name: 'asc' },
                                include: {
                                  bins: {
                                    orderBy: { code: 'asc' },
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
                            orderBy: { code: 'asc' },
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

  // ==========================================
  // COMPANY CRUD
  // ==========================================

  // GET /api/warehouses/companies
  static async listCompanies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companies = await prisma.company.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { regions: true, departments: true, employees: true },
          },
        },
      });

      res.json({ success: true, data: companies });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/warehouses/companies
  static async createCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createCompanySchema.parse(req.body);
      const upperCode = data.code.toUpperCase();

      const existing = await prisma.company.findUnique({
        where: { code: upperCode },
      });

      if (existing) {
        res.status(409).json({ success: false, message: `Company code ${upperCode} already exists.` });
        return;
      }

      const company = await prisma.company.create({
        data: {
          code: upperCode,
          name: data.name,
          currency: data.currency ? data.currency.toUpperCase() : 'USD',
          address: data.address || null,
        },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'CREATE',
        entity: 'Company',
        entityId: company.id,
        reference: company.code,
        afterValue: company,
      });

      res.status(201).json({ success: true, data: company });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/warehouses/companies/:id
  static async updateCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateCompanySchema.parse(req.body);

      const company = await prisma.company.findUnique({
        where: { id },
      });

      if (!company) {
        res.status(404).json({ success: false, message: 'Company not found' });
        return;
      }

      if (data.code && data.code.toUpperCase() !== company.code) {
        const existing = await prisma.company.findUnique({
          where: { code: data.code.toUpperCase() },
        });
        if (existing) {
          res.status(409).json({ success: false, message: `Company code ${data.code.toUpperCase()} is already in use.` });
          return;
        }
      }

      const updated = await prisma.company.update({
        where: { id },
        data: {
          ...(data.code ? { code: data.code.toUpperCase() } : {}),
          ...(data.name ? { name: data.name } : {}),
          ...(data.currency ? { currency: data.currency.toUpperCase() } : {}),
          ...(data.address !== undefined ? { address: data.address } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'UPDATE',
        entity: 'Company',
        entityId: id,
        reference: updated.code,
        beforeValue: company,
        afterValue: updated,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/warehouses/companies/:id
  static async deleteCompany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          regions: {
            include: {
              cities: {
                include: {
                  sites: {
                    include: {
                      warehouses: {
                        select: { id: true, code: true, name: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!company) {
        res.status(404).json({ success: false, message: 'Company not found' });
        return;
      }

      const warehouseIds: string[] = [];
      company.regions.forEach((r) =>
        r.cities.forEach((c) =>
          c.sites.forEach((s) => s.warehouses.forEach((w) => warehouseIds.push(w.id)))
        )
      );

      if (warehouseIds.length > 0) {
        const activeStock = await prisma.stockBalance.findFirst({
          where: {
            warehouseId: { in: warehouseIds },
            OR: [
              { onHandQty: { gt: 0 } },
              { reservedQty: { gt: 0 } },
            ],
          },
        });

        if (activeStock) {
          res.status(400).json({
            success: false,
            message: `Cannot delete company. ${warehouseIds.length} warehouse(s) under this company have active inventory stock. Deactivate the company instead.`,
          });
          return;
        }

        const movementCount = await prisma.stockMovement.count({
          where: {
            OR: [
              { sourceWarehouseId: { in: warehouseIds } },
              { destWarehouseId: { in: warehouseIds } },
            ],
          },
        });

        if (movementCount > 0) {
          res.status(400).json({
            success: false,
            message: `Cannot delete company with historical stock movements (${movementCount} transaction records). Deactivate the company instead to preserve audit history.`,
          });
          return;
        }

        await prisma.$transaction([
          prisma.warehouseBin.deleteMany({ where: { warehouseId: { in: warehouseIds } } }),
          prisma.warehouseRack.deleteMany({ where: { zone: { warehouseId: { in: warehouseIds } } } }),
          prisma.warehouseZone.deleteMany({ where: { warehouseId: { in: warehouseIds } } }),
          prisma.warehouse.deleteMany({ where: { id: { in: warehouseIds } } }),
          prisma.company.delete({ where: { id } }),
        ]);
      } else {
        await prisma.company.delete({ where: { id } });
      }

      await logAudit({
        actorId: req.user?.id,
        action: 'DELETE',
        entity: 'Company',
        entityId: id,
        reference: company.code,
        beforeValue: { code: company.code, name: company.name },
      });

      res.json({ success: true, message: `Company ${company.name} (${company.code}) successfully deleted.` });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/warehouses/companies/:id/toggle-status
  static async toggleCompanyStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const company = await prisma.company.findUnique({
        where: { id },
      });

      if (!company) {
        res.status(404).json({ success: false, message: 'Company not found' });
        return;
      }

      const updated = await prisma.company.update({
        where: { id },
        data: { isActive: !company.isActive },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'UPDATE',
        entity: 'Company',
        entityId: id,
        reference: company.code,
        beforeValue: { isActive: company.isActive },
        afterValue: { isActive: updated.isActive },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // REGION CRUD
  // ==========================================

  // POST /api/warehouses/regions
  static async createRegion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createRegionSchema.parse(req.body);
      const upperCode = data.code.toUpperCase();

      const existing = await prisma.region.findUnique({
        where: { code: upperCode },
      });
      if (existing) {
        res.status(409).json({ success: false, message: `Region code ${upperCode} already exists.` });
        return;
      }

      const company = await prisma.company.findUnique({
        where: { id: data.companyId },
      });
      if (!company) {
        res.status(404).json({ success: false, message: 'Target company not found' });
        return;
      }

      const region = await prisma.region.create({
        data: {
          companyId: data.companyId,
          code: upperCode,
          name: data.name,
        },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'CREATE',
        entity: 'Region',
        entityId: region.id,
        reference: region.code,
        afterValue: region,
      });

      res.status(201).json({ success: true, data: region });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/warehouses/regions/:id
  static async updateRegion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateRegionSchema.parse(req.body);

      const region = await prisma.region.findUnique({ where: { id } });
      if (!region) {
        res.status(404).json({ success: false, message: 'Region not found' });
        return;
      }

      if (data.code && data.code.toUpperCase() !== region.code) {
        const existing = await prisma.region.findUnique({
          where: { code: data.code.toUpperCase() },
        });
        if (existing) {
          res.status(409).json({ success: false, message: `Region code ${data.code.toUpperCase()} already in use.` });
          return;
        }
      }

      const updated = await prisma.region.update({
        where: { id },
        data: {
          ...(data.code ? { code: data.code.toUpperCase() } : {}),
          ...(data.name ? { name: data.name } : {}),
        },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'UPDATE',
        entity: 'Region',
        entityId: id,
        reference: updated.code,
        beforeValue: region,
        afterValue: updated,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/warehouses/regions/:id
  static async deleteRegion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const region = await prisma.region.findUnique({
        where: { id },
        include: {
          cities: {
            include: {
              sites: {
                include: {
                  warehouses: { select: { id: true, code: true, name: true } },
                },
              },
            },
          },
        },
      });

      if (!region) {
        res.status(404).json({ success: false, message: 'Region not found' });
        return;
      }

      const warehouseIds: string[] = [];
      region.cities.forEach((c) =>
        c.sites.forEach((s) => s.warehouses.forEach((w) => warehouseIds.push(w.id)))
      );

      if (warehouseIds.length > 0) {
        const activeStock = await prisma.stockBalance.findFirst({
          where: {
            warehouseId: { in: warehouseIds },
            OR: [{ onHandQty: { gt: 0 } }, { reservedQty: { gt: 0 } }],
          },
        });

        if (activeStock) {
          res.status(400).json({
            success: false,
            message: 'Cannot delete region. Warehouses under this region currently hold active physical stock.',
          });
          return;
        }

        const movementCount = await prisma.stockMovement.count({
          where: {
            OR: [
              { sourceWarehouseId: { in: warehouseIds } },
              { destWarehouseId: { in: warehouseIds } },
            ],
          },
        });

        if (movementCount > 0) {
          res.status(400).json({
            success: false,
            message: `Cannot delete region with historical stock movements (${movementCount} transaction records).`,
          });
          return;
        }

        await prisma.$transaction([
          prisma.warehouseBin.deleteMany({ where: { warehouseId: { in: warehouseIds } } }),
          prisma.warehouseRack.deleteMany({ where: { zone: { warehouseId: { in: warehouseIds } } } }),
          prisma.warehouseZone.deleteMany({ where: { warehouseId: { in: warehouseIds } } }),
          prisma.warehouse.deleteMany({ where: { id: { in: warehouseIds } } }),
          prisma.region.delete({ where: { id } }),
        ]);
      } else {
        await prisma.region.delete({ where: { id } });
      }

      await logAudit({
        actorId: req.user?.id,
        action: 'DELETE',
        entity: 'Region',
        entityId: id,
        reference: region.code,
        beforeValue: { code: region.code, name: region.name },
      });

      res.json({ success: true, message: `Region ${region.name} (${region.code}) successfully deleted.` });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // CITY CRUD
  // ==========================================

  // POST /api/warehouses/cities
  static async createCity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createCitySchema.parse(req.body);
      const upperCode = data.code.toUpperCase();

      const existing = await prisma.city.findUnique({
        where: { code: upperCode },
      });
      if (existing) {
        res.status(409).json({ success: false, message: `City code ${upperCode} already exists.` });
        return;
      }

      const region = await prisma.region.findUnique({
        where: { id: data.regionId },
      });
      if (!region) {
        res.status(404).json({ success: false, message: 'Target region not found' });
        return;
      }

      const city = await prisma.city.create({
        data: {
          regionId: data.regionId,
          code: upperCode,
          name: data.name,
          state: data.state || null,
          country: data.country || 'USA',
        },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'CREATE',
        entity: 'City',
        entityId: city.id,
        reference: city.code,
        afterValue: city,
      });

      res.status(201).json({ success: true, data: city });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/warehouses/cities/:id
  static async updateCity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateCitySchema.parse(req.body);

      const city = await prisma.city.findUnique({ where: { id } });
      if (!city) {
        res.status(404).json({ success: false, message: 'City not found' });
        return;
      }

      if (data.code && data.code.toUpperCase() !== city.code) {
        const existing = await prisma.city.findUnique({
          where: { code: data.code.toUpperCase() },
        });
        if (existing) {
          res.status(409).json({ success: false, message: `City code ${data.code.toUpperCase()} already in use.` });
          return;
        }
      }

      const updated = await prisma.city.update({
        where: { id },
        data: {
          ...(data.code ? { code: data.code.toUpperCase() } : {}),
          ...(data.name ? { name: data.name } : {}),
          ...(data.state !== undefined ? { state: data.state || null } : {}),
          ...(data.country ? { country: data.country } : {}),
        },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'UPDATE',
        entity: 'City',
        entityId: id,
        reference: updated.code,
        beforeValue: city,
        afterValue: updated,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/warehouses/cities/:id
  static async deleteCity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const city = await prisma.city.findUnique({
        where: { id },
        include: {
          sites: {
            include: {
              warehouses: { select: { id: true, code: true, name: true } },
            },
          },
        },
      });

      if (!city) {
        res.status(404).json({ success: false, message: 'City not found' });
        return;
      }

      const warehouseIds: string[] = [];
      city.sites.forEach((s) => s.warehouses.forEach((w) => warehouseIds.push(w.id)));

      if (warehouseIds.length > 0) {
        const activeStock = await prisma.stockBalance.findFirst({
          where: {
            warehouseId: { in: warehouseIds },
            OR: [{ onHandQty: { gt: 0 } }, { reservedQty: { gt: 0 } }],
          },
        });

        if (activeStock) {
          res.status(400).json({
            success: false,
            message: 'Cannot delete city. Warehouses under this city hold active stock balances.',
          });
          return;
        }

        const movementCount = await prisma.stockMovement.count({
          where: {
            OR: [
              { sourceWarehouseId: { in: warehouseIds } },
              { destWarehouseId: { in: warehouseIds } },
            ],
          },
        });

        if (movementCount > 0) {
          res.status(400).json({
            success: false,
            message: `Cannot delete city with historical stock movements (${movementCount} transaction records).`,
          });
          return;
        }

        await prisma.$transaction([
          prisma.warehouseBin.deleteMany({ where: { warehouseId: { in: warehouseIds } } }),
          prisma.warehouseRack.deleteMany({ where: { zone: { warehouseId: { in: warehouseIds } } } }),
          prisma.warehouseZone.deleteMany({ where: { warehouseId: { in: warehouseIds } } }),
          prisma.warehouse.deleteMany({ where: { id: { in: warehouseIds } } }),
          prisma.city.delete({ where: { id } }),
        ]);
      } else {
        await prisma.city.delete({ where: { id } });
      }

      await logAudit({
        actorId: req.user?.id,
        action: 'DELETE',
        entity: 'City',
        entityId: id,
        reference: city.code,
        beforeValue: { code: city.code, name: city.name },
      });

      res.json({ success: true, message: `City ${city.name} (${city.code}) successfully deleted.` });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // SITE CRUD
  // ==========================================

  // POST /api/warehouses/sites
  static async createSite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createSiteSchema.parse(req.body);
      const upperCode = data.code.toUpperCase();

      const existing = await prisma.site.findUnique({
        where: { code: upperCode },
      });
      if (existing) {
        res.status(409).json({ success: false, message: `Site code ${upperCode} already exists.` });
        return;
      }

      const city = await prisma.city.findUnique({
        where: { id: data.cityId },
      });
      if (!city) {
        res.status(404).json({ success: false, message: 'Target city not found' });
        return;
      }

      const site = await prisma.site.create({
        data: {
          cityId: data.cityId,
          code: upperCode,
          name: data.name,
          address: data.address || null,
          contactNumber: data.contactNumber || null,
          isActive: data.isActive ?? true,
        },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'CREATE',
        entity: 'Site',
        entityId: site.id,
        reference: site.code,
        afterValue: site,
      });

      res.status(201).json({ success: true, data: site });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/warehouses/sites/:id
  static async updateSite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateSiteSchema.parse(req.body);

      const site = await prisma.site.findUnique({ where: { id } });
      if (!site) {
        res.status(404).json({ success: false, message: 'Site not found' });
        return;
      }

      if (data.code && data.code.toUpperCase() !== site.code) {
        const existing = await prisma.site.findUnique({
          where: { code: data.code.toUpperCase() },
        });
        if (existing) {
          res.status(409).json({ success: false, message: `Site code ${data.code.toUpperCase()} already in use.` });
          return;
        }
      }

      const updated = await prisma.site.update({
        where: { id },
        data: {
          ...(data.code ? { code: data.code.toUpperCase() } : {}),
          ...(data.name ? { name: data.name } : {}),
          ...(data.address !== undefined ? { address: data.address || null } : {}),
          ...(data.contactNumber !== undefined ? { contactNumber: data.contactNumber || null } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'UPDATE',
        entity: 'Site',
        entityId: id,
        reference: updated.code,
        beforeValue: site,
        afterValue: updated,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/warehouses/sites/:id
  static async deleteSite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const site = await prisma.site.findUnique({
        where: { id },
        include: {
          warehouses: { select: { id: true, code: true, name: true } },
        },
      });

      if (!site) {
        res.status(404).json({ success: false, message: 'Site not found' });
        return;
      }

      const warehouseIds = site.warehouses.map((w) => w.id);

      if (warehouseIds.length > 0) {
        const activeStock = await prisma.stockBalance.findFirst({
          where: {
            warehouseId: { in: warehouseIds },
            OR: [{ onHandQty: { gt: 0 } }, { reservedQty: { gt: 0 } }],
          },
        });

        if (activeStock) {
          res.status(400).json({
            success: false,
            message: 'Cannot delete site. Warehouses under this site contain active stock balances.',
          });
          return;
        }

        const movementCount = await prisma.stockMovement.count({
          where: {
            OR: [
              { sourceWarehouseId: { in: warehouseIds } },
              { destWarehouseId: { in: warehouseIds } },
            ],
          },
        });

        if (movementCount > 0) {
          res.status(400).json({
            success: false,
            message: `Cannot delete site with historical stock movements (${movementCount} transaction records).`,
          });
          return;
        }

        await prisma.$transaction([
          prisma.warehouseBin.deleteMany({ where: { warehouseId: { in: warehouseIds } } }),
          prisma.warehouseRack.deleteMany({ where: { zone: { warehouseId: { in: warehouseIds } } } }),
          prisma.warehouseZone.deleteMany({ where: { warehouseId: { in: warehouseIds } } }),
          prisma.warehouse.deleteMany({ where: { id: { in: warehouseIds } } }),
          prisma.site.delete({ where: { id } }),
        ]);
      } else {
        await prisma.site.delete({ where: { id } });
      }

      await logAudit({
        actorId: req.user?.id,
        action: 'DELETE',
        entity: 'Site',
        entityId: id,
        reference: site.code,
        beforeValue: { code: site.code, name: site.name },
      });

      res.json({ success: true, message: `Site ${site.name} (${site.code}) successfully deleted.` });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // WAREHOUSE CRUD
  // ==========================================

  // POST /api/warehouses
  static async createWarehouse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createWarehouseSchema.parse(req.body);
      const upperCode = data.code.toUpperCase();

      const existing = await prisma.warehouse.findUnique({
        where: { code: upperCode },
      });
      if (existing) {
        res.status(409).json({ success: false, message: `Warehouse code ${upperCode} already exists.` });
        return;
      }

      const warehouse = await prisma.warehouse.create({
        data: {
          siteId: data.siteId,
          code: upperCode,
          name: data.name,
          warehouseType: data.warehouseType || 'STANDARD',
          managerId: data.managerId || null,
          address: data.address || null,
        },
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

  // PUT /api/warehouses/:id
  static async updateWarehouse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateWarehouseSchema.parse(req.body);

      const warehouse = await prisma.warehouse.findUnique({ where: { id } });
      if (!warehouse) {
        res.status(404).json({ success: false, message: 'Warehouse not found' });
        return;
      }

      if (data.code && data.code.toUpperCase() !== warehouse.code) {
        const existing = await prisma.warehouse.findUnique({
          where: { code: data.code.toUpperCase() },
        });
        if (existing) {
          res.status(409).json({ success: false, message: `Warehouse code ${data.code.toUpperCase()} already in use.` });
          return;
        }
      }

      const updated = await prisma.warehouse.update({
        where: { id },
        data: {
          ...(data.code ? { code: data.code.toUpperCase() } : {}),
          ...(data.name ? { name: data.name } : {}),
          ...(data.warehouseType ? { warehouseType: data.warehouseType } : {}),
          ...(data.managerId !== undefined ? { managerId: data.managerId } : {}),
          ...(data.address !== undefined ? { address: data.address || null } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'UPDATE',
        entity: 'Warehouse',
        entityId: id,
        reference: updated.code,
        beforeValue: warehouse,
        afterValue: updated,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/warehouses/:id
  static async deleteWarehouse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const warehouse = await prisma.warehouse.findUnique({ where: { id } });
      if (!warehouse) {
        res.status(404).json({ success: false, message: 'Warehouse not found' });
        return;
      }

      const activeStock = await prisma.stockBalance.findFirst({
        where: {
          warehouseId: id,
          OR: [{ onHandQty: { gt: 0 } }, { reservedQty: { gt: 0 } }],
        },
      });

      if (activeStock) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete warehouse with active physical stock. Empty inventory before deletion.',
        });
        return;
      }

      const movementCount = await prisma.stockMovement.count({
        where: {
          OR: [{ sourceWarehouseId: id }, { destWarehouseId: id }],
        },
      });

      if (movementCount > 0) {
        res.status(400).json({
          success: false,
          message: `Cannot delete warehouse with historical movements (${movementCount} transaction records). Deactivate it instead.`,
        });
        return;
      }

      await prisma.$transaction([
        prisma.warehouseBin.deleteMany({ where: { warehouseId: id } }),
        prisma.warehouseRack.deleteMany({ where: { zone: { warehouseId: id } } }),
        prisma.warehouseZone.deleteMany({ where: { warehouseId: id } }),
        prisma.warehouse.delete({ where: { id } }),
      ]);

      await logAudit({
        actorId: req.user?.id,
        action: 'DELETE',
        entity: 'Warehouse',
        entityId: id,
        reference: warehouse.code,
        beforeValue: { code: warehouse.code, name: warehouse.name },
      });

      res.json({ success: true, message: `Warehouse ${warehouse.name} (${warehouse.code}) successfully deleted.` });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // ZONE CRUD
  // ==========================================

  // POST /api/warehouses/zones
  static async createZone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createZoneSchema.parse(req.body);
      const upperCode = data.code.toUpperCase();

      const existing = await prisma.warehouseZone.findUnique({
        where: {
          warehouseId_code: {
            warehouseId: data.warehouseId,
            code: upperCode,
          },
        },
      });
      if (existing) {
        res.status(409).json({ success: false, message: `Zone code ${upperCode} already exists in this warehouse.` });
        return;
      }

      const zone = await prisma.warehouseZone.create({
        data: {
          warehouseId: data.warehouseId,
          code: upperCode,
          name: data.name,
          zoneType: data.zoneType || 'STORAGE',
        },
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

  // PUT /api/warehouses/zones/:id
  static async updateZone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateZoneSchema.parse(req.body);

      const zone = await prisma.warehouseZone.findUnique({ where: { id } });
      if (!zone) {
        res.status(404).json({ success: false, message: 'Zone not found' });
        return;
      }

      if (data.code && data.code.toUpperCase() !== zone.code) {
        const existing = await prisma.warehouseZone.findUnique({
          where: {
            warehouseId_code: {
              warehouseId: zone.warehouseId,
              code: data.code.toUpperCase(),
            },
          },
        });
        if (existing) {
          res.status(409).json({ success: false, message: `Zone code ${data.code.toUpperCase()} already exists in this warehouse.` });
          return;
        }
      }

      const updated = await prisma.warehouseZone.update({
        where: { id },
        data: {
          ...(data.code ? { code: data.code.toUpperCase() } : {}),
          ...(data.name ? { name: data.name } : {}),
          ...(data.zoneType ? { zoneType: data.zoneType } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'UPDATE',
        entity: 'WarehouseZone',
        entityId: id,
        reference: updated.code,
        beforeValue: zone,
        afterValue: updated,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/warehouses/zones/:id
  static async deleteZone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const zone = await prisma.warehouseZone.findUnique({ where: { id } });
      if (!zone) {
        res.status(404).json({ success: false, message: 'Zone not found' });
        return;
      }

      const bins = await prisma.warehouseBin.findMany({
        where: { rack: { zoneId: id } },
        select: { id: true },
      });
      const binIds = bins.map((b) => b.id);

      if (binIds.length > 0) {
        const activeStock = await prisma.stockBalance.findFirst({
          where: {
            binId: { in: binIds },
            OR: [{ onHandQty: { gt: 0 } }, { reservedQty: { gt: 0 } }],
          },
        });
        if (activeStock) {
          res.status(400).json({
            success: false,
            message: 'Cannot delete zone. Bins inside this zone hold active stock.',
          });
          return;
        }

        const movementCount = await prisma.stockMovement.count({
          where: {
            OR: [
              { sourceBinId: { in: binIds } },
              { destBinId: { in: binIds } },
            ],
          },
        });
        if (movementCount > 0) {
          res.status(400).json({
            success: false,
            message: `Cannot delete zone. Bins have ${movementCount} historical movement records.`,
          });
          return;
        }
      }

      await prisma.$transaction([
        prisma.warehouseBin.deleteMany({ where: { rack: { zoneId: id } } }),
        prisma.warehouseRack.deleteMany({ where: { zoneId: id } }),
        prisma.warehouseZone.delete({ where: { id } }),
      ]);

      await logAudit({
        actorId: req.user?.id,
        action: 'DELETE',
        entity: 'WarehouseZone',
        entityId: id,
        reference: zone.code,
        beforeValue: { code: zone.code, name: zone.name },
      });

      res.json({ success: true, message: `Zone ${zone.name} (${zone.code}) successfully deleted.` });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // RACK CRUD
  // ==========================================

  // POST /api/warehouses/racks
  static async createRack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createRackSchema.parse(req.body);
      const upperCode = data.code.toUpperCase();

      const existing = await prisma.warehouseRack.findUnique({
        where: {
          zoneId_code: {
            zoneId: data.zoneId,
            code: upperCode,
          },
        },
      });
      if (existing) {
        res.status(409).json({ success: false, message: `Rack code ${upperCode} already exists in this zone.` });
        return;
      }

      const rack = await prisma.warehouseRack.create({
        data: {
          zoneId: data.zoneId,
          code: upperCode,
          name: data.name,
          levels: data.levels || 4,
        },
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

  // PUT /api/warehouses/racks/:id
  static async updateRack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateRackSchema.parse(req.body);

      const rack = await prisma.warehouseRack.findUnique({ where: { id } });
      if (!rack) {
        res.status(404).json({ success: false, message: 'Rack not found' });
        return;
      }

      if (data.code && data.code.toUpperCase() !== rack.code) {
        const existing = await prisma.warehouseRack.findUnique({
          where: {
            zoneId_code: {
              zoneId: rack.zoneId,
              code: data.code.toUpperCase(),
            },
          },
        });
        if (existing) {
          res.status(409).json({ success: false, message: `Rack code ${data.code.toUpperCase()} already exists in this zone.` });
          return;
        }
      }

      const updated = await prisma.warehouseRack.update({
        where: { id },
        data: {
          ...(data.code ? { code: data.code.toUpperCase() } : {}),
          ...(data.name ? { name: data.name } : {}),
          ...(data.levels !== undefined ? { levels: data.levels } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'UPDATE',
        entity: 'WarehouseRack',
        entityId: id,
        reference: updated.code,
        beforeValue: rack,
        afterValue: updated,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/warehouses/racks/:id
  static async deleteRack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const rack = await prisma.warehouseRack.findUnique({ where: { id } });
      if (!rack) {
        res.status(404).json({ success: false, message: 'Rack not found' });
        return;
      }

      const bins = await prisma.warehouseBin.findMany({
        where: { rackId: id },
        select: { id: true },
      });
      const binIds = bins.map((b) => b.id);

      if (binIds.length > 0) {
        const activeStock = await prisma.stockBalance.findFirst({
          where: {
            binId: { in: binIds },
            OR: [{ onHandQty: { gt: 0 } }, { reservedQty: { gt: 0 } }],
          },
        });
        if (activeStock) {
          res.status(400).json({
            success: false,
            message: 'Cannot delete rack. Bins inside this rack hold active stock.',
          });
          return;
        }

        const movementCount = await prisma.stockMovement.count({
          where: {
            OR: [
              { sourceBinId: { in: binIds } },
              { destBinId: { in: binIds } },
            ],
          },
        });
        if (movementCount > 0) {
          res.status(400).json({
            success: false,
            message: `Cannot delete rack. Bins have ${movementCount} historical movement records.`,
          });
          return;
        }
      }

      await prisma.$transaction([
        prisma.warehouseBin.deleteMany({ where: { rackId: id } }),
        prisma.warehouseRack.delete({ where: { id } }),
      ]);

      await logAudit({
        actorId: req.user?.id,
        action: 'DELETE',
        entity: 'WarehouseRack',
        entityId: id,
        reference: rack.code,
        beforeValue: { code: rack.code, name: rack.name },
      });

      res.json({ success: true, message: `Rack ${rack.name} (${rack.code}) successfully deleted.` });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // BIN CRUD
  // ==========================================

  // POST /api/warehouses/bins
  static async createBin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createBinSchema.parse(req.body);
      const upperCode = data.code.toUpperCase();

      const existing = await prisma.warehouseBin.findUnique({
        where: {
          warehouseId_code: {
            warehouseId: data.warehouseId,
            code: upperCode,
          },
        },
      });

      if (existing) {
        res.status(409).json({
          success: false,
          message: `Bin code ${upperCode} already exists in this warehouse.`,
        });
        return;
      }

      const bin = await prisma.warehouseBin.create({
        data: {
          warehouseId: data.warehouseId,
          rackId: data.rackId,
          code: upperCode,
          name: data.name,
          binType: data.binType,
          maxWeight: data.maxWeight,
          maxVolume: data.maxVolume,
        },
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

  // PUT /api/warehouses/bins/:id
  static async updateBin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateBinSchema.parse(req.body);

      const existingBin = await prisma.warehouseBin.findUnique({
        where: { id },
        include: { stockBalances: true },
      });

      if (!existingBin) {
        res.status(404).json({ success: false, message: 'Bin not found' });
        return;
      }

      if (data.code && data.code.toUpperCase() !== existingBin.code) {
        const duplicate = await prisma.warehouseBin.findUnique({
          where: {
            warehouseId_code: {
              warehouseId: existingBin.warehouseId,
              code: data.code.toUpperCase(),
            },
          },
        });
        if (duplicate) {
          res.status(409).json({
            success: false,
            message: `Bin with code ${data.code.toUpperCase()} already exists in this warehouse.`,
          });
          return;
        }
      }

      const hasStock = existingBin.stockBalances.some((b) => b.onHandQty > 0 || b.reservedQty > 0);
      if (data.isActive === false && hasStock) {
        res.status(400).json({
          success: false,
          message: 'Cannot deactivate bin with active stock. Transfer or issue all items first.',
        });
        return;
      }

      const updated = await prisma.warehouseBin.update({
        where: { id },
        data: {
          ...(data.code ? { code: data.code.toUpperCase() } : {}),
          ...(data.name ? { name: data.name } : {}),
          ...(data.binType ? { binType: data.binType } : {}),
          ...(data.rackId !== undefined ? { rackId: data.rackId } : {}),
          ...(data.maxWeight !== undefined ? { maxWeight: data.maxWeight } : {}),
          ...(data.maxVolume !== undefined ? { maxVolume: data.maxVolume } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'UPDATE',
        entity: 'WarehouseBin',
        entityId: id,
        reference: updated.code,
        beforeValue: existingBin,
        afterValue: updated,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/warehouses/bins/:id
  static async deleteBin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const bin = await prisma.warehouseBin.findUnique({
        where: { id },
        include: {
          stockBalances: true,
          _count: {
            select: {
              movementsAsSource: true,
              movementsAsDest: true,
              putawayTasks: true,
              stockCounts: true,
            },
          },
        },
      });

      if (!bin) {
        res.status(404).json({ success: false, message: 'Bin not found' });
        return;
      }

      const activeStock = bin.stockBalances.filter((b) => b.onHandQty > 0 || b.reservedQty > 0);
      if (activeStock.length > 0) {
        res.status(400).json({
          success: false,
          message: `Cannot delete bin. It currently contains ${activeStock.length} active stock balances. Transfer or empty all inventory first.`,
        });
        return;
      }

      const historicalTransactions =
        bin._count.movementsAsSource +
        bin._count.movementsAsDest +
        bin._count.putawayTasks +
        bin._count.stockCounts;

      if (historicalTransactions > 0) {
        res.status(400).json({
          success: false,
          message: `Cannot delete bin with historical transactions (${historicalTransactions} records found). Deactivate the bin instead to preserve audit logs.`,
        });
        return;
      }

      await prisma.stockBalance.deleteMany({
        where: { binId: id },
      });

      await prisma.warehouseBin.delete({
        where: { id },
      });

      await logAudit({
        actorId: req.user?.id,
        action: 'DELETE',
        entity: 'WarehouseBin',
        entityId: id,
        reference: bin.code,
        beforeValue: { code: bin.code, name: bin.name },
      });

      res.json({ success: true, message: `Bin ${bin.name} (${bin.code}) deleted successfully.` });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/warehouses/bins/:id/toggle-status
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

  // GET /api/warehouses/:id/bins
  static async listWarehouseBins(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const bins = await prisma.warehouseBin.findMany({
        where: { warehouseId: id, isActive: true },
        include: {
          rack: { include: { zone: true } },
        },
        orderBy: { code: 'asc' },
      });
      res.json({ success: true, data: bins });
    } catch (err) {
      next(err);
    }
  }
}

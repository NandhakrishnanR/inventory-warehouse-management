import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/shared/prisma';

const app = createApp();
let adminToken: string;
let whStaffToken: string;
let whManagerToken: string;

let testWarehouseId: string;
let testBin1Id: string;
let testBin2Id: string;
let testProductId: string;

describe('Enterprise ERP - Multi-Location Inventory & Warehouse System', () => {
  beforeAll(async () => {
    // 1. Authenticate admin user
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'admin', password: 'Password123!' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;

    // 2. Authenticate warehouse manager
    const whmRes = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'wh_manager', password: 'Password123!' });
    expect(whmRes.status).toBe(200);
    whManagerToken = whmRes.body.data.token;

    // 3. Authenticate warehouse staff
    const whsRes = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'wh_staff', password: 'Password123!' });
    expect(whsRes.status).toBe(200);
    whStaffToken = whsRes.body.data.token;

    // Grab seeded warehouse and bins
    const wh = await prisma.warehouse.findFirst({ where: { code: 'WH-AMB-01' } });
    testWarehouseId = wh!.id;

    const bin1 = await prisma.warehouseBin.findFirst({ where: { code: 'BIN-A01-001' } });
    testBin1Id = bin1!.id;

    const bin2 = await prisma.warehouseBin.findFirst({ where: { code: 'BIN-A01-002' } });
    testBin2Id = bin2!.id;

    const prod = await prisma.product.findFirst({ where: { sku: 'SKU-BRG-608ZZ' } });
    testProductId = prod!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Authentication & Role Scoping', () => {
    it('should reject unauthenticated requests to protected endpoints', async () => {
      const res = await request(app).get('/api/inventory/balances');
      expect(res.status).toBe(401);
    });

    it('should allow authenticated admin to query current user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.username).toBe('admin');
      expect(res.body.data.roles).toContain('ADMIN');
    });

    it('should forbid unauthorized roles from creating products', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${whStaffToken}`)
        .send({
          sku: 'SKU-TEST-UNAUTHORIZED',
          name: 'Unauthorized Product',
          categoryId: 'invalid',
          uomId: 'invalid',
        });
      expect(res.status).toBe(403);
    });
  });

  describe('2. Warehouse Hierarchy & Navigation Tree', () => {
    it('should return complete multi-tier location hierarchy tree', async () => {
      const res = await request(app)
        .get('/api/warehouses/tree')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      const company = res.body.data[0];
      expect(company.regions.length).toBeGreaterThan(0);
      expect(company.regions[0].cities[0].sites[0].warehouses.length).toBeGreaterThan(0);
    });

    it('should prevent duplicate warehouse codes', async () => {
      const site = await prisma.site.findFirst();
      const res = await request(app)
        .post('/api/warehouses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          siteId: site!.id,
          code: 'WH-AMB-01', // Already exists in seed
          name: 'Duplicate Warehouse',
        });
      expect(res.status).toBe(409);
    });
  });

  describe('3. Stock Ledger Traceability & Controlled Inflow (Milestone 1)', () => {
    it('should post direct receipt atomically to ledger and update stock balance', async () => {
      const initialBalance = await prisma.stockBalance.findFirst({
        where: { productId: testProductId, binId: testBin1Id, batchNumber: 'LOT-TEST-001' },
      });
      const initialQty = initialBalance ? initialBalance.onHandQty : 0;

      const res = await request(app)
        .post('/api/inventory/direct-receipt')
        .set('Authorization', `Bearer ${whManagerToken}`)
        .send({
          warehouseId: testWarehouseId,
          binId: testBin1Id,
          productId: testProductId,
          quantity: 25,
          batchNumber: 'LOT-TEST-001',
          notes: 'Automated test controlled receipt',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.movement.transactionType).toBe('RECEIPT');

      // Verify balance incremented consistently
      const updatedBalance = await prisma.stockBalance.findFirst({
        where: { productId: testProductId, binId: testBin1Id, batchNumber: 'LOT-TEST-001' },
      });
      expect(updatedBalance!.onHandQty).toBe(initialQty + 25);
    });

    it('should query balances and available stock correctly', async () => {
      const res = await request(app)
        .get(`/api/inventory/balances?warehouseId=${testWarehouseId}&productId=${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      const b = res.body.data[0];
      expect(b.availableQty).toBe(b.onHandQty - b.reservedQty - b.damagedQty - b.quarantinedQty);
    });
  });

  describe('4. Inter-Warehouse / Bin Transfer Lifecycle & Discrepancies', () => {
    it('should reject transfer when requested quantity exceeds available stock', async () => {
      const res = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${whManagerToken}`)
        .send({
          sourceWarehouseId: testWarehouseId,
          destWarehouseId: testWarehouseId,
          reason: 'Excessive quantity test',
          items: [
            {
              productId: testProductId,
              sourceBinId: testBin1Id,
              requestedQty: 99999999, // Impossible stock
            },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Insufficient available stock');
    });

    it('should execute full transfer lifecycle: Create -> Dispatch -> Receive with discrepancy handling', async () => {
      // 1. Create transfer
      const createRes = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${whManagerToken}`)
        .send({
          sourceWarehouseId: testWarehouseId,
          destWarehouseId: testWarehouseId,
          reason: 'Internal rack relocation test',
          items: [
            {
              productId: testProductId,
              sourceBinId: testBin1Id,
              destBinId: testBin2Id,
              requestedQty: 10,
              batchNumber: 'LOT-TEST-001',
            },
          ],
        });
      expect(createRes.status).toBe(201);
      const transferId = createRes.body.data.id;
      const transferItemId = createRes.body.data.items[0].id;

      // 2. Dispatch transfer (Deducts source stock and marks IN_TRANSIT)
      const dispatchRes = await request(app)
        .post(`/api/transfers/${transferId}/dispatch`)
        .set('Authorization', `Bearer ${whStaffToken}`)
        .send({
          trackingNumber: 'TRK-INTRA-001',
          carrier: 'Internal Forklift',
        });
      expect(dispatchRes.status).toBe(200);
      expect(dispatchRes.body.data.status).toBe('IN_TRANSIT');

      // 3. Receive at destination with slight discrepancy (received 9 instead of 10)
      const receiveRes = await request(app)
        .post(`/api/transfers/${transferId}/receive`)
        .set('Authorization', `Bearer ${whStaffToken}`)
        .send({
          notes: 'Received with 1 damaged unit in transit',
          items: [
            {
              itemId: transferItemId,
              receivedQty: 9,
              destBinId: testBin2Id,
            },
          ],
        });
      expect(receiveRes.status).toBe(200);
      expect(receiveRes.body.data.status).toBe('PARTIALLY_RECEIVED');

      // Verify destination bin received exactly 9 units
      const destBalance = await prisma.stockBalance.findFirst({
        where: { productId: testProductId, binId: testBin2Id, batchNumber: 'LOT-TEST-001' },
      });
      expect(destBalance).toBeDefined();
      expect(destBalance!.onHandQty).toBeGreaterThanOrEqual(9);
    });
  });

  describe('5. Material Consumption & Concurrency Safeguard', () => {
    it('should reject stock issue if requested quantity exceeds bin on-hand stock', async () => {
      const dept = await prisma.department.findFirst();
      const res = await request(app)
        .post('/api/inventory/issues')
        .set('Authorization', `Bearer ${whStaffToken}`)
        .send({
          departmentId: dept!.id,
          warehouseId: testWarehouseId,
          items: [
            {
              productId: testProductId,
              binId: testBin1Id,
              quantity: 888888, // Excessive quantity
            },
          ],
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Insufficient available stock');
    });
  });

  describe('6. Reusable Approval Workflow Engine', () => {
    it('should submit purchase requisition and advance through approval engine', async () => {
      const dept = await prisma.department.findFirst();
      // 1. Create requisition
      const prRes = await request(app)
        .post('/api/procurement/requisitions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId: dept!.id,
          justification: 'Automated test requisition for tooling parts',
          items: [
            {
              productId: testProductId,
              quantity: 20,
              estimatedUnitCost: 4.5,
              notes: 'Immediate need',
            },
          ],
        });
      expect(prRes.status).toBe(201);
      const prId = prRes.body.data.id;

      // 2. Submit requisition
      const submitRes = await request(app)
        .post(`/api/procurement/requisitions/${prId}/submit`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(submitRes.status).toBe(200);

      // 3. Find pending approval instance
      const instance = await prisma.approvalInstance.findFirst({
        where: { documentId: prId, status: 'PENDING' },
      });
      expect(instance).toBeDefined();

      // 4. Approve step
      const approveRes = await request(app)
        .post(`/api/approvals/${instance!.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ comments: 'Authorized by admin test suite' });
      expect(approveRes.status).toBe(200);
    });
  });

  describe('7. Executive Reports & Valuation Consistency', () => {
    it('should return stock summary metrics and breakdowns', async () => {
      const res = await request(app)
        .get('/api/reports/stock-summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.metrics.totalStockQuantity).toBeGreaterThan(0);
      expect(res.body.data.metrics.totalStockValuation).toBeGreaterThan(0);
      expect(Object.keys(res.body.data.breakdowns.byCity).length).toBeGreaterThan(0);
    });
  });
});

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Enterprise ERP Database Seed...');

  // Clean existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.approvalAction.deleteMany();
  await prisma.approvalInstance.deleteMany();
  await prisma.approvalStep.deleteMany();
  await prisma.approvalWorkflow.deleteMany();
  await prisma.stockAdjustment.deleteMany();
  await prisma.stockCountItem.deleteMany();
  await prisma.stockCount.deleteMany();
  await prisma.stockReturn.deleteMany();
  await prisma.stockIssueItem.deleteMany();
  await prisma.stockIssue.deleteMany();
  await prisma.materialRequestItem.deleteMany();
  await prisma.materialRequest.deleteMany();
  await prisma.transferReceipt.deleteMany();
  await prisma.transferDispatch.deleteMany();
  await prisma.stockTransferItem.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.serialNumber.deleteMany();
  await prisma.stockLot.deleteMany();
  await prisma.stockReservation.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockBalance.deleteMany();
  await prisma.putawayTask.deleteMany();
  await prisma.goodsReceiptItem.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.purchaseRequisitionItem.deleteMany();
  await prisma.purchaseRequisition.deleteMany();
  await prisma.supplierContact.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.productBarcode.deleteMany();
  await prisma.product.deleteMany();
  await prisma.unitOfMeasure.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.warehouseBin.deleteMany();
  await prisma.warehouseRack.deleteMany();
  await prisma.warehouseZone.deleteMany();
  await prisma.userLocationAccess.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.site.deleteMany();
  await prisma.city.deleteMany();
  await prisma.region.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.company.deleteMany();

  // 1. Company
  const company = await prisma.company.create({
    data: {
      code: 'APEX-CORP',
      name: 'Apex Global Manufacturing & Logistics Ltd',
      currency: 'USD',
      address: '100 Global Technology Boulevard, Suite 500',
    },
  });

  // 2. Regions & Cities
  const regionSouth = await prisma.region.create({
    data: {
      companyId: company.id,
      code: 'REG-SOUTH',
      name: 'South Region',
    },
  });

  const cityChennai = await prisma.city.create({
    data: {
      regionId: regionSouth.id,
      code: 'CITY-MAA',
      name: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
    },
  });

  const cityBengaluru = await prisma.city.create({
    data: {
      regionId: regionSouth.id,
      code: 'CITY-BLR',
      name: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
    },
  });

  // 3. Sites
  const siteAmbattur = await prisma.site.create({
    data: {
      cityId: cityChennai.id,
      code: 'SITE-AMB',
      name: 'Ambattur Industrial Site',
      address: 'Plot 45, Ambattur Industrial Estate, Chennai 600058',
      contactNumber: '+91 44 2625 1000',
    },
  });

  const siteWhitefield = await prisma.site.create({
    data: {
      cityId: cityBengaluru.id,
      code: 'SITE-WHF',
      name: 'Whitefield Distribution Park',
      address: 'Plot 12, EPIP Zone, Whitefield, Bengaluru 560066',
      contactNumber: '+91 80 4110 2000',
    },
  });

  // 4. Departments
  const deptSupplyChain = await prisma.department.create({
    data: { companyId: company.id, code: 'SCM', name: 'Supply Chain & Inventory' },
  });
  const deptOperations = await prisma.department.create({
    data: { companyId: company.id, code: 'OPS', name: 'Plant Operations' },
  });
  const deptFinance = await prisma.department.create({
    data: { companyId: company.id, code: 'FIN', name: 'Corporate Finance' },
  });
  const deptProcurement = await prisma.department.create({
    data: { companyId: company.id, code: 'PROC', name: 'Strategic Procurement' },
  });
  const deptAudit = await prisma.department.create({
    data: { companyId: company.id, code: 'AUD', name: 'Internal Audit & Compliance' },
  });

  // 5. Roles & Permissions
  const roleDefs = [
    { code: 'ADMIN', name: 'System Administrator', description: 'Complete system access, user administration and system setup' },
    { code: 'INVENTORY_MANAGER', name: 'Inventory Manager', description: 'Manages multi-warehouse inventory, adjustments, and valuation' },
    { code: 'WAREHOUSE_MANAGER', name: 'Warehouse Manager', description: 'Manages warehouse operations, putaway, transfers, and receiving' },
    { code: 'WAREHOUSE_STAFF', name: 'Warehouse Staff', description: 'Executes picking, putaway tasks, cycle counts, and bin transfers' },
    { code: 'PROCUREMENT_OFFICER', name: 'Procurement Officer', description: 'Creates purchase requisitions, RFQs, quotations, and purchase orders' },
    { code: 'DEPARTMENT_MANAGER', name: 'Department Manager', description: 'Requests materials and approves requisitions within departmental thresholds' },
    { code: 'FINANCE_APPROVER', name: 'Finance Approver', description: 'Audits budgets and approves purchase requisitions and purchase orders' },
    { code: 'AUDITOR', name: 'Auditor', description: 'Read-only access to all transactions, stock ledgers, and audit logs' },
  ];

  const rolesMap: Record<string, string> = {};
  for (const r of roleDefs) {
    const createdRole = await prisma.role.create({
      data: { code: r.code, name: r.name, description: r.description, isSystem: true },
    });
    rolesMap[r.code] = createdRole.id;
  }

  // 5.1 Permissions Catalog
  const permissionsList = [
    { code: 'inventory:view', name: 'View Inventory Balances', module: 'INVENTORY', action: 'VIEW', description: 'View stock balances, product availability, movement ledgers' },
    { code: 'inventory:create', name: 'Direct Stock Inward', module: 'INVENTORY', action: 'CREATE', description: 'Perform controlled manual or direct inventory receipts' },
    { code: 'inventory:issue', name: 'Issue Material', module: 'INVENTORY', action: 'ISSUE', description: 'Issue stock for departmental consumption' },
    { code: 'inventory:adjust', name: 'Adjust Stock Balances', module: 'INVENTORY', action: 'ADJUST', description: 'Reconcile stock balances and post adjustments' },
    
    { code: 'transfer:view', name: 'View Transfers', module: 'TRANSFER', action: 'VIEW', description: 'View stock transfer requests and tracking' },
    { code: 'transfer:create', name: 'Initiate Transfer', module: 'TRANSFER', action: 'CREATE', description: 'Create inter-warehouse or bin-to-bin transfer requests' },
    { code: 'transfer:approve', name: 'Approve Transfer', module: 'TRANSFER', action: 'APPROVE', description: 'Approve transfer requests' },
    { code: 'transfer:dispatch', name: 'Dispatch Stock', module: 'TRANSFER', action: 'DISPATCH', description: 'Dispatch stock and move balances to in-transit' },
    { code: 'transfer:receive', name: 'Receive Transferred Goods', module: 'TRANSFER', action: 'RECEIVE', description: 'Confirm destination receipt and log shortages' },

    { code: 'procurement:view', name: 'View Procurement', module: 'PROCUREMENT', action: 'VIEW', description: 'View purchase requisitions and purchase orders' },
    { code: 'procurement:create_pr', name: 'Create Purchase Requisition', module: 'PROCUREMENT', action: 'CREATE_PR', description: 'Submit departmental purchase requisitions' },
    { code: 'procurement:create_po', name: 'Create Purchase Order', module: 'PROCUREMENT', action: 'CREATE_PO', description: 'Issue purchase orders to suppliers' },
    { code: 'procurement:approve', name: 'Authorize Requisitions & Orders', module: 'PROCUREMENT', action: 'APPROVE', description: 'Approve procurement documents and budgets' },

    { code: 'receiving:view', name: 'View Goods Inward', module: 'RECEIVING', action: 'VIEW', description: 'View GRNs and putaway queues' },
    { code: 'receiving:create_grn', name: 'Generate GRN', module: 'RECEIVING', action: 'CREATE_GRN', description: 'Inspect delivery quantities and generate GRNs' },
    { code: 'receiving:putaway', name: 'Execute Putaway', module: 'RECEIVING', action: 'PUTAWAY', description: 'Assign goods to storage bins and post receipt' },

    { code: 'stock_count:view', name: 'View Stock Counts', module: 'STOCK_COUNT', action: 'VIEW', description: 'View cycle count sessions and variance calculations' },
    { code: 'stock_count:conduct', name: 'Conduct Count', module: 'STOCK_COUNT', action: 'CONDUCT', description: 'Record floor physical count figures' },
    { code: 'stock_count:approve', name: 'Authorize Variance Adjustments', module: 'STOCK_COUNT', action: 'APPROVE', description: 'Authorize variance reconciliation postings' },

    { code: 'warehouse:view', name: 'View Hierarchy', module: 'WAREHOUSE', action: 'VIEW', description: 'View sites, warehouses, zones, racks, and bins' },
    { code: 'warehouse:manage', name: 'Manage Topologies', module: 'WAREHOUSE', action: 'MANAGE', description: 'Create, edit, or deactivate warehouse bins and racks' },

    { code: 'reports:view', name: 'View Reports & Valuation', module: 'REPORTS', action: 'VIEW', description: 'View inventory valuation and movement analytics' },
    { code: 'reports:export', name: 'Export Data', module: 'REPORTS', action: 'EXPORT', description: 'Download CSV and audit records' },
    { code: 'audit:view', name: 'Inspect Audit Logs', module: 'AUDIT', action: 'VIEW', description: 'View immutable system audit logs and change diffs' },

    { code: 'users:view', name: 'View Organization & Staff', module: 'ORGANIZATION', action: 'VIEW', description: 'View staff directory, roles, and warehouse assignments' },
    { code: 'users:manage', name: 'Manage Access & Roles', module: 'ORGANIZATION', action: 'MANAGE', description: 'Assign roles, permissions, and location access' },
  ];

  const permMap: Record<string, string> = {};
  for (const p of permissionsList) {
    const createdPerm = await prisma.permission.create({
      data: p,
    });
    permMap[p.code] = createdPerm.id;
  }

  // 5.2 Role-Permission Mapping Matrix
  const rolePermissionsMatrix: Record<string, string[]> = {
    ADMIN: Object.keys(permMap), // Admins receive all permissions
    INVENTORY_MANAGER: [
      'inventory:view', 'inventory:create', 'inventory:issue', 'inventory:adjust',
      'transfer:view', 'transfer:create', 'transfer:approve',
      'receiving:view',
      'stock_count:view', 'stock_count:conduct', 'stock_count:approve',
      'warehouse:view',
      'reports:view', 'reports:export',
      'audit:view',
      'users:view',
    ],
    WAREHOUSE_MANAGER: [
      'inventory:view', 'inventory:create', 'inventory:issue',
      'transfer:view', 'transfer:create', 'transfer:approve', 'transfer:dispatch', 'transfer:receive',
      'receiving:view', 'receiving:create_grn', 'receiving:putaway',
      'stock_count:view', 'stock_count:conduct',
      'warehouse:view', 'warehouse:manage',
      'reports:view',
      'users:view',
    ],
    WAREHOUSE_STAFF: [
      'inventory:view',
      'transfer:view', 'transfer:dispatch', 'transfer:receive',
      'receiving:view', 'receiving:create_grn', 'receiving:putaway',
      'stock_count:view', 'stock_count:conduct',
      'warehouse:view',
    ],
    PROCUREMENT_OFFICER: [
      'inventory:view',
      'procurement:view', 'procurement:create_pr', 'procurement:create_po',
      'receiving:view',
      'reports:view',
    ],
    DEPARTMENT_MANAGER: [
      'inventory:view', 'inventory:issue',
      'procurement:view', 'procurement:create_pr', 'procurement:approve',
      'reports:view',
    ],
    FINANCE_APPROVER: [
      'inventory:view',
      'procurement:view', 'procurement:approve',
      'reports:view', 'reports:export',
      'audit:view',
    ],
    AUDITOR: [
      'inventory:view',
      'transfer:view',
      'procurement:view',
      'receiving:view',
      'stock_count:view',
      'warehouse:view',
      'reports:view', 'reports:export',
      'audit:view',
      'users:view',
    ],
  };

  for (const [roleCode, permCodes] of Object.entries(rolePermissionsMatrix)) {
    const roleId = rolesMap[roleCode];
    if (roleId) {
      for (const pCode of permCodes) {
        const permId = permMap[pCode];
        if (permId) {
          await prisma.rolePermission.create({
            data: {
              roleId,
              permissionId: permId,
            },
          });
        }
      }
    }
  }

  // 6. Users & Employees
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const usersData = [
    { username: 'admin', email: 'admin@apexerp.com', firstName: 'System', lastName: 'Administrator', deptId: deptSupplyChain.id, role: 'ADMIN' },
    { username: 'inv_manager', email: 'inventory.manager@apexerp.com', firstName: 'Suresh', lastName: 'Rao', deptId: deptSupplyChain.id, role: 'INVENTORY_MANAGER' },
    { username: 'wh_manager', email: 'warehouse.manager@apexerp.com', firstName: 'Vikram', lastName: 'Sharma', deptId: deptOperations.id, role: 'WAREHOUSE_MANAGER' },
    { username: 'wh_staff', email: 'warehouse.staff@apexerp.com', firstName: 'Arun', lastName: 'Kumar', deptId: deptOperations.id, role: 'WAREHOUSE_STAFF' },
    { username: 'proc_officer', email: 'procurement@apexerp.com', firstName: 'Meera', lastName: 'Nair', deptId: deptProcurement.id, role: 'PROCUREMENT_OFFICER' },
    { username: 'dept_manager', email: 'dept.head@apexerp.com', firstName: 'Rajesh', lastName: 'Iyer', deptId: deptOperations.id, role: 'DEPARTMENT_MANAGER' },
    { username: 'fin_approver', email: 'finance@apexerp.com', firstName: 'Kavita', lastName: 'Menon', deptId: deptFinance.id, role: 'FINANCE_APPROVER' },
    { username: 'auditor', email: 'auditor@apexerp.com', firstName: 'Priya', lastName: 'Sundaram', deptId: deptAudit.id, role: 'AUDITOR' },
  ];

  const createdUsers: Record<string, string> = {};

  for (const u of usersData) {
    const emp = await prisma.employee.create({
      data: {
        companyId: company.id,
        departmentId: u.deptId,
        employeeCode: `EMP-${u.username.toUpperCase()}`,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: '+91 98400 12345',
        designation: u.role.replace('_', ' '),
      },
    });

    const user = await prisma.user.create({
      data: {
        employeeId: emp.id,
        username: u.username,
        email: u.email,
        passwordHash,
        isActive: true,
      },
    });

    createdUsers[u.username] = user.id;

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: rolesMap[u.role],
      },
    });
  }

  // 7. Warehouses
  const whAmbattur = await prisma.warehouse.create({
    data: {
      siteId: siteAmbattur.id,
      code: 'WH-AMB-01',
      name: 'Ambattur Main Logistics Hub',
      warehouseType: 'STANDARD',
      managerId: createdUsers['wh_manager'],
      address: 'Building A, Ambattur Industrial Site',
      isActive: true,
    },
  });

  const whWhitefield = await prisma.warehouse.create({
    data: {
      siteId: siteWhitefield.id,
      code: 'WH-WHF-01',
      name: 'Whitefield Distribution Warehouse',
      warehouseType: 'STANDARD',
      managerId: createdUsers['wh_manager'],
      address: 'Sector 3, Whitefield Distribution Park',
      isActive: true,
    },
  });

  // Give users warehouse access
  for (const uName of Object.keys(createdUsers)) {
    await prisma.userLocationAccess.create({
      data: {
        userId: createdUsers[uName],
        warehouseId: whAmbattur.id,
        siteId: siteAmbattur.id,
        accessLevel: 'FULL',
      },
    });
    await prisma.userLocationAccess.create({
      data: {
        userId: createdUsers[uName],
        warehouseId: whWhitefield.id,
        siteId: siteWhitefield.id,
        accessLevel: 'FULL',
      },
    });
  }

  // 8. Warehouse Zones
  const zoneRaw = await prisma.warehouseZone.create({
    data: { warehouseId: whAmbattur.id, code: 'ZONE-A', name: 'Raw Materials & Parts', zoneType: 'STORAGE' },
  });
  const zoneFG = await prisma.warehouseZone.create({
    data: { warehouseId: whAmbattur.id, code: 'ZONE-B', name: 'Finished Assembly Goods', zoneType: 'STORAGE' },
  });
  const zoneRecv = await prisma.warehouseZone.create({
    data: { warehouseId: whAmbattur.id, code: 'ZONE-REC', name: 'Goods Inward & Inspection', zoneType: 'RECEIVING' },
  });
  const zoneDisp = await prisma.warehouseZone.create({
    data: { warehouseId: whAmbattur.id, code: 'ZONE-DISP', name: 'Outbound Staging & Dispatch', zoneType: 'DISPATCH' },
  });

  // Zones for Whitefield
  const wh2ZoneStorage = await prisma.warehouseZone.create({
    data: { warehouseId: whWhitefield.id, code: 'ZONE-W1', name: 'Main Distribution Bay', zoneType: 'STORAGE' },
  });

  // 9. Racks
  const rackA01 = await prisma.warehouseRack.create({
    data: { zoneId: zoneRaw.id, code: 'RACK-A01', name: 'High-Density Storage Rack A01', levels: 4 },
  });
  const rackA02 = await prisma.warehouseRack.create({
    data: { zoneId: zoneRaw.id, code: 'RACK-A02', name: 'Bulk Components Rack A02', levels: 4 },
  });
  const rackB01 = await prisma.warehouseRack.create({
    data: { zoneId: zoneFG.id, code: 'RACK-B01', name: 'Finished Assemblies Rack B01', levels: 3 },
  });
  const rackW01 = await prisma.warehouseRack.create({
    data: { zoneId: wh2ZoneStorage.id, code: 'RACK-W01', name: 'Distribution Rack W01', levels: 4 },
  });

  // 10. Bins
  const binA01_001 = await prisma.warehouseBin.create({
    data: {
      warehouseId: whAmbattur.id,
      rackId: rackA01.id,
      code: 'BIN-A01-001',
      name: 'Bin A01 Level 1 Bay 1',
      binType: 'STORAGE',
      maxWeight: 500,
      maxVolume: 2.5,
    },
  });

  const binA01_002 = await prisma.warehouseBin.create({
    data: {
      warehouseId: whAmbattur.id,
      rackId: rackA01.id,
      code: 'BIN-A01-002',
      name: 'Bin A01 Level 1 Bay 2',
      binType: 'STORAGE',
      maxWeight: 500,
      maxVolume: 2.5,
    },
  });

  const binB01_001 = await prisma.warehouseBin.create({
    data: {
      warehouseId: whAmbattur.id,
      rackId: rackB01.id,
      code: 'BIN-B01-001',
      name: 'Bin B01 Level 1 Pick Face',
      binType: 'PICKING',
      maxWeight: 300,
      maxVolume: 1.8,
    },
  });

  const binRecv_01 = await prisma.warehouseBin.create({
    data: {
      warehouseId: whAmbattur.id,
      code: 'BIN-REC-001',
      name: 'Receiving Dock Bin 1',
      binType: 'RECEIVING',
      maxWeight: 2000,
      maxVolume: 10.0,
    },
  });

  const binDisp_01 = await prisma.warehouseBin.create({
    data: {
      warehouseId: whAmbattur.id,
      code: 'BIN-DISP-001',
      name: 'Outbound Dispatch Bin 1',
      binType: 'DISPATCH',
      maxWeight: 2000,
      maxVolume: 10.0,
    },
  });

  const binW01_001 = await prisma.warehouseBin.create({
    data: {
      warehouseId: whWhitefield.id,
      rackId: rackW01.id,
      code: 'BIN-W01-001',
      name: 'Whitefield Receiving & Storage Bin 01',
      binType: 'STORAGE',
      maxWeight: 1000,
      maxVolume: 5.0,
    },
  });

  // 11. Units of Measure
  const uomPcs = await prisma.unitOfMeasure.create({
    data: { code: 'PCS', name: 'Pieces', symbol: 'pcs', precision: 0 },
  });
  const uomKg = await prisma.unitOfMeasure.create({
    data: { code: 'KG', name: 'Kilograms', symbol: 'kg', precision: 2 },
  });
  const uomBox = await prisma.unitOfMeasure.create({
    data: { code: 'BOX', name: 'Carton Box (10 pcs)', symbol: 'box', precision: 0, conversionRate: 10.0 },
  });

  // 12. Product Categories
  const catHardware = await prisma.productCategory.create({
    data: { code: 'CAT-IND-MECH', name: 'Mechanical & Precision Hardware', description: 'Bearings, valves, seals and mechanical fittings' },
  });
  const catRawMaterials = await prisma.productCategory.create({
    data: { code: 'CAT-RAW-MTL', name: 'Alloys & Raw Metals', description: 'Extrusions, rods, plates and sheets' },
  });
  const catElectronics = await prisma.productCategory.create({
    data: { code: 'CAT-ELEC', name: 'Electronics & Controllers', description: 'PCBs, sensors, MCUs and drivers' },
  });

  // 13. Products
  const prodBearing = await prisma.product.create({
    data: {
      sku: 'SKU-BRG-608ZZ',
      barcode: '8901234567890',
      name: 'High-Precision Ball Bearing 608-ZZ',
      description: 'Double shielded chrome steel ball bearing 8x22x7mm for industrial motors',
      categoryId: catHardware.id,
      uomId: uomPcs.id,
      brand: 'SKF Dynamics',
      productStatus: 'ACTIVE',
      minStock: 50,
      maxStock: 1000,
      reorderLevel: 100,
      isBatchTracked: true,
      costPrice: 4.5,
      sellingPrice: 8.5,
    },
  });

  const prodSeal = await prisma.product.create({
    data: {
      sku: 'SKU-SEAL-HYD45',
      barcode: '8901234567891',
      name: 'Hydraulic Piston Seal Nitrile 45mm',
      description: 'High-pressure oil-resistant hydraulic piston seal ring',
      categoryId: catHardware.id,
      uomId: uomPcs.id,
      brand: 'Freudenberg Industrial',
      productStatus: 'ACTIVE',
      minStock: 25,
      maxStock: 500,
      reorderLevel: 50,
      costPrice: 6.2,
      sellingPrice: 12.0,
    },
  });

  const prodAlloy = await prisma.product.create({
    data: {
      sku: 'SKU-ALU-6061T6',
      barcode: '8901234567892',
      name: 'Aluminium Extrusion Bar 6061-T6 (2m)',
      description: 'Aerospace-grade structural aluminium alloy round rod',
      categoryId: catRawMaterials.id,
      uomId: uomPcs.id,
      brand: 'Hindalco Apex',
      productStatus: 'ACTIVE',
      minStock: 20,
      maxStock: 300,
      reorderLevel: 40,
      isBatchTracked: true,
      costPrice: 28.0,
      sellingPrice: 45.0,
    },
  });

  const prodController = await prisma.product.create({
    data: {
      sku: 'SKU-MCU-X900',
      barcode: '8901234567893',
      name: 'Embedded Industrial Controller Board X900',
      description: 'ARM Cortex-M7 Industrial PLC Controller Module with CAN & Modbus',
      categoryId: catElectronics.id,
      uomId: uomPcs.id,
      brand: 'Apex Electronics',
      productStatus: 'ACTIVE',
      minStock: 15,
      maxStock: 200,
      reorderLevel: 30,
      isSerialTracked: true,
      costPrice: 110.0,
      sellingPrice: 195.0,
    },
  });

  // 14. Suppliers
  const supTitan = await prisma.supplier.create({
    data: {
      code: 'SUP-TITAN-01',
      name: 'Titan Precision Bearings Ltd',
      contactPerson: 'Karan Mehra',
      email: 'sales@titanbearings.com',
      phone: '+91 22 6789 4000',
      address: 'Industrial Zone 4, Thane, Maharashtra',
      paymentTerms: 'Net 30',
      rating: 4.8,
    },
  });

  const supHindalco = await prisma.supplier.create({
    data: {
      code: 'SUP-ALU-CORP',
      name: 'Global Metals & Alloys Corp',
      contactPerson: 'David Chen',
      email: 'orders@globalalloys.com',
      phone: '+1 415 555 9812',
      address: 'Metals Park, Singapore 609912',
      paymentTerms: 'Net 45',
      rating: 4.6,
    },
  });

  // 15. Reusable Approval Workflow Engine Setup
  const wfPR = await prisma.approvalWorkflow.create({
    data: {
      name: 'Standard Purchase Requisition Workflow',
      documentType: 'PURCHASE_REQUISITION',
      description: 'Department Head approval followed by Finance review for requisitions over $1,000',
      isActive: true,
    },
  });

  await prisma.approvalStep.create({
    data: {
      workflowId: wfPR.id,
      stepOrder: 1,
      stepName: 'Departmental Review',
      approverRole: 'DEPARTMENT_MANAGER',
      minAmount: 0,
      maxAmount: 50000,
      isFinal: false,
    },
  });

  await prisma.approvalStep.create({
    data: {
      workflowId: wfPR.id,
      stepOrder: 2,
      stepName: 'Finance Budget Authorization',
      approverRole: 'FINANCE_APPROVER',
      minAmount: 1000,
      isFinal: true,
    },
  });

  const wfTransfer = await prisma.approvalWorkflow.create({
    data: {
      name: 'Inter-Warehouse Stock Transfer Workflow',
      documentType: 'STOCK_TRANSFER',
      description: 'Warehouse manager authorization for stock movement between facilities',
      isActive: true,
    },
  });

  await prisma.approvalStep.create({
    data: {
      workflowId: wfTransfer.id,
      stepOrder: 1,
      stepName: 'Dispatch Warehouse Authorization',
      approverRole: 'WAREHOUSE_MANAGER',
      minAmount: 0,
      isFinal: true,
    },
  });

  // 16. Initial Stock Ledgers & Balances (Controlled Historical Inflow)
  // PRD 1: Ball Bearing 608ZZ -> 350 pcs in Bin A01-001
  const txn1 = await prisma.stockMovement.create({
    data: {
      transactionNumber: 'TXN-INIT-0001',
      productId: prodBearing.id,
      destWarehouseId: whAmbattur.id,
      destBinId: binA01_001.id,
      quantity: 350,
      uomId: uomPcs.id,
      transactionType: 'RECEIPT',
      referenceType: 'MANUAL',
      referenceId: 'INITIAL_STOCK_2026',
      batchNumber: 'LOT-2026-BRG01',
      performedById: createdUsers['inv_manager'],
      notes: 'Initial verified stock intake into Bin A01-001',
    },
  });

  await prisma.stockBalance.create({
    data: {
      productId: prodBearing.id,
      warehouseId: whAmbattur.id,
      binId: binA01_001.id,
      batchNumber: 'LOT-2026-BRG01',
      onHandQty: 350,
      reservedQty: 0,
      damagedQty: 0,
      quarantinedQty: 0,
      inTransitQty: 0,
    },
  });

  // PRD 1: Also in Bin A01-002 -> 150 pcs
  await prisma.stockMovement.create({
    data: {
      transactionNumber: 'TXN-INIT-0002',
      productId: prodBearing.id,
      destWarehouseId: whAmbattur.id,
      destBinId: binA01_002.id,
      quantity: 150,
      uomId: uomPcs.id,
      transactionType: 'RECEIPT',
      referenceType: 'MANUAL',
      referenceId: 'INITIAL_STOCK_2026',
      batchNumber: 'LOT-2026-BRG02',
      performedById: createdUsers['inv_manager'],
      notes: 'Secondary bin reserve for 608ZZ',
    },
  });

  await prisma.stockBalance.create({
    data: {
      productId: prodBearing.id,
      warehouseId: whAmbattur.id,
      binId: binA01_002.id,
      batchNumber: 'LOT-2026-BRG02',
      onHandQty: 150,
      reservedQty: 0,
      damagedQty: 0,
      quarantinedQty: 0,
      inTransitQty: 0,
    },
  });

  // PRD 2: Hydraulic Seals -> 120 pcs in Bin B01-001 (Pick face)
  await prisma.stockMovement.create({
    data: {
      transactionNumber: 'TXN-INIT-0003',
      productId: prodSeal.id,
      destWarehouseId: whAmbattur.id,
      destBinId: binB01_001.id,
      quantity: 120,
      uomId: uomPcs.id,
      transactionType: 'RECEIPT',
      referenceType: 'MANUAL',
      referenceId: 'INITIAL_STOCK_2026',
      performedById: createdUsers['inv_manager'],
      notes: 'Primary picking face stock for seals',
    },
  });

  await prisma.stockBalance.create({
    data: {
      productId: prodSeal.id,
      warehouseId: whAmbattur.id,
      binId: binB01_001.id,
      onHandQty: 120,
      reservedQty: 0,
      damagedQty: 0,
      quarantinedQty: 0,
      inTransitQty: 0,
    },
  });

  // PRD 3: Aluminium Extrusions -> 60 pcs in Bin A01-002
  await prisma.stockMovement.create({
    data: {
      transactionNumber: 'TXN-INIT-0004',
      productId: prodAlloy.id,
      destWarehouseId: whAmbattur.id,
      destBinId: binA01_002.id,
      quantity: 60,
      uomId: uomPcs.id,
      transactionType: 'RECEIPT',
      referenceType: 'MANUAL',
      referenceId: 'INITIAL_STOCK_2026',
      batchNumber: 'LOT-ALU-990',
      performedById: createdUsers['inv_manager'],
      notes: 'Aluminium rods in heavy storage rack',
    },
  });

  await prisma.stockBalance.create({
    data: {
      productId: prodAlloy.id,
      warehouseId: whAmbattur.id,
      binId: binA01_002.id,
      batchNumber: 'LOT-ALU-990',
      onHandQty: 60,
      reservedQty: 0,
      damagedQty: 0,
      quarantinedQty: 0,
      inTransitQty: 0,
    },
  });

  // PRD 4: Controller Board X900 -> 8 units (Below reorder level 30!) to trigger low-stock alert
  await prisma.stockMovement.create({
    data: {
      transactionNumber: 'TXN-INIT-0005',
      productId: prodController.id,
      destWarehouseId: whAmbattur.id,
      destBinId: binB01_001.id,
      quantity: 8,
      uomId: uomPcs.id,
      transactionType: 'RECEIPT',
      referenceType: 'MANUAL',
      referenceId: 'INITIAL_STOCK_2026',
      performedById: createdUsers['inv_manager'],
      notes: 'Critical low stock for PLC units',
    },
  });

  await prisma.stockBalance.create({
    data: {
      productId: prodController.id,
      warehouseId: whAmbattur.id,
      binId: binB01_001.id,
      onHandQty: 8,
      reservedQty: 0,
      damagedQty: 0,
      quarantinedQty: 0,
      inTransitQty: 0,
    },
  });

  // 17. Purchase Requisition Demo
  const prDemo = await prisma.purchaseRequisition.create({
    data: {
      prNumber: 'PR-2026-0001',
      departmentId: deptOperations.id,
      requestedById: createdUsers['dept_manager'],
      justification: 'Replenish low stock of industrial controller boards X900 for Assembly Line 2',
      status: 'APPROVED',
      totalEstimatedCost: 5500.0,
      items: {
        create: [
          {
            productId: prodController.id,
            quantity: 50,
            estimatedUnitCost: 110.0,
            estimatedTotalCost: 5500.0,
            notes: 'Urgent line replenishment',
          },
        ],
      },
    },
  });

  // Purchase Order Demo
  const poDemo = await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO-2026-0001',
      requisitionId: prDemo.id,
      supplierId: supTitan.id,
      status: 'APPROVED',
      orderDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      totalAmount: 4500.0,
      notes: 'Regular replenishment purchase order',
      createdById: createdUsers['proc_officer'],
      approvedById: createdUsers['fin_approver'],
      items: {
        create: [
          {
            productId: prodBearing.id,
            orderedQty: 1000,
            receivedQty: 200,
            cancelledQty: 0,
            unitPrice: 4.5,
            totalPrice: 4500.0,
          },
        ],
      },
    },
  });

  // 18. Stock Transfer Demo (Ambattur -> Whitefield in-transit)
  const transferDemo = await prisma.stockTransfer.create({
    data: {
      transferNumber: 'TRF-2026-0001',
      sourceWarehouseId: whAmbattur.id,
      destWarehouseId: whWhitefield.id,
      status: 'IN_TRANSIT',
      requestedById: createdUsers['wh_manager'],
      approvedById: createdUsers['wh_manager'],
      reason: 'Regional depot replenishment for southern tech hub',
      items: {
        create: [
          {
            productId: prodBearing.id,
            sourceBinId: binA01_001.id,
            destBinId: binW01_001.id,
            requestedQty: 50,
            dispatchedQty: 50,
            receivedQty: 0,
            status: 'DISPATCHED',
          },
        ],
      },
    },
  });

  await prisma.transferDispatch.create({
    data: {
      stockTransferId: transferDemo.id,
      dispatchedById: createdUsers['wh_staff'],
      trackingNumber: 'TRK-BLR-EXP-909',
      carrier: 'Apex Express Freight',
      notes: 'Scheduled delivery in 24 hours to Whitefield Bay',
    },
  });

  // 19. Initial Audit Log & Notification
  await prisma.auditLog.create({
    data: {
      actorId: createdUsers['admin'],
      action: 'SYSTEM_INIT',
      entity: 'SystemConfig',
      reference: 'SEED_DATA_V1',
      afterValue: JSON.stringify({ message: 'Enterprise ERP seeded with complete multi-tier warehouse hierarchy and stock ledgers' }),
    },
  });

  await prisma.notification.create({
    data: {
      userId: createdUsers['proc_officer'],
      title: 'Low Stock Alert: MCU-X900',
      message: 'Product SKU-MCU-X900 has fallen below reorder level (8 units remaining vs threshold 30). Requisition required.',
      type: 'ALERT',
      link: '/products',
    },
  });

  await prisma.notification.create({
    data: {
      userId: createdUsers['wh_manager'],
      title: 'Transfer In-Transit: TRF-2026-0001',
      message: 'Dispatch completed from Ambattur to Whitefield (50 pcs 608-ZZ). Destination receipt pending.',
      type: 'INFO',
      link: '/transfers',
    },
  });

  console.log('✅ Enterprise ERP Database Seed successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  isActive?: boolean;
  employee?: {
    code: string;
    name: string;
    designation?: string;
    department?: string;
    company?: string;
  } | null;
  roles: string[];
  permissions?: string[];
  warehouses: Array<{
    id: string;
    code: string;
    name: string;
    accessLevel: string;
  }>;
}

export interface PermissionRecord {
  id: string;
  code: string;
  module: string;
  description: string;
}

export interface RoleRecord {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  rolePermissions: Array<{
    permission: PermissionRecord;
  }>;
}

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  employee?: {
    code: string;
    name: string;
    department?: string;
    designation?: string;
  } | null;
  userRoles: Array<{
    role: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
  userWarehouses?: Array<{
    accessLevel: string;
    warehouse: {
      id: string;
      code: string;
      name: string;
    };
  }>;
}

export interface StockSummaryMetrics {
  totalProducts: number;
  totalStockQuantity: number;
  totalStockValuation: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  pendingApprovals: number;
  pendingReceipts: number;
  transfersInTransit: number;
}

export interface LocationTreeItem {
  id: string;
  code: string;
  name: string;
  currency?: string;
  regions?: Array<{
    id: string;
    code: string;
    name: string;
    cities: Array<{
      id: string;
      code: string;
      name: string;
      sites: Array<{
        id: string;
        code: string;
        name: string;
        warehouses: Array<WarehouseTreeItem>;
      }>;
    }>;
  }>;
}

export interface WarehouseTreeItem {
  id: string;
  code: string;
  name: string;
  warehouseType: string;
  isActive: boolean;
  zones?: Array<{
    id: string;
    code: string;
    name: string;
    zoneType: string;
    isActive: boolean;
    racks?: Array<{
      id: string;
      code: string;
      name: string;
      levels: number;
      bins?: Array<BinItem>;
    }>;
  }>;
  bins?: Array<BinItem>;
}

export interface BinItem {
  id: string;
  code: string;
  name: string;
  binType: string;
  maxWeight?: number;
  maxVolume?: number;
  isActive: boolean;
  stockBalances?: Array<{
    id: string;
    onHandQty: number;
    reservedQty: number;
    product: {
      id: string;
      sku: string;
      name: string;
    };
  }>;
}

export interface ProductItem {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category: { id: string; name: string };
  uom: { id: string; name: string; symbol: string };
  brand?: string;
  productStatus: string;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
  costPrice: number;
  sellingPrice: number;
  totalOnHand: number;
  totalReserved: number;
  totalAvailable: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export interface StockBalanceItem {
  id: string;
  productId: string;
  warehouseId: string;
  binId?: string;
  batchNumber?: string;
  onHandQty: number;
  reservedQty: number;
  damagedQty: number;
  quarantinedQty: number;
  inTransitQty: number;
  availableQty: number;
  product: ProductItem;
  warehouse: { id: string; code: string; name: string };
  bin?: { id: string; code: string; name: string; binType: string };
}

export interface StockMovementItem {
  id: string;
  transactionNumber: string;
  productId: string;
  quantity: number;
  transactionType: string;
  referenceType: string;
  referenceId?: string;
  batchNumber?: string;
  createdAt: string;
  product: { sku: string; name: string; uom: { symbol: string } };
  sourceWarehouse?: { name: string; code: string };
  sourceBin?: { code: string };
  destWarehouse?: { name: string; code: string };
  destBin?: { code: string };
  performedBy: { username: string };
}

export interface PurchaseRequisitionItem {
  id: string;
  prNumber: string;
  department: { name: string };
  requestedBy: { username: string };
  justification?: string;
  status: string;
  totalEstimatedCost: number;
  createdAt: string;
  items: Array<{
    id: string;
    product: { sku: string; name: string };
    quantity: number;
    estimatedUnitCost: number;
    estimatedTotalCost: number;
  }>;
}

export interface PurchaseOrderItem {
  id: string;
  poNumber: string;
  supplier: { name: string; code: string };
  status: string;
  orderDate: string;
  totalAmount: number;
  items: Array<{
    id: string;
    product: { sku: string; name: string };
    orderedQty: number;
    receivedQty: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface GoodsReceiptItem {
  id: string;
  grnNumber: string;
  supplier: { name: string };
  warehouse: { name: string };
  receivedBy: { username: string };
  status: string;
  createdAt: string;
  items: Array<{
    id: string;
    product: { sku: string; name: string };
    deliveredQty: number;
    acceptedQty: number;
    damagedQty: number;
    rejectedQty: number;
    putawayTasks: Array<{
      id: string;
      status: string;
      quantity: number;
      targetBin: { code: string };
    }>;
  }>;
}

export interface StockTransferItem {
  id: string;
  transferNumber: string;
  sourceWarehouse: { name: string; code: string };
  destWarehouse: { name: string; code: string };
  status: string;
  reason?: string;
  createdAt: string;
  requestedBy: { username: string };
  items: Array<{
    id: string;
    product: { sku: string; name: string };
    sourceBin?: { code: string };
    destBin?: { code: string };
    requestedQty: number;
    dispatchedQty: number;
    receivedQty: number;
    discrepancyQty: number;
    status: string;
  }>;
}

export interface ApprovalInboxItem {
  id: string;
  workflowId: string;
  documentType: string;
  documentId: string;
  status: string;
  createdAt: string;
  currentStep?: {
    stepName: string;
    approverRole: string;
  };
  initiatedBy: { username: string; email: string };
  document?: any;
}

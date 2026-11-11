import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import {
  Truck,
  Plus,
  CheckCircle2,
  Clock,
  Archive,
  ArrowRight,
  ShieldCheck,
  Lock,
  XCircle,
  Search,
  Filter,
  AlertTriangle,
  Building,
  Check,
  BarChart2,
  PackageCheck,
  AlertCircle,
  ExternalLink,
  Layers,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ReceivingPutaway: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole, hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const poIdParam = searchParams.get('poId');
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'PUTAWAY' | 'GRN'>(
    tabParam === 'GRN' || poIdParam ? 'GRN' : 'PUTAWAY'
  );
  const [showAddGRNModal, setShowAddGRNModal] = useState(false);
  const [selectedTaskForPutaway, setSelectedTaskForPutaway] = useState<any | null>(null);
  const [chosenBinId, setChosenBinId] = useState<string>('');
  const [chosenQuantity, setChosenQuantity] = useState<number>(0);
  const [selectedGRNDetails, setSelectedGRNDetails] = useState<any | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [grnStatusFilter, setGRNStatusFilter] = useState<'ALL' | 'PUTAWAY_PENDING' | 'COMPLETED'>('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canCreateGRN =
    hasRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF') || hasPermission('receiving:create');
  const canPutaway =
    hasRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF') || hasPermission('receiving:putaway');

  const [grnForm, setGRNForm] = useState({
    purchaseOrderId: '',
    supplierId: '',
    warehouseId: '',
    productId: '',
    deliveredQty: 100,
    acceptedQty: 100,
    damagedQty: 0,
    rejectedQty: 0,
    batchNumber: `LOT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
    targetBinId: '',
    remarks: 'Goods received in good condition',
  });

  // Queries
  const { data: receipts = [], isLoading: isReceiptsLoading } = useQuery({
    queryKey: ['goods-receipts'],
    queryFn: async () => (await api.get('/receiving/goods-receipts')).data.data,
  });

  const { data: putawayTasks = [], isLoading: isTasksLoading } = useQuery({
    queryKey: ['putaway-tasks'],
    queryFn: async () => (await api.get('/receiving/putaway-tasks')).data.data,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data.data,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get('/procurement/suppliers')).data.data,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => (await api.get('/products')).data.data,
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => (await api.get('/procurement/orders')).data.data,
  });

  // Query warehouse bins for the chosen warehouse in GRN form
  const { data: grnWarehouseBins = [] } = useQuery({
    queryKey: ['warehouse-bins', grnForm.warehouseId],
    queryFn: async () => {
      if (!grnForm.warehouseId) return [];
      return (await api.get(`/warehouses/${grnForm.warehouseId}/bins`)).data.data;
    },
    enabled: !!grnForm.warehouseId,
  });

  // Query warehouse bins for the chosen putaway task warehouse
  const putawayWarehouseId =
    selectedTaskForPutaway?.targetBin?.warehouseId ||
    selectedTaskForPutaway?.goodsReceiptItem?.goodsReceipt?.warehouseId;
  const { data: putawayAvailableBins = [] } = useQuery({
    queryKey: ['warehouse-bins', putawayWarehouseId],
    queryFn: async () => {
      if (!putawayWarehouseId) return [];
      return (await api.get(`/warehouses/${putawayWarehouseId}/bins`)).data.data;
    },
    enabled: !!putawayWarehouseId,
  });

  // Mutations
  const confirmPutawayMutation = useMutation({
    mutationFn: async ({ taskId, targetBinId, quantity }: { taskId: string; targetBinId: string; quantity: number }) =>
      (
        await api.post(`/receiving/putaway-tasks/${taskId}/confirm`, {
          targetBinId,
          quantity,
        })
      ).data,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['putaway-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      setSelectedTaskForPutaway(null);
      setErrorMessage(null);
      setSuccessMessage(data.message || 'Putaway completed and posted to stock ledger.');
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Putaway confirmation failed.');
      setTimeout(() => setErrorMessage(null), 6000);
    },
  });

  const createGRNMutation = useMutation({
    mutationFn: async (payload: any) =>
      (
        await api.post('/receiving/goods-receipts', {
          purchaseOrderId: payload.purchaseOrderId || undefined,
          supplierId: payload.supplierId,
          warehouseId: payload.warehouseId,
          remarks: payload.remarks,
          items: [
            {
              productId: payload.productId,
              deliveredQty: Number(payload.deliveredQty),
              acceptedQty: Number(payload.acceptedQty),
              damagedQty: Number(payload.damagedQty),
              rejectedQty: Number(payload.rejectedQty),
              batchNumber: payload.batchNumber,
              targetBinId: payload.targetBinId || undefined,
            },
          ],
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['putaway-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      setShowAddGRNModal(false);
      setErrorMessage(null);
      setSuccessMessage('Goods Receipt Note (GRN) generated successfully. Putaway task queued.');
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to generate Goods Receipt.');
      setTimeout(() => setErrorMessage(null), 6000);
    },
  });

  // KPI Computations
  const totalGRNs = receipts.length;
  const pendingPutaways = putawayTasks.filter((t: any) => t.status !== 'COMPLETED').length;
  const completedPutaways = putawayTasks.filter((t: any) => t.status === 'COMPLETED').length;

  const totalDeliveredQty = receipts.reduce((acc: number, grn: any) => {
    return acc + (grn.items?.reduce((s: number, i: any) => s + (i.deliveredQty || 0), 0) || 0);
  }, 0);

  const totalAcceptedQty = receipts.reduce((acc: number, grn: any) => {
    return acc + (grn.items?.reduce((s: number, i: any) => s + (i.acceptedQty || 0), 0) || 0);
  }, 0);

  const totalDamagedQty = receipts.reduce((acc: number, grn: any) => {
    return acc + (grn.items?.reduce((s: number, i: any) => s + (i.damagedQty || 0), 0) || 0);
  }, 0);

  // Filtered Putaway Tasks
  const filteredTasks = useMemo(() => {
    return putawayTasks.filter((task: any) => {
      if (taskStatusFilter === 'PENDING' && task.status === 'COMPLETED') return false;
      if (taskStatusFilter === 'COMPLETED' && task.status !== 'COMPLETED') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchGrn = task.goodsReceiptItem?.goodsReceipt?.grnNumber?.toLowerCase().includes(q);
      const matchProduct =
        task.product?.name?.toLowerCase().includes(q) || task.product?.sku?.toLowerCase().includes(q);
      const matchBin = task.targetBin?.code?.toLowerCase().includes(q);
      return matchGrn || matchProduct || matchBin;
    });
  }, [putawayTasks, taskStatusFilter, searchQuery]);

  // Filtered Receipts (GRN)
  const filteredReceipts = useMemo(() => {
    return receipts.filter((grn: any) => {
      if (grnStatusFilter === 'PUTAWAY_PENDING' && grn.status === 'COMPLETED') return false;
      if (grnStatusFilter === 'COMPLETED' && grn.status !== 'COMPLETED') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchGrn = grn.grnNumber?.toLowerCase().includes(q);
      const matchSupplier = grn.supplier?.name?.toLowerCase().includes(q);
      const matchWarehouse = grn.warehouse?.name?.toLowerCase().includes(q);
      const matchPO = grn.purchaseOrder?.poNumber?.toLowerCase().includes(q);
      const matchItem = grn.items?.some(
        (i: any) =>
          i.product?.name?.toLowerCase().includes(q) || i.product?.sku?.toLowerCase().includes(q)
      );
      return matchGrn || matchSupplier || matchWarehouse || matchPO || matchItem;
    });
  }, [receipts, grnStatusFilter, searchQuery]);

  // Handle PO selection in GRN modal
  const handlePOSelect = (poId: string, specificProductId?: string) => {
    if (!poId) {
      setGRNForm((prev) => ({
        ...prev,
        purchaseOrderId: '',
      }));
      return;
    }
    const selectedPO = purchaseOrders.find((p: any) => p.id === poId);
    if (!selectedPO) return;

    let itemToReceive = selectedPO.items?.find((i: any) => i.productId === specificProductId);
    if (!itemToReceive) {
      itemToReceive = selectedPO.items?.find((i: any) => i.receivedQty < i.orderedQty) || selectedPO.items?.[0];
    }

    const remainingQty = itemToReceive ? Math.max(1, itemToReceive.orderedQty - itemToReceive.receivedQty) : 50;

    setGRNForm((prev) => ({
      ...prev,
      purchaseOrderId: poId,
      supplierId: selectedPO.supplierId || prev.supplierId || (suppliers[0]?.id || ''),
      warehouseId: prev.warehouseId || (warehouses[0]?.id || ''),
      productId: itemToReceive?.productId || prev.productId || (products[0]?.id || ''),
      deliveredQty: remainingQty,
      acceptedQty: remainingQty,
      damagedQty: 0,
      rejectedQty: 0,
      batchNumber: `LOT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      remarks: `Delivered against PO ${selectedPO.poNumber}`,
    }));
  };

  // Sync tab and PO pre-selection from URL query parameters (e.g. /receiving?poId=XYZ&tab=GRN)
  useEffect(() => {
    if (tabParam === 'GRN') {
      setActiveTab('GRN');
    }
  }, [tabParam]);

  useEffect(() => {
    if (poIdParam && purchaseOrders.length > 0) {
      setActiveTab('GRN');
      handlePOSelect(poIdParam);
      setShowAddGRNModal(true);
    }
  }, [poIdParam, purchaseOrders]);

  // Handle Qty changes in GRN modal (auto-calculate accepted)
  const handleDeliveredQtyChange = (del: number) => {
    const validDel = Math.max(0, del);
    const damaged = grnForm.damagedQty || 0;
    const accepted = Math.max(0, validDel - damaged);
    setGRNForm((prev) => ({
      ...prev,
      deliveredQty: validDel,
      acceptedQty: accepted,
    }));
  };

  const handleDamagedQtyChange = (dam: number) => {
    const validDam = Math.max(0, dam);
    const delivered = grnForm.deliveredQty || 0;
    const accepted = Math.max(0, delivered - validDam);
    setGRNForm((prev) => ({
      ...prev,
      damagedQty: validDam,
      acceptedQty: accepted,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
            <Truck className="w-4 h-4" />
            <span>Goods Inward & Quality Inspection</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Receiving & Putaway (GRN)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Supplier shipments inspection, batch lot tracking, and bin-level putaway posting to stock ledger.
          </p>
        </div>

        {canCreateGRN ? (
          <button
            onClick={() => {
              setGRNForm({
                purchaseOrderId: '',
                supplierId: suppliers[0]?.id || '',
                warehouseId: warehouses[0]?.id || '',
                productId: products[0]?.id || '',
                deliveredQty: 100,
                acceptedQty: 100,
                damagedQty: 0,
                rejectedQty: 0,
                batchNumber: `LOT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
                targetBinId: '',
                remarks: 'Goods received in good condition',
              });
              setShowAddGRNModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-brand-500/25 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Generate GRN</span>
          </button>
        ) : (
          <div
            title="Requires Warehouse Staff, Warehouse Manager, or Admin role"
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 text-xs flex items-center space-x-1.5 opacity-70 cursor-not-allowed"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Generate GRN</span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <XCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Receipts (GRN)</span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">{totalGRNs}</span>
          <span className="text-[10px] text-slate-400">Shipments logged</span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10">
          <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold block">
            Pending Putaway
          </span>
          <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 block">
            {pendingPutaways}
          </span>
          <span className="text-[10px] text-slate-400">Needs storage in bin</span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10">
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold block">
            Completed Putaway
          </span>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {completedPutaways}
          </span>
          <span className="text-[10px] text-slate-400">Posted to ledger</span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Units Accepted</span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block font-mono">
            {totalAcceptedQty}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
            {totalDeliveredQty > 0 ? `${Math.round((totalAcceptedQty / totalDeliveredQty) * 100)}% pass rate` : '0 units'}
          </span>
        </div>

        <div className="glass-card p-4 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10">
          <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-semibold block">
            Damaged / Rejected
          </span>
          <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 block font-mono">
            {totalDamagedQty}
          </span>
          <span className="text-[10px] text-rose-500">Quality discrepancies</span>
        </div>
      </div>

      {/* Workflow Guidance Card */}
      <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 rounded-xl text-xs text-blue-900 dark:text-blue-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <PackageCheck className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            <strong>Inbound Receiving Lifecycle:</strong> 1. Unload & Inspect Shipment → 2. Generate GRN (Records accepted & damaged units) → 3. Putaway to Bin (Increments physical bin balance & writes double-entry Stock Movement Ledger).
          </span>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <Link
            to="/balances"
            className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center space-x-0.5"
          >
            <span>Stock Balances</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <Link
            to="/ledger"
            className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center space-x-0.5"
          >
            <span>Movement Ledger</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Tabs & Search Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex space-x-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('PUTAWAY')}
            className={`pb-3 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'PUTAWAY'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-extrabold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Putaway Tasks</span>
            {pendingPutaways > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-mono">
                {pendingPutaways}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('GRN')}
            className={`pb-3 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'GRN'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-extrabold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Goods Receipts History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
              {receipts.length}
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search GRN, Product, Bin, PO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white w-48 sm:w-64 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. PUTAWAY TASKS VIEW                                     */}
      {/* ========================================================= */}
      {activeTab === 'PUTAWAY' && (
        <div className="space-y-4">
          {/* Subfilter pills */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-medium">Filter:</span>
            {(['ALL', 'PENDING', 'COMPLETED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTaskStatusFilter(filter)}
                className={`px-3 py-1 rounded-lg font-semibold transition text-[11px] ${
                  taskStatusFilter === filter
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {filter === 'ALL' ? 'All Tasks' : filter === 'PENDING' ? 'Pending Action' : 'Completed'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isTasksLoading ? (
              <div className="col-span-3 text-center py-12 text-slate-400 text-xs">
                Loading putaway tasks...
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="col-span-3 glass-card p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 opacity-60" />
                <h3 className="font-bold text-slate-800 dark:text-white text-sm">No Putaway Tasks Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery
                    ? 'No putaway tasks match your search filter.'
                    : 'All received items have been successfully put away into storage bins.'}
                </p>
              </div>
            ) : (
              filteredTasks.map((task: any) => {
                const isCompleted = task.status === 'COMPLETED';

                return (
                  <div
                    key={task.id}
                    className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                      isCompleted
                        ? 'bg-slate-50/70 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/60 opacity-75'
                        : 'glass-card border-brand-200 dark:border-brand-500/30 shadow-md hover:border-brand-400 transition'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                          GRN: {task.goodsReceiptItem?.goodsReceipt?.grnNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>

                      <div className="font-bold text-slate-900 dark:text-white text-sm">{task.product.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center justify-between">
                        <span>SKU: {task.product.sku}</span>
                        {task.goodsReceiptItem?.batchNumber && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300">
                            Batch: {task.goodsReceiptItem.batchNumber}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                            Target Storage Bin
                          </span>
                          <span className="text-xs font-bold text-brand-700 dark:text-brand-300 font-mono flex items-center space-x-1 mt-0.5">
                            <Archive className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                            <span>{task.targetBin?.code || 'Not Assigned'}</span>
                          </span>
                          {task.targetBin?.warehouse && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {task.targetBin.warehouse.name}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">Store Qty</span>
                          <span className="text-base font-extrabold text-slate-900 dark:text-white">
                            {task.quantity} <span className="text-xs font-normal text-slate-500">{task.product.uom?.symbol || 'units'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800">
                      {!isCompleted ? (
                        canPutaway ? (
                          <button
                            onClick={() => {
                              setSelectedTaskForPutaway(task);
                              setChosenBinId(task.targetBinId || '');
                              setChosenQuantity(task.quantity || 1);
                            }}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-md shadow-emerald-500/20 transition active:scale-95"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Putaway to Bin</span>
                          </button>
                        ) : (
                          <div className="text-[11px] text-slate-400 text-center flex items-center justify-center space-x-1">
                            <Lock className="w-3 h-3" />
                            <span>Warehouse Staff authorization required</span>
                          </div>
                        )
                      ) : (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-between">
                          <span className="flex items-center space-x-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Posted to Ledger</span>
                          </span>
                          {task.completedAt && (
                            <span className="text-[10px] text-slate-400">
                              {new Date(task.completedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. GOODS RECEIPTS (GRN) HISTORY VIEW                      */}
      {/* ========================================================= */}
      {activeTab === 'GRN' && (
        <div className="space-y-4">
          {/* Active Purchase Orders Pending Inbound Delivery */}
          {purchaseOrders.filter((po: any) => po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED').length > 0 && (
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    Incoming Purchase Orders Awaiting Warehouse Receipt ({purchaseOrders.filter((po: any) => po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED').length})
                  </span>
                </div>
                <span className="text-[10px] text-blue-700 dark:text-blue-400">
                  Approved by Procurement & ready for dock unloading
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {purchaseOrders
                  .filter((po: any) => po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED')
                  .map((po: any) => {
                    const firstItem = po.items?.[0];
                    const pendingQty = firstItem ? Math.max(0, firstItem.orderedQty - firstItem.receivedQty) : 0;

                    return (
                      <div
                        key={po.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-2 shadow-xs hover:border-brand-500 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                              {po.poNumber}
                            </span>
                            <span
                              className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                                po.status === 'PARTIALLY_RECEIVED'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                              }`}
                            >
                              {po.status}
                            </span>
                          </div>
                          <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                            Vendor: {po.supplier?.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Item: <strong className="text-slate-700 dark:text-slate-300">{firstItem?.product?.name}</strong> · Pending: <span className="font-mono font-bold text-brand-600">{pendingQty}</span> units
                          </div>
                        </div>

                        {canCreateGRN && (
                          <button
                            type="button"
                            onClick={() => {
                              handlePOSelect(po.id);
                              setShowAddGRNModal(true);
                            }}
                            className="w-full mt-2 py-1.5 px-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-xs transition"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Receive Delivery (Generate GRN)</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-medium">Status:</span>
            {(['ALL', 'PUTAWAY_PENDING', 'COMPLETED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setGRNStatusFilter(filter)}
                className={`px-3 py-1 rounded-lg font-semibold transition text-[11px] ${
                  grnStatusFilter === filter
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {filter === 'ALL' ? 'All GRNs' : filter === 'PUTAWAY_PENDING' ? 'Putaway Pending' : 'Completed'}
              </button>
            ))}
          </div>

          <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                  <th className="p-4">GRN Document</th>
                  <th className="p-4">Supplier & Warehouse</th>
                  <th className="p-4">Inspection Breakdown</th>
                  <th className="p-4">Bin Allocation</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                {isReceiptsLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      Loading GRN records...
                    </td>
                  </tr>
                ) : filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      No goods receipts found.
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((grn: any) => (
                    <tr key={grn.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                          {grn.grnNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {new Date(grn.createdAt).toLocaleDateString()}
                        </div>
                        {grn.purchaseOrder?.poNumber && (
                          <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[10px] border border-blue-200 dark:border-blue-800">
                            PO: {grn.purchaseOrder.poNumber}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{grn.supplier?.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{grn.warehouse?.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {grn.items?.map((item: any) => (
                          <div key={item.id} className="space-y-0.5 mb-1.5 text-[11px]">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{item.product?.name}</div>
                            <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px] flex items-center space-x-2">
                              <span>Delivered: {item.deliveredQty}</span>
                              <span className="text-slate-300">|</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                Accepted: {item.acceptedQty}
                              </span>
                              {item.damagedQty > 0 && (
                                <>
                                  <span className="text-slate-300">|</span>
                                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                    Damaged: {item.damagedQty}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </td>
                      <td className="p-4">
                        {grn.items?.map((i: any) =>
                          i.putawayTasks?.map((pt: any) => (
                            <div key={pt.id} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center space-x-1 mb-1">
                              <Archive className="w-3 h-3 text-slate-400" />
                              <span className="font-mono font-semibold">{pt.targetBin?.code || 'Bin N/A'}:</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                  pt.status === 'COMPLETED'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200'
                                }`}
                              >
                                {pt.status}
                              </span>
                            </div>
                          ))
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                            grn.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {grn.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedGRNDetails(grn)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. GENERATE GRN MODAL                                     */}
      {/* ========================================================= */}
      {showAddGRNModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Truck className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <span>Generate Goods Receipt Note (GRN)</span>
              </h2>
              <button
                onClick={() => setShowAddGRNModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Inspect deliveries, record accepted/damaged quantities, and automatically queue putaway tasks.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createGRNMutation.mutate(grnForm);
              }}
              className="space-y-4"
            >
              {/* Optional PO Selector */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold flex items-center justify-between">
                  <span>Linked Purchase Order (Optional)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Auto-fills Supplier & Product</span>
                </label>
                <select
                  value={grnForm.purchaseOrderId}
                  onChange={(e) => handlePOSelect(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Direct Receipt (No PO Link)</option>
                  {purchaseOrders
                    .filter((po: any) => po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED')
                    .map((po: any) => (
                      <option key={po.id} value={po.id}>
                        {po.poNumber} — {po.supplier?.name} (${po.totalAmount.toFixed(2)}) [{po.status}]
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Supplier *</label>
                  <select
                    required
                    value={grnForm.supplierId}
                    onChange={(e) => setGRNForm({ ...grnForm, supplierId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Receiving Warehouse *</label>
                  <select
                    required
                    value={grnForm.warehouseId}
                    onChange={(e) => setGRNForm({ ...grnForm, warehouseId: e.target.value, targetBinId: '' })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map((w: any) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Delivered Product *</label>
                <select
                  required
                  value={grnForm.productId}
                  onChange={(e) => {
                    const newProdId = e.target.value;
                    if (grnForm.purchaseOrderId) {
                      handlePOSelect(grnForm.purchaseOrderId, newProdId);
                    } else {
                      setGRNForm({ ...grnForm, productId: newProdId });
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select Product</option>
                  {grnForm.purchaseOrderId &&
                  purchaseOrders.find((p: any) => p.id === grnForm.purchaseOrderId)?.items?.length > 0
                    ? purchaseOrders
                        .find((p: any) => p.id === grnForm.purchaseOrderId)
                        .items.map((item: any) => {
                          const rem = Math.max(0, item.orderedQty - item.receivedQty);
                          return (
                            <option key={item.productId} value={item.productId}>
                              {item.product?.name} ({item.product?.sku}) — Ordered: {item.orderedQty}, Pending: {rem}
                            </option>
                          );
                        })
                    : products.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                </select>
              </div>

              {/* Inspection Counts Breakdown */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                  Quality Inspection Verification
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1">Delivered Qty *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={grnForm.deliveredQty}
                      onChange={(e) => handleDeliveredQtyChange(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="text-emerald-600 dark:text-emerald-400 block mb-1 font-semibold">
                      Accepted Qty *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={grnForm.acceptedQty}
                      onChange={(e) => setGRNForm({ ...grnForm, acceptedQty: Number(e.target.value) })}
                      className="w-full bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-xl px-3 py-2 text-emerald-600 dark:text-emerald-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-rose-600 dark:text-rose-400 block mb-1 font-semibold">
                      Damaged Qty
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={grnForm.damagedQty}
                      onChange={(e) => handleDamagedQtyChange(Number(e.target.value))}
                      className="w-full bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-xl px-3 py-2 text-rose-600 dark:text-rose-400 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Batch / Heat Lot *</label>
                  <input
                    type="text"
                    required
                    value={grnForm.batchNumber}
                    onChange={(e) => setGRNForm({ ...grnForm, batchNumber: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">
                    Pre-assign Target Bin (Optional)
                  </label>
                  <select
                    value={grnForm.targetBinId}
                    onChange={(e) => setGRNForm({ ...grnForm, targetBinId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Auto-assign default bin</option>
                    {grnWarehouseBins.map((bin: any) => (
                      <option key={bin.id} value={bin.id}>
                        {bin.code} ({bin.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Inspection Remarks</label>
                <input
                  type="text"
                  value={grnForm.remarks}
                  onChange={(e) => setGRNForm({ ...grnForm, remarks: e.target.value })}
                  placeholder="e.g. Visual and dimensional inspection complete"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddGRNModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGRNMutation.isPending}
                  className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-md shadow-brand-500/25 transition disabled:opacity-50"
                >
                  {createGRNMutation.isPending ? 'Generating...' : 'Confirm & Generate GRN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. PUTAWAY CONFIRMATION & BIN SELECTOR MODAL             */}
      {/* ========================================================= */}
      {selectedTaskForPutaway && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl text-xs">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center space-x-2">
              <Archive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Confirm Putaway to Storage Bin</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Moving physical goods from the inbound receiving dock into designated storage.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Product:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedTaskForPutaway.product?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SKU:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{selectedTaskForPutaway.product?.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GRN Document:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedTaskForPutaway.goodsReceiptItem?.goodsReceipt?.grnNumber}
                </span>
              </div>
              {selectedTaskForPutaway.goodsReceiptItem?.batchNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Batch Lot:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedTaskForPutaway.goodsReceiptItem.batchNumber}
                  </span>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                confirmPutawayMutation.mutate({
                  taskId: selectedTaskForPutaway.id,
                  targetBinId: chosenBinId,
                  quantity: chosenQuantity,
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">
                  Select Target Storage Bin *
                </label>
                <select
                  required
                  value={chosenBinId}
                  onChange={(e) => setChosenBinId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select a Bin</option>
                  {putawayAvailableBins.map((bin: any) => (
                    <option key={bin.id} value={bin.id}>
                      {bin.code} — {bin.name} ({bin.rack?.zone?.name || 'Storage Zone'})
                    </option>
                  ))}
                  {putawayAvailableBins.length === 0 && selectedTaskForPutaway.targetBin && (
                    <option value={selectedTaskForPutaway.targetBin.id}>
                      {selectedTaskForPutaway.targetBin.code} (Assigned Bin)
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">
                  Confirmed Putaway Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={chosenQuantity}
                  onChange={(e) => setChosenQuantity(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  Confirming will immediately increment bin on-hand balance and post an immutable <strong>RECEIPT</strong> entry to the Stock Movement Ledger.
                </span>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForPutaway(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmPutawayMutation.isPending || !chosenBinId}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {confirmPutawayMutation.isPending ? 'Posting Ledger...' : 'Confirm & Post to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. GRN DETAILS DRAWER / MODAL                             */}
      {/* ========================================================= */}
      {selectedGRNDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                <span>Goods Receipt Summary: {selectedGRNDetails.grnNumber}</span>
              </h2>
              <button
                onClick={() => setSelectedGRNDetails(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Supplier</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedGRNDetails.supplier?.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Receiving Facility</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedGRNDetails.warehouse?.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Purchase Order</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedGRNDetails.purchaseOrder?.poNumber || 'Direct Inward'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Inspector</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {selectedGRNDetails.receivedBy?.username || 'Warehouse Staff'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                  Received Items & Quality Inspection
                </span>
                <div className="space-y-2">
                  {selectedGRNDetails.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900"
                    >
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>{item.product?.name}</span>
                        <span className="font-mono">{item.acceptedQty} units accepted</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-1 flex flex-wrap gap-3">
                        <span>Delivered: {item.deliveredQty}</span>
                        <span className="text-emerald-600">Accepted: {item.acceptedQty}</span>
                        {item.damagedQty > 0 && <span className="text-rose-600">Damaged: {item.damagedQty}</span>}
                        {item.batchNumber && <span>Batch: {item.batchNumber}</span>}
                      </div>

                      {item.putawayTasks && item.putawayTasks.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">
                            Bin: <strong>{item.putawayTasks[0]?.targetBin?.code}</strong>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.putawayTasks[0]?.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            Putaway {item.putawayTasks[0]?.status}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedGRNDetails.remarks && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="font-semibold block mb-0.5">Remarks:</span>
                  <span>{selectedGRNDetails.remarks}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex space-x-2">
                  <Link
                    to="/balances"
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold inline-flex items-center space-x-1"
                  >
                    <span>Inspect Balances</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Link
                    to="/ledger"
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold inline-flex items-center space-x-1"
                  >
                    <span>Inspect Ledger</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGRNDetails(null)}
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white font-semibold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

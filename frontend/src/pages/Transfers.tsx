import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowRightLeft,
  Plus,
  CheckCircle,
  AlertTriangle,
  Truck,
  Archive,
  Lock,
  XCircle,
  X,
  Eye,
  ScrollText,
  Layers,
  Search,
  Building,
  Clock,
  ExternalLink,
  ShieldCheck,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Transfers: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { hasRole, hasPermission } = useAuth();

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [dispatchModalTransfer, setDispatchModalTransfer] = useState<any | null>(null);
  const [receiveModalTransfer, setReceiveModalTransfer] = useState<any | null>(null);
  const [selectedTransferDetails, setSelectedTransferDetails] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'DISCREPANCY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Permissions
  const canInitiateTransfer =
    hasRole('ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_MANAGER') || hasPermission('transfer:create');
  const canOperateTransfer = hasRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF');

  // Form states
  const [createForm, setCreateForm] = useState({
    sourceWarehouseId: '',
    sourceBinId: '',
    destWarehouseId: '',
    productId: '',
    requestedQty: 10,
    reason: 'Inter-facility stock rebalancing',
  });

  const [dispatchForm, setDispatchForm] = useState({
    trackingNumber: 'TRK-EXP-' + Math.floor(1000 + Math.random() * 9000),
    carrier: 'Apex Dedicated Logistics Freight',
    notes: 'Dispatched in good condition',
  });

  const [receiveForm, setReceiveForm] = useState({
    receivedQty: 10,
    destBinId: '',
    notes: 'Destination goods inspected and verified',
  });

  // Queries
  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['stock-transfers'],
    queryFn: async () => (await api.get('/transfers')).data.data,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data.data,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => (await api.get('/products')).data.data,
  });

  // Fetch balances for source warehouse to check real-time stock
  const { data: sourceWarehouseBalances = [] } = useQuery({
    queryKey: ['stock-balances', createForm.sourceWarehouseId],
    queryFn: async () => {
      if (!createForm.sourceWarehouseId) return [];
      const res = await api.get(`/inventory/balances?warehouseId=${createForm.sourceWarehouseId}`);
      return res.data.data;
    },
    enabled: Boolean(createForm.sourceWarehouseId),
  });

  // Available stock calculation for selected product in source warehouse
  const sourceProductStockInfo = useMemo(() => {
    if (!createForm.productId || !sourceWarehouseBalances.length) return null;
    const matchingBalances = sourceWarehouseBalances.filter(
      (b: any) => b.productId === createForm.productId
    );
    const totalOnHand = matchingBalances.reduce((acc: number, b: any) => acc + (b.onHandQty || 0), 0);
    const totalReserved = matchingBalances.reduce((acc: number, b: any) => acc + (b.reservedQty || 0), 0);
    const totalAvailable = Math.max(0, totalOnHand - totalReserved);

    // List of bins containing this product
    const binsWithStock = matchingBalances
      .filter((b: any) => (b.onHandQty || 0) > 0)
      .map((b: any) => ({
        binId: b.binId,
        binCode: b.bin?.code || 'Direct Floor',
        binName: b.bin?.name || 'General Storage',
        onHand: b.onHandQty,
        available: Math.max(0, (b.onHandQty || 0) - (b.reservedQty || 0)),
      }));

    return { totalOnHand, totalReserved, totalAvailable, binsWithStock };
  }, [sourceWarehouseBalances, createForm.productId]);

  // Fetch destination warehouse tree for receiving bin selection
  const { data: destWhTree } = useQuery({
    queryKey: ['warehouse-dest-tree', receiveModalTransfer?.destWarehouseId],
    queryFn: async () => {
      if (!receiveModalTransfer?.destWarehouseId) return null;
      return (await api.get(`/warehouses/${receiveModalTransfer.destWarehouseId}/tree`)).data.data;
    },
    enabled: Boolean(receiveModalTransfer?.destWarehouseId),
  });

  const availableDestBins: any[] = useMemo(() => {
    const list: any[] = [];
    if (!destWhTree) return list;
    destWhTree.zones?.forEach((z: any) => {
      z.racks?.forEach((r: any) => {
        r.bins?.forEach((b: any) => list.push({ ...b, zoneName: z.name, rackCode: r.code }));
      });
    });
    destWhTree.bins?.forEach((b: any) => list.push({ ...b, zoneName: 'Floor', rackCode: '-' }));
    return list;
  }, [destWhTree]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/transfers', {
        sourceWarehouseId: payload.sourceWarehouseId,
        destWarehouseId: payload.destWarehouseId,
        reason: payload.reason,
        items: [
          {
            productId: payload.productId,
            sourceBinId: payload.sourceBinId || undefined,
            requestedQty: Number(payload.requestedQty),
          },
        ],
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] });
      setShowAddModal(false);
      setErrorMessage(null);
      if (data?.data) {
        setSelectedTransferDetails(data.data);
      }
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Transfer initiation failed.');
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await api.post(`/transfers/${id}/dispatch`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      setDispatchModalTransfer(null);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Dispatch failed.');
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await api.post(`/transfers/${id}/receive`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      setReceiveModalTransfer(null);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Receipt recording failed.');
    },
  });

  // Filtered transfers list
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t: any) => {
      // Status filter
      if (statusFilter === 'APPROVED' && t.status !== 'APPROVED') return false;
      if (statusFilter === 'IN_TRANSIT' && t.status !== 'IN_TRANSIT') return false;
      if (statusFilter === 'RECEIVED' && t.status !== 'RECEIVED') return false;
      if (
        statusFilter === 'DISCREPANCY' &&
        t.status !== 'PARTIALLY_RECEIVED' &&
        !t.items?.some((i: any) => i.discrepancyQty > 0)
      ) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = t.transferNumber?.toLowerCase().includes(q);
        const matchSource = t.sourceWarehouse?.name?.toLowerCase().includes(q) || t.sourceWarehouse?.code?.toLowerCase().includes(q);
        const matchDest = t.destWarehouse?.name?.toLowerCase().includes(q) || t.destWarehouse?.code?.toLowerCase().includes(q);
        const matchItem = t.items?.some(
          (i: any) => i.product?.name?.toLowerCase().includes(q) || i.product?.sku?.toLowerCase().includes(q)
        );
        return matchNumber || matchSource || matchDest || matchItem;
      }

      return true;
    });
  }, [transfers, statusFilter, searchQuery]);

  // KPI Statistics
  const stats = useMemo(() => {
    const total = transfers.length;
    const approved = transfers.filter((t: any) => t.status === 'APPROVED').length;
    const inTransit = transfers.filter((t: any) => t.status === 'IN_TRANSIT').length;
    const completed = transfers.filter((t: any) => t.status === 'RECEIVED').length;
    const discrepancies = transfers.filter(
      (t: any) => t.status === 'PARTIALLY_RECEIVED' || t.items?.some((i: any) => i.discrepancyQty > 0)
    ).length;
    return { total, approved, inTransit, completed, discrepancies };
  }, [transfers]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
            <ArrowRightLeft className="w-4 h-4" />
            <span>Inter-Warehouse Logistics & Relocation</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Inter-Facility Stock Transfers
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Standard 3-Step Lifecycle: <span className="font-semibold text-slate-700 dark:text-slate-200">1. Initiate (Approved)</span> → <span className="font-semibold text-slate-700 dark:text-slate-200">2. Dispatch (In-Transit)</span> → <span className="font-semibold text-slate-700 dark:text-slate-200">3. Receive & Reconcile</span>.
          </p>
        </div>

        {canInitiateTransfer ? (
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setCreateForm({
                sourceWarehouseId: warehouses[0]?.id || '',
                sourceBinId: '',
                destWarehouseId: warehouses[1]?.id || '',
                productId: products[0]?.id || '',
                requestedQty: 10,
                reason: 'Inter-facility stock rebalancing',
              });
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-brand-500/25 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Initiate Transfer</span>
          </button>
        ) : (
          <div
            title="Requires Warehouse Manager, Inventory Manager, or Admin role"
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 text-xs flex items-center space-x-1.5 opacity-70 cursor-not-allowed"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Initiate Transfer</span>
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow'
              : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-80">All Transfers</div>
          <div className="text-xl font-bold mt-0.5">{stats.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            statusFilter === 'APPROVED'
              ? 'bg-amber-600 text-white border-transparent shadow'
              : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-80 flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Pending Dispatch</span>
          </div>
          <div className="text-xl font-bold mt-0.5">{stats.approved}</div>
        </div>

        <div
          onClick={() => setStatusFilter('IN_TRANSIT')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            statusFilter === 'IN_TRANSIT'
              ? 'bg-sky-600 text-white border-transparent shadow'
              : 'bg-sky-50/60 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/40 text-sky-900 dark:text-sky-200 hover:border-sky-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-80 flex items-center space-x-1">
            <Truck className="w-3 h-3" />
            <span>In Transit</span>
          </div>
          <div className="text-xl font-bold mt-0.5">{stats.inTransit}</div>
        </div>

        <div
          onClick={() => setStatusFilter('RECEIVED')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            statusFilter === 'RECEIVED'
              ? 'bg-emerald-600 text-white border-transparent shadow'
              : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200 hover:border-emerald-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-80 flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Completed</span>
          </div>
          <div className="text-xl font-bold mt-0.5">{stats.completed}</div>
        </div>

        <div
          onClick={() => setStatusFilter('DISCREPANCY')}
          className={`p-3.5 rounded-xl border cursor-pointer transition ${
            statusFilter === 'DISCREPANCY'
              ? 'bg-rose-600 text-white border-transparent shadow'
              : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200 hover:border-rose-300'
          }`}
        >
          <div className="text-[11px] font-medium opacity-80 flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Discrepancies</span>
          </div>
          <div className="text-xl font-bold mt-0.5">{stats.discrepancies}</div>
        </div>
      </div>

      {/* Guide & Results Navigation Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-brand-950/40 dark:to-indigo-950/40 border border-brand-200/60 dark:border-brand-800/40 text-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>How Stock Transfers Work & Where to See Results:</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px]">
              <strong>1. Dispatching</strong> stock immediately deducts inventory from the source warehouse and writes a <code className="font-mono bg-white/70 dark:bg-slate-800 px-1 py-0.5 rounded text-sky-600 dark:text-sky-400">TRANSFER_OUT</code> record.
              <strong> 2. Receiving</strong> stock at the destination increases the destination bin on-hand stock and writes an immutable <code className="font-mono bg-white/70 dark:bg-slate-800 px-1 py-0.5 rounded text-emerald-600 dark:text-emerald-400">TRANSFER_IN</code> ledger entry.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <Link
              to="/balances"
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] flex items-center space-x-1 shadow-sm border border-slate-200 dark:border-slate-700 transition"
            >
              <Layers className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
              <span>Stock Balances</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>

            <Link
              to="/ledger"
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] flex items-center space-x-1 shadow-sm border border-slate-200 dark:border-slate-700 transition"
            >
              <ScrollText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Audit Ledger</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'APPROVED'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Pending Dispatch ({stats.approved})
          </button>
          <button
            onClick={() => setStatusFilter('IN_TRANSIT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'IN_TRANSIT'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            In Transit ({stats.inTransit})
          </button>
          <button
            onClick={() => setStatusFilter('RECEIVED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'RECEIVED'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Received ({stats.completed})
          </button>
          {stats.discrepancies > 0 && (
            <button
              onClick={() => setStatusFilter('DISCREPANCY')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                statusFilter === 'DISCREPANCY'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Discrepancies ({stats.discrepancies})
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transfer #, product, hub..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Transfers Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                <th className="p-4">Transfer Number</th>
                <th className="p-4">Source Hub</th>
                <th className="p-4">Destination Hub</th>
                <th className="p-4">Transferred Product</th>
                <th className="p-4 text-center">Lifecycle Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Loading transfers...
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No transfers match current filter or search criteria.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t: any) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                    onClick={() => setSelectedTransferDetails(t)}
                  >
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center space-x-1.5">
                        <span>{t.transferNumber}</span>
                        <Eye className="w-3 h-3 text-slate-400 hover:text-brand-500" />
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans mt-0.5 line-clamp-1">
                        {t.reason}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {t.sourceWarehouse?.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {t.sourceWarehouse?.code}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {t.destWarehouse?.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {t.destWarehouse?.code}
                      </div>
                    </td>

                    <td className="p-4">
                      {t.items?.map((item: any) => (
                        <div key={item.id} className="text-[11px] text-slate-700 dark:text-slate-200 space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-900 dark:text-white">{item.product?.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-500">
                              {item.product?.sku}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Requested: <strong className="text-slate-700 dark:text-slate-300">{item.requestedQty}</strong> units
                            {item.dispatchedQty > 0 && ` · Dispatched: ${item.dispatchedQty}`}
                            {item.receivedQty > 0 && ` · Received: ${item.receivedQty}`}
                          </div>
                          {item.discrepancyQty > 0 && (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Shortage: {item.discrepancyQty} units</span>
                            </span>
                          )}
                        </div>
                      ))}
                    </td>

                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          t.status === 'RECEIVED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : t.status === 'IN_TRANSIT'
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400 border border-sky-200 dark:border-sky-800 flex items-center justify-center space-x-1 mx-auto w-fit'
                            : t.status === 'PARTIALLY_RECEIVED'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {t.status === 'IN_TRANSIT' && <Truck className="w-3 h-3" />}
                        <span>{t.status}</span>
                      </span>
                    </td>

                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        {t.status === 'APPROVED' && canOperateTransfer && (
                          <button
                            type="button"
                            onClick={() => {
                              setDispatchModalTransfer(t);
                              setDispatchForm({
                                trackingNumber: 'TRK-EXP-' + Math.floor(1000 + Math.random() * 9000),
                                carrier: 'Apex Dedicated Freight',
                                notes: 'Stock verified at source dock',
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px] flex items-center space-x-1 shadow transition"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Step 2: Dispatch</span>
                          </button>
                        )}

                        {t.status === 'IN_TRANSIT' && canOperateTransfer && (
                          <button
                            type="button"
                            onClick={() => {
                              setReceiveModalTransfer(t);
                              setReceiveForm({
                                receivedQty: t.items[0]?.dispatchedQty || 10,
                                destBinId: '',
                                notes: 'Intact at destination dock',
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center space-x-1 shadow transition"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Step 3: Receive</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedTransferDetails(t)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-brand-600"
                          title="View Transfer Audit Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. INITIATE TRANSFER MODAL                                */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Step 1: Initiate Stock Transfer
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Specify source hub, destination facility, and quantities to move
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(createForm);
              }}
              className="space-y-3.5"
            >
              {/* Source & Destination Warehouses */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                    Source Warehouse *
                  </label>
                  <select
                    required
                    value={createForm.sourceWarehouseId}
                    onChange={(e) => {
                      const newSource = e.target.value;
                      setCreateForm((prev) => ({
                        ...prev,
                        sourceWarehouseId: newSource,
                        sourceBinId: '',
                        destWarehouseId: prev.destWarehouseId === newSource ? '' : prev.destWarehouseId,
                      }));
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Source Hub</option>
                    {warehouses.map((w: any) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                    Destination Warehouse *
                  </label>
                  <select
                    required
                    value={createForm.destWarehouseId}
                    onChange={(e) => setCreateForm({ ...createForm, destWarehouseId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Destination Hub</option>
                    {warehouses.map((w: any) => (
                      <option
                        key={w.id}
                        value={w.id}
                        disabled={w.id === createForm.sourceWarehouseId}
                      >
                        {w.name} ({w.code}) {w.id === createForm.sourceWarehouseId ? '(Source)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Selection */}
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Product Item *
                </label>
                <select
                  required
                  value={createForm.productId}
                  onChange={(e) => setCreateForm({ ...createForm, productId: e.target.value, sourceBinId: '' })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select Product to Move</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              {/* Real-time Source Stock Feedback */}
              {createForm.sourceWarehouseId && createForm.productId && sourceProductStockInfo && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Available Stock in Source:
                    </span>
                    <span
                      className={`font-mono font-bold text-xs ${
                        sourceProductStockInfo.totalAvailable > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {sourceProductStockInfo.totalAvailable} units available ({sourceProductStockInfo.totalOnHand} on hand)
                    </span>
                  </div>

                  {/* Optional Source Bin Selector */}
                  {sourceProductStockInfo.binsWithStock.length > 0 && (
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">
                        Pick Source Bin (Optional - Auto-picks if left blank)
                      </label>
                      <select
                        value={createForm.sourceBinId}
                        onChange={(e) => setCreateForm({ ...createForm, sourceBinId: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                      >
                        <option value="">Auto-resolve bin</option>
                        {sourceProductStockInfo.binsWithStock.map((b: any) => (
                          <option key={b.binId} value={b.binId}>
                            {b.binCode} ({b.available} available)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Transfer Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={createForm.requestedQty}
                  onChange={(e) => setCreateForm({ ...createForm, requestedQty: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {sourceProductStockInfo && createForm.requestedQty > sourceProductStockInfo.totalAvailable && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Warning: Requested quantity exceeds available stock ({sourceProductStockInfo.totalAvailable} units).</span>
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Reason / Business Justification
                </label>
                <input
                  type="text"
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                  placeholder="e.g. Replenishment, project relocation, stock balance"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold transition shadow-md shadow-brand-500/25 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Initiating...' : 'Submit Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. DISPATCH STOCK MODAL                                   */}
      {/* ========================================================= */}
      {dispatchModalTransfer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-xs">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Step 2: Dispatch Stock
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {dispatchModalTransfer.transferNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModalTransfer(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs mb-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Route:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {dispatchModalTransfer.sourceWarehouse?.code} → {dispatchModalTransfer.destWarehouse?.code}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Item:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {dispatchModalTransfer.items[0]?.product?.name} ({dispatchModalTransfer.items[0]?.requestedQty} units)
                </span>
              </div>
              <div className="text-[11px] text-sky-600 dark:text-sky-400 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                ⚡ Dispatching will automatically deduct stock from source warehouse and post a TRANSFER_OUT ledger transaction.
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                dispatchMutation.mutate({ id: dispatchModalTransfer.id, data: dispatchForm });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Carrier / Logistics Provider *
                </label>
                <input
                  type="text"
                  required
                  value={dispatchForm.carrier}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, carrier: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Tracking Waybill Number *
                </label>
                <input
                  type="text"
                  required
                  value={dispatchForm.trackingNumber}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, trackingNumber: e.target.value })}
                  className="w-full font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Dispatch Notes
                </label>
                <input
                  type="text"
                  value={dispatchForm.notes}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDispatchModalTransfer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatchMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/25 transition disabled:opacity-50"
                >
                  {dispatchMutation.isPending ? 'Dispatching...' : 'Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. RECEIVE GOODS MODAL                                    */}
      {/* ========================================================= */}
      {receiveModalTransfer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-xs">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Step 3: Destination Goods Receipt
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {receiveModalTransfer.transferNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiveModalTransfer(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const item = receiveModalTransfer.items[0];
                receiveMutation.mutate({
                  id: receiveModalTransfer.id,
                  data: {
                    notes: receiveForm.notes,
                    items: [
                      {
                        itemId: item.id,
                        receivedQty: Number(receiveForm.receivedQty),
                        destBinId: receiveForm.destBinId,
                      },
                    ],
                  },
                });
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Destination Storage Bin *
                </label>
                <select
                  required
                  value={receiveForm.destBinId}
                  onChange={(e) => setReceiveForm({ ...receiveForm, destBinId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select Destination Bin in {receiveModalTransfer.destWarehouse?.name}</option>
                  {availableDestBins.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.code} ({b.name}) [{b.zoneName}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Actual Received Quantity (Dispatched: {receiveModalTransfer.items[0]?.dispatchedQty} units)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={receiveForm.receivedQty}
                  onChange={(e) => setReceiveForm({ ...receiveForm, receivedQty: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {receiveModalTransfer.items[0]?.dispatchedQty > receiveForm.receivedQty && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>
                      Shortage Discrepancy Detected:{' '}
                      {receiveModalTransfer.items[0]?.dispatchedQty - receiveForm.receivedQty} units missing.
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                  Receiving & Reconciliation Notes
                </label>
                <input
                  type="text"
                  value={receiveForm.notes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReceiveModalTransfer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={receiveMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/25 transition disabled:opacity-50"
                >
                  {receiveMutation.isPending ? 'Receiving...' : 'Confirm Goods Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. TRANSFER AUDIT TRAIL & RESULTS MODAL                   */}
      {/* ========================================================= */}
      {selectedTransferDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl text-xs max-h-[90vh] overflow-y-auto space-y-4">
            {/* Header */}
            <div className="flex justify-between items-start pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                    {selectedTransferDetails.transferNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedTransferDetails.status === 'RECEIVED'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        : selectedTransferDetails.status === 'IN_TRANSIT'
                        ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                    }`}
                  >
                    {selectedTransferDetails.status}
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  Reason: {selectedTransferDetails.reason}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTransferDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lifecycle Progress Stepper */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Transfer Lifecycle Audit
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {/* Step 1 */}
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-center space-x-1 font-bold">
                    <Check className="w-3 h-3" />
                    <span>1. Approved</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    by @{selectedTransferDetails.requestedBy?.username || 'admin'}
                  </div>
                </div>

                {/* Step 2 */}
                <div
                  className={`p-2 rounded-lg border ${
                    selectedTransferDetails.status === 'IN_TRANSIT' || selectedTransferDetails.status === 'RECEIVED' || selectedTransferDetails.status === 'PARTIALLY_RECEIVED'
                      ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1 font-bold">
                    <Truck className="w-3 h-3" />
                    <span>2. Dispatched</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {selectedTransferDetails.dispatches?.length > 0
                      ? selectedTransferDetails.dispatches[0].carrier
                      : 'Pending'}
                  </div>
                </div>

                {/* Step 3 */}
                <div
                  className={`p-2 rounded-lg border ${
                    selectedTransferDetails.status === 'RECEIVED' || selectedTransferDetails.status === 'PARTIALLY_RECEIVED'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1 font-bold">
                    <CheckCircle className="w-3 h-3" />
                    <span>3. Received</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {selectedTransferDetails.receipts?.length > 0 ? 'Reconciled' : 'Pending Dock'}
                  </div>
                </div>
              </div>
            </div>

            {/* Hub Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Source Hub</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedTransferDetails.sourceWarehouse?.name}
                </div>
                <div className="font-mono text-slate-500 text-[10px]">
                  {selectedTransferDetails.sourceWarehouse?.code}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Destination Hub</div>
                <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedTransferDetails.destWarehouse?.name}
                </div>
                <div className="font-mono text-slate-500 text-[10px]">
                  {selectedTransferDetails.destWarehouse?.code}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Transfer Items & Discrepancies
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 text-[10px] uppercase">
                    <tr>
                      <th className="p-2.5">Product</th>
                      <th className="p-2.5 text-center">Requested</th>
                      <th className="p-2.5 text-center">Dispatched</th>
                      <th className="p-2.5 text-center">Received</th>
                      <th className="p-2.5 text-right">Dest Bin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {selectedTransferDetails.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900 dark:text-white">{item.product?.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">{item.product?.sku}</div>
                        </td>
                        <td className="p-2.5 text-center font-mono">{item.requestedQty}</td>
                        <td className="p-2.5 text-center font-mono font-semibold text-sky-600">
                          {item.dispatchedQty || 0}
                        </td>
                        <td className="p-2.5 text-center font-mono font-semibold text-emerald-600">
                          {item.receivedQty || 0}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-600 dark:text-slate-300">
                          {item.destBin?.code || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Where to See Results Quick Links */}
            <div className="p-3.5 rounded-xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 space-y-2">
              <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-brand-600" />
                <span>Verify Results in System Ledgers:</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                You can inspect the impact of transfer <strong>{selectedTransferDetails.transferNumber}</strong> directly across other modules:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTransferDetails(null);
                    navigate('/balances');
                  }}
                  className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 flex items-center space-x-1 shadow-sm"
                >
                  <span>1. Check Stock Balances</span>
                  <ArrowRight className="w-3 h-3 text-brand-600" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTransferDetails(null);
                    navigate('/ledger');
                  }}
                  className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 flex items-center space-x-1 shadow-sm"
                >
                  <span>2. Check Movement Ledger</span>
                  <ArrowRight className="w-3 h-3 text-indigo-600" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTransferDetails(null);
                    navigate('/hierarchy');
                  }}
                  className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-50 flex items-center space-x-1 shadow-sm"
                >
                  <span>3. Check Warehouse Bins</span>
                  <ArrowRight className="w-3 h-3 text-teal-600" />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedTransferDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
              >
                Close Audit Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

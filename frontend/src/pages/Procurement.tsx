import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  ShoppingCart,
  Plus,
  Send,
  CheckCircle,
  Clock,
  FileText,
  Lock,
  XCircle,
  AlertCircle,
  Inbox,
  ArrowRight,
  Eye,
  Search,
  Building,
  User,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Package,
  Truck,
  Calendar,
  X,
  Check,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Procurement: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, hasRole, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'REQUISITIONS' | 'ORDERS'>('REQUISITIONS');
  const [showAddPRModal, setShowAddPRModal] = useState(false);
  const [showAddPOModal, setShowAddPOModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inspector / Details Modals
  const [selectedPR, setSelectedPR] = useState<any | null>(null);
  const [selectedPO, setSelectedPO] = useState<any | null>(null);

  // Filters & Search
  const [prSearch, setPRSearch] = useState('');
  const [poSearch, setPOSearch] = useState('');
  const [prStatusFilter, setPRStatusFilter] = useState<'ALL' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'ORDERED' | 'FULFILLED'>('ALL');
  const [poStatusFilter, setPOStatusFilter] = useState<'ALL' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED'>('ALL');

  const canCreatePR =
    hasRole('ADMIN', 'DEPARTMENT_MANAGER', 'PROCUREMENT_OFFICER') || hasPermission('procurement:requisition:create');
  const canCreatePO =
    hasRole('ADMIN', 'PROCUREMENT_OFFICER') || hasPermission('procurement:order:create');

  const [prForm, setPRForm] = useState({
    departmentId: '',
    justification: '',
    productId: '',
    quantity: 50,
    estimatedUnitCost: 10,
  });

  const [poForm, setPOForm] = useState({
    requisitionId: '',
    supplierId: '',
    productId: '',
    orderedQty: 100,
    unitPrice: 5.0,
    notes: '',
  });

  const { data: requisitions = [], isLoading: isPRLoading } = useQuery({
    queryKey: ['requisitions'],
    queryFn: async () => (await api.get('/procurement/requisitions')).data.data,
  });

  const { data: orders = [], isLoading: isPOLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => (await api.get('/procurement/orders')).data.data,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get('/procurement/suppliers')).data.data,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/procurement/departments')).data.data,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => (await api.get('/products')).data.data,
  });

  // Filtered lists
  const filteredPRs = useMemo(() => {
    return requisitions.filter((pr: any) => {
      if (prStatusFilter !== 'ALL') {
        if (prStatusFilter === 'FULFILLED') {
          if (pr.status !== 'FULFILLED' && pr.status !== 'PARTIALLY_FULFILLED') return false;
        } else if (pr.status !== prStatusFilter) {
          return false;
        }
      }
      if (!prSearch.trim()) return true;
      const q = prSearch.toLowerCase();
      return (
        pr.prNumber?.toLowerCase().includes(q) ||
        pr.department?.name?.toLowerCase().includes(q) ||
        pr.requestedBy?.username?.toLowerCase().includes(q) ||
        pr.justification?.toLowerCase().includes(q) ||
        pr.items?.some(
          (i: any) =>
            i.product?.name?.toLowerCase().includes(q) || i.product?.sku?.toLowerCase().includes(q)
        )
      );
    });
  }, [requisitions, prStatusFilter, prSearch]);

  const filteredPOs = useMemo(() => {
    return orders.filter((po: any) => {
      if (poStatusFilter !== 'ALL' && po.status !== poStatusFilter) return false;
      if (!poSearch.trim()) return true;
      const q = poSearch.toLowerCase();
      return (
        po.poNumber?.toLowerCase().includes(q) ||
        po.supplier?.name?.toLowerCase().includes(q) ||
        po.supplier?.code?.toLowerCase().includes(q) ||
        po.requisition?.prNumber?.toLowerCase().includes(q) ||
        po.items?.some(
          (i: any) =>
            i.product?.name?.toLowerCase().includes(q) || i.product?.sku?.toLowerCase().includes(q)
        )
      );
    });
  }, [orders, poStatusFilter, poSearch]);

  const submitPRMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/procurement/requisitions/${id}/submit`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['approval-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      if (selectedPR) setSelectedPR(null);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to submit requisition.');
    },
  });

  const createPRMutation = useMutation({
    mutationFn: async (payload: any) =>
      (
        await api.post('/procurement/requisitions', {
          departmentId: payload.departmentId,
          justification: payload.justification,
          items: [
            {
              productId: payload.productId,
              quantity: Number(payload.quantity),
              estimatedUnitCost: Number(payload.estimatedUnitCost),
            },
          ],
        })
      ).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      setShowAddPRModal(false);
      setErrorMessage(null);
      if (data?.data) {
        setSelectedPR(data.data);
      }
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create requisition.');
    },
  });

  const createPOMutation = useMutation({
    mutationFn: async (payload: any) =>
      (
        await api.post('/procurement/orders', {
          requisitionId: payload.requisitionId || undefined,
          supplierId: payload.supplierId,
          notes: payload.notes,
          items: [
            {
              productId: payload.productId,
              orderedQty: Number(payload.orderedQty),
              unitPrice: Number(payload.unitPrice),
            },
          ],
        })
      ).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      setShowAddPOModal(false);
      if (selectedPR) setSelectedPR(null);
      setErrorMessage(null);
      if (data?.data) {
        setSelectedPO(data.data);
      }
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create purchase order.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
            <ShoppingCart className="w-4 h-4" />
            <span>Procure-to-Pay (P2P) Pipeline</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Purchase Requisitions & Orders
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track departmental requests, finance authorizations, supplier purchase orders, and goods receipt fulfillment.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {canCreatePR ? (
            <button
              onClick={() => setShowAddPRModal(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold flex items-center space-x-2 border border-slate-200 dark:border-slate-700 transition"
            >
              <Plus className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>New Requisition</span>
            </button>
          ) : (
            <div
              title="Requires Department Head or Procurement Officer role"
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-400 border border-slate-200 dark:border-slate-700 text-xs flex items-center space-x-1.5 opacity-70 cursor-not-allowed"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>New Requisition</span>
            </div>
          )}

          {canCreatePO ? (
            <button
              onClick={() => setShowAddPOModal(true)}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-brand-500/25 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Purchase Order</span>
            </button>
          ) : (
            <div
              title="Requires Procurement Officer or Admin role"
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-400 border border-slate-200 dark:border-slate-700 text-xs flex items-center space-x-1.5 opacity-70 cursor-not-allowed"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Create PO</span>
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('REQUISITIONS')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'REQUISITIONS'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-extrabold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Purchase Requisitions ({requisitions.length})
        </button>
        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'ORDERS'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-extrabold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Purchase Orders ({orders.length})
        </button>
      </div>

      {/* Requisitions View */}
      {activeTab === 'REQUISITIONS' && (
        <div className="space-y-4">
          {/* Tracking Roadmap & Approval Quick Link Banner */}
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-2">
              <Inbox className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>
                <strong>End-to-End P2P Flow:</strong> 1. <code className="font-mono bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">DRAFT</code> → 2. <code className="font-mono bg-amber-100 dark:bg-amber-950 px-1 py-0.5 rounded">SUBMITTED</code> (routed to Finance) → 3. <code className="font-mono bg-emerald-100 dark:bg-emerald-950 px-1 py-0.5 rounded">APPROVED</code> → 4. <code className="font-mono bg-sky-100 dark:bg-sky-950 px-1 py-0.5 rounded">ORDERED</code> (PO Issued) → 5. <code className="font-mono bg-teal-100 dark:bg-teal-950 px-1 py-0.5 rounded">FULFILLED</code> (Delivered at Warehouse via GRN).
              </span>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <Link
                to="/approvals"
                className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center space-x-1"
              >
                <span>Approval Inbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/receiving?tab=GRN"
                className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center space-x-1"
              >
                <span>Receiving & Putaway</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center glass-card p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search PR#, SKU, Department, Requestor..."
                value={prSearch}
                onChange={(e) => setPRSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {(['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'FULFILLED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPRStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    prStatusFilter === st
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                  <th className="p-4">PR Number</th>
                  <th className="p-4">Department & Requestor</th>
                  <th className="p-4">Requested Items</th>
                  <th className="p-4 text-right">Est. Total Cost</th>
                  <th className="p-4 text-center">Status & Stage</th>
                  <th className="p-4 text-right">Actions & Tracking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                {isPRLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      Loading purchase requisitions...
                    </td>
                  </tr>
                ) : filteredPRs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      No purchase requisitions matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredPRs.map((pr: any) => {
                    const reqQty = pr.items?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0;
                    const recQty = pr.purchaseOrders?.reduce((s: number, po: any) => s + (po.items?.reduce((si: number, item: any) => si + (item.receivedQty || 0), 0) || 0), 0) || 0;
                    const pct = reqQty > 0 ? Math.min(100, Math.round((recQty / reqQty) * 100)) : 0;
                    const firstPO = pr.purchaseOrders?.[0];
                    const firstGRN = firstPO?.goodsReceipts?.[0];

                    return (
                      <tr key={pr.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => setSelectedPR(pr)}
                            title="Click to view full PR lifecycle details"
                            className="font-mono font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1"
                          >
                            <span>{pr.prNumber}</span>
                            <Eye className="w-3 h-3 text-slate-400" />
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{pr.department?.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>By {pr.requestedBy?.username}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {pr.items?.map((i: any) => (
                            <div key={i.id} className="text-[11px] text-slate-600 dark:text-slate-300">
                              {i.product?.name} ({i.quantity} units)
                            </div>
                          ))}
                          {(pr.status === 'ORDERED' || pr.status === 'PARTIALLY_FULFILLED' || pr.status === 'FULFILLED') && (
                            <div className="mt-1.5 space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                <span>Warehouse Inbound:</span>
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{recQty} / {reqQty} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          ${Number(pr.totalEstimatedCost).toFixed(2)}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              pr.status === 'FULFILLED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                : pr.status === 'PARTIALLY_FULFILLED'
                                ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-300 dark:border-teal-700'
                                : pr.status === 'APPROVED'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                : pr.status === 'SUBMITTED'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                : pr.status === 'ORDERED'
                                ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {pr.status === 'FULFILLED' ? 'FULFILLED (DELIVERED)' : pr.status}
                          </span>

                          {pr.status === 'SUBMITTED' && pr.approvalInstance?.currentStep && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center justify-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              <span>{pr.approvalInstance.currentStep.stepName}</span>
                            </div>
                          )}

                          {(pr.status === 'ORDERED' || pr.status === 'PARTIALLY_FULFILLED' || pr.status === 'FULFILLED') && firstPO && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1 space-y-0.5">
                              <div className="text-sky-600 dark:text-sky-400 font-semibold">{firstPO.poNumber}</div>
                              {firstGRN && (
                                <div className="text-emerald-600 dark:text-emerald-400 flex items-center justify-center space-x-1">
                                  <span>{firstGRN.grnNumber}</span>
                                  {firstGRN.status === 'COMPLETED' ? <span>(Stored)</span> : <span>(Docked)</span>}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPR(pr)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                              title="Inspect details and approval history"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {pr.status === 'DRAFT' && canCreatePR && (
                              <button
                                onClick={() => submitPRMutation.mutate(pr.id)}
                                disabled={submitPRMutation.isPending}
                                className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-[11px] flex items-center space-x-1 transition shadow-xs"
                              >
                                <Send className="w-3 h-3" />
                                <span>Submit Approval</span>
                              </button>
                            )}

                            {pr.status === 'SUBMITTED' && (
                              <Link
                                to="/approvals?scope=submitted"
                                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 font-semibold text-[11px] inline-flex items-center space-x-1 transition border border-amber-200 dark:border-amber-800"
                              >
                                <Inbox className="w-3 h-3" />
                                <span>Track in Inbox</span>
                              </Link>
                            )}

                            {pr.status === 'APPROVED' && canCreatePO && (
                              <button
                                onClick={() => {
                                  const firstItem = pr.items?.[0];
                                  setPOForm({
                                    requisitionId: pr.id,
                                    supplierId: suppliers[0]?.id || '',
                                    productId: firstItem?.productId || '',
                                    orderedQty: firstItem?.quantity || 10,
                                    unitPrice: firstItem?.estimatedUnitCost || 10,
                                    notes: `Generated from approved requisition ${pr.prNumber}`,
                                  });
                                  setShowAddPOModal(true);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] inline-flex items-center space-x-1 transition shadow-xs"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Convert to PO</span>
                              </button>
                            )}

                            {(pr.status === 'ORDERED' || pr.status === 'PARTIALLY_FULFILLED') && (
                              <Link
                                to={`/receiving?poId=${firstPO?.id || ''}&tab=GRN`}
                                className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 font-semibold text-[11px] inline-flex items-center space-x-1 transition border border-sky-200 dark:border-sky-800"
                              >
                                <Truck className="w-3 h-3" />
                                <span>Receive</span>
                              </Link>
                            )}

                            {pr.status === 'FULFILLED' && (
                              <Link
                                to="/receiving?tab=GRN"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] inline-flex items-center space-x-1 transition border border-emerald-200 dark:border-emerald-800"
                              >
                                <Truck className="w-3 h-3" />
                                <span>Delivered</span>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders View */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-4">
          {/* Orders Tracking Banner */}
          <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                <strong>Purchase Order Fulfillment:</strong> Purchase Orders issued to suppliers are received at the warehouse via <strong>Receiving & Putaway (/receiving)</strong>. Progress automatically updates upon Goods Receipt Note (GRN) generation.
              </span>
            </div>
            <Link
              to="/receiving?tab=GRN"
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0 flex items-center space-x-1"
            >
              <span>Open Receiving & Putaway</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center glass-card p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search PO#, Supplier, Linked PR, SKU..."
                value={poSearch}
                onChange={(e) => setPOSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {(['ALL', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setPOStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    poStatusFilter === st
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                  <th className="p-4">PO Number</th>
                  <th className="p-4">Supplier & Linked PR</th>
                  <th className="p-4">Ordered Items & Receipt Progress</th>
                  <th className="p-4 text-right">PO Total</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
                {isPOLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      Loading purchase orders...
                    </td>
                  </tr>
                ) : filteredPOs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      No purchase orders matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredPOs.map((po: any) => (
                    <tr key={po.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => setSelectedPO(po)}
                          className="font-mono font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1"
                        >
                          <span>{po.poNumber}</span>
                          <Eye className="w-3 h-3 text-slate-400" />
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{po.supplier?.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                          <span>{po.supplier?.code}</span>
                          {po.requisition && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 font-mono">
                              PR: {po.requisition.prNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {po.items?.map((item: any) => {
                          const pct = Math.min(100, Math.round((item.receivedQty / item.orderedQty) * 100));
                          return (
                            <div key={item.id} className="space-y-1 mb-2">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                  {item.product?.name}
                                </span>
                                <span className="font-mono text-slate-500 dark:text-slate-400">
                                  {item.receivedQty} / {item.orderedQty} rec'd
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ${Number(po.totalAmount).toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            po.status === 'RECEIVED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : po.status === 'PARTIALLY_RECEIVED'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              : 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-400 border border-brand-200 dark:border-brand-800'
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPO(po)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                            title="Inspect purchase order details and GRNs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            to={`/receiving?poId=${po.id}&tab=GRN`}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold inline-flex items-center space-x-1 border border-emerald-200 dark:border-emerald-800"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Receive</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Requisition Details & Tracking Drawer / Modal */}
      {selectedPR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-xs space-y-5">
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                      {selectedPR.prNumber}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedPR.status === 'FULFILLED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : selectedPR.status === 'PARTIALLY_FULFILLED'
                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                          : selectedPR.status === 'APPROVED'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : selectedPR.status === 'SUBMITTED'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : selectedPR.status === 'ORDERED'
                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {selectedPR.status === 'FULFILLED' ? 'FULFILLED (DELIVERED)' : selectedPR.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Department: <strong className="text-slate-700 dark:text-slate-300">{selectedPR.department?.name}</strong> · Requested by: <strong className="text-slate-700 dark:text-slate-300">{selectedPR.requestedBy?.username}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPR(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visual Lifecycle Progress Track */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                End-to-End Requisition Lifecycle (5 Stages)
              </span>
              <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                {/* Stage 1: Draft */}
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold mb-1 shadow-xs">
                    ✓
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">1. Draft Created</span>
                  <span className="text-[9px] text-slate-400">By {selectedPR.requestedBy?.username}</span>
                </div>

                {/* Stage 2: Submitted */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold mb-1 shadow-xs ${
                      selectedPR.status !== 'DRAFT'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {selectedPR.status !== 'DRAFT' ? '✓' : '2'}
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">2. Submitted</span>
                  <span className="text-[9px] text-slate-400">Finance Review</span>
                </div>

                {/* Stage 3: Finance Authorized */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold mb-1 shadow-xs ${
                      ['APPROVED', 'ORDERED', 'PARTIALLY_FULFILLED', 'FULFILLED'].includes(selectedPR.status)
                        ? 'bg-emerald-500 text-white'
                        : selectedPR.status === 'SUBMITTED'
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {['APPROVED', 'ORDERED', 'PARTIALLY_FULFILLED', 'FULFILLED'].includes(selectedPR.status) ? '✓' : '3'}
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">3. Authorized</span>
                  <span className="text-[9px] text-slate-400">
                    {selectedPR.status === 'SUBMITTED' ? 'In Review' : 'Authorized'}
                  </span>
                </div>

                {/* Stage 4: Purchase Order */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold mb-1 shadow-xs ${
                      ['ORDERED', 'PARTIALLY_FULFILLED', 'FULFILLED'].includes(selectedPR.status)
                        ? 'bg-emerald-500 text-white'
                        : selectedPR.status === 'APPROVED'
                        ? 'bg-blue-500 text-white animate-pulse'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {['ORDERED', 'PARTIALLY_FULFILLED', 'FULFILLED'].includes(selectedPR.status) ? '✓' : '4'}
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">4. Purchase Order</span>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {selectedPR.purchaseOrders?.[0]?.poNumber || (selectedPR.status === 'APPROVED' ? 'Ready to Order' : 'PO Pending')}
                  </span>
                </div>

                {/* Stage 5: Warehouse Delivery & Putaway */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold mb-1 shadow-xs ${
                      selectedPR.status === 'FULFILLED'
                        ? 'bg-emerald-500 text-white'
                        : selectedPR.status === 'PARTIALLY_FULFILLED'
                        ? 'bg-teal-500 text-white animate-pulse'
                        : selectedPR.status === 'ORDERED'
                        ? 'bg-sky-500 text-white animate-pulse'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {selectedPR.status === 'FULFILLED' ? '✓' : '5'}
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">5. Warehouse Delivered</span>
                  <span className="text-[9px] text-slate-400">
                    {selectedPR.status === 'FULFILLED'
                      ? 'Stock in Bins'
                      : selectedPR.status === 'PARTIALLY_FULFILLED'
                      ? 'Partially Received'
                      : selectedPR.status === 'ORDERED'
                      ? 'Inbound Pending'
                      : 'Pending Order'}
                  </span>
                </div>
              </div>
            </div>

            {/* Justification Box */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                Business Justification
              </span>
              <p className="text-slate-700 dark:text-slate-300 italic">
                "{selectedPR.justification || 'No justification recorded'}"
              </p>
            </div>

            {/* Line Items Table */}
            <div>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block mb-2">
                Requested Line Items
              </span>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase text-[10px]">
                    <th className="p-2.5">Product SKU</th>
                    <th className="p-2.5">Item Name</th>
                    <th className="p-2.5 text-right">Quantity</th>
                    <th className="p-2.5 text-right">Unit Cost</th>
                    <th className="p-2.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  {selectedPR.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="p-2.5 font-bold text-brand-600">{item.product?.sku}</td>
                      <td className="p-2.5 font-sans font-medium text-slate-800 dark:text-white">
                        {item.product?.name}
                      </td>
                      <td className="p-2.5 text-right">{item.quantity}</td>
                      <td className="p-2.5 text-right">${Number(item.estimatedUnitCost).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-600">
                        ${Number(item.estimatedTotalCost || item.quantity * item.estimatedUnitCost).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Approval Action Trail (if present) */}
            {selectedPR.approvalInstance?.actions && selectedPR.approvalInstance.actions.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  Approval Decision Log
                </span>
                <div className="space-y-1.5">
                  {selectedPR.approvalInstance.actions.map((act: any) => (
                    <div key={act.id} className="flex items-center space-x-2 text-[11px]">
                      <span className="font-semibold text-slate-800 dark:text-white">
                        {act.actor?.username || 'Finance Approver'}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                          act.action === 'APPROVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {act.action}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {new Date(act.actionDate).toLocaleString()}
                      </span>
                      {act.comments && <span className="italic text-slate-600 dark:text-slate-300">"{act.comments}"</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warehouse Inbound & Storage Status (P2P Traceability) */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider flex items-center space-x-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Warehouse Inbound & Fulfillment Audit</span>
                </span>
                <Link
                  to={`/receiving?poId=${selectedPR.purchaseOrders?.[0]?.id || ''}&tab=GRN`}
                  className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1"
                >
                  <span>Receiving Page</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {selectedPR.purchaseOrders && selectedPR.purchaseOrders.length > 0 ? (
                <div className="space-y-2">
                  {selectedPR.purchaseOrders.map((po: any) => (
                    <div key={po.id} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-brand-600">{po.poNumber}</span>
                          <span className="text-slate-500 font-medium">· {po.supplier?.name || 'Vendor Contract'}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          po.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                          po.status === 'PARTIALLY_RECEIVED' ? 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300' :
                          'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                        }`}>
                          {po.status}
                        </span>
                      </div>

                      {po.goodsReceipts && po.goodsReceipts.length > 0 ? (
                        <div className="space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                          <span className="text-[10px] text-slate-400 font-medium block">Received Shipments (GRNs):</span>
                          {po.goodsReceipts.map((grn: any) => (
                            <div key={grn.id} className="flex justify-between items-center text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2 rounded">
                              <span className="font-mono font-semibold text-slate-800 dark:text-white flex items-center space-x-1">
                                <span>{grn.grnNumber}</span>
                                <span className="text-slate-400 font-normal">({grn.warehouse?.name || 'Central Warehouse'})</span>
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                grn.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {grn.status === 'COMPLETED' ? '✓ Putaway Complete (Stored in Bins)' : 'Docked (Putaway Pending)'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic">
                          Purchase order issued. Inbound shipment pending delivery from vendor.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 italic">
                  Purchase Requisition is awaiting PO creation. Once converted to PO, warehouse receipts will appear here.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-400">
                Created: {new Date(selectedPR.createdAt).toLocaleString()}
              </span>

              <div className="flex items-center space-x-2">
                {selectedPR.status === 'DRAFT' && canCreatePR && (
                  <button
                    onClick={() => submitPRMutation.mutate(selectedPR.id)}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center space-x-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit for Authorization</span>
                  </button>
                )}

                {selectedPR.status === 'SUBMITTED' && (
                  <Link
                    to="/approvals?scope=submitted"
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-semibold text-xs flex items-center space-x-1"
                  >
                    <Inbox className="w-3.5 h-3.5" />
                    <span>View in Approval Inbox</span>
                  </Link>
                )}

                {selectedPR.status === 'APPROVED' && canCreatePO && (
                  <button
                    onClick={() => {
                      const firstItem = selectedPR.items?.[0];
                      setPOForm({
                        requisitionId: selectedPR.id,
                        supplierId: suppliers[0]?.id || '',
                        productId: firstItem?.productId || '',
                        orderedQty: firstItem?.quantity || 10,
                        unitPrice: firstItem?.estimatedUnitCost || 10,
                        notes: `Generated from approved requisition ${selectedPR.prNumber}`,
                      });
                      setSelectedPR(null);
                      setShowAddPOModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Convert to Purchase Order</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedPR(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Order Details & GRN Fulfillment Drawer / Modal */}
      {selectedPO && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-xs space-y-5">
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                      {selectedPO.poNumber}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedPO.status === 'RECEIVED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : selectedPO.status === 'PARTIALLY_RECEIVED'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300'
                      }`}
                    >
                      {selectedPO.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Supplier: <strong className="text-slate-700 dark:text-slate-300">{selectedPO.supplier?.name}</strong> ({selectedPO.supplier?.code})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPO(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Linked PR Banner */}
            {selectedPO.requisition && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 flex justify-between items-center text-xs">
                <span>
                  Converted from Authorized Requisition: <strong className="font-mono">{selectedPO.requisition.prNumber}</strong>
                </span>
                <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                  Requested by: {selectedPO.requisition.requestedBy?.username}
                </span>
              </div>
            )}

            {/* PO Summary & Terms */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Order Total</span>
                <span className="text-base font-extrabold text-emerald-600 font-mono">
                  ${Number(selectedPO.totalAmount).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Order Date</span>
                <span className="text-slate-700 dark:text-slate-300 font-mono">
                  {new Date(selectedPO.orderDate || selectedPO.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Contract Notes</span>
                <span className="text-slate-700 dark:text-slate-300 italic truncate block">
                  {selectedPO.notes || 'Standard Delivery & Terms'}
                </span>
              </div>
            </div>

            {/* Ordered Line Items & Progress */}
            <div>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block mb-2">
                Ordered Line Items & Fulfillment Progress
              </span>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase text-[10px]">
                    <th className="p-2.5">Product SKU</th>
                    <th className="p-2.5">Item Name</th>
                    <th className="p-2.5 text-right">Ordered</th>
                    <th className="p-2.5 text-right">Received</th>
                    <th className="p-2.5 text-right">Unit Price</th>
                    <th className="p-2.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                  {selectedPO.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="p-2.5 font-bold text-brand-600">{item.product?.sku}</td>
                      <td className="p-2.5 font-sans font-medium text-slate-800 dark:text-white">
                        {item.product?.name}
                      </td>
                      <td className="p-2.5 text-right">{item.orderedQty}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-600">
                        {item.receivedQty} / {item.orderedQty}
                      </td>
                      <td className="p-2.5 text-right">${Number(item.unitPrice).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                        ${Number(item.totalPrice || item.orderedQty * item.unitPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Associated Goods Receipts History (GRNs) */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Warehouse Inbound Receipts (GRN Audit)
              </span>
              {selectedPO.goodsReceipts && selectedPO.goodsReceipts.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedPO.goodsReceipts.map((grn: any) => (
                    <div
                      key={grn.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Truck className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {grn.grnNumber}
                          </span>
                          <span className="text-slate-500">
                            Facility: {grn.warehouse?.name || 'Central Hub'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-400 font-mono">
                            {new Date(grn.createdAt).toLocaleDateString()}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            grn.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                          }`}>
                            {grn.status === 'COMPLETED' ? 'Putaway Complete' : 'Docked (Pending Putaway)'}
                          </span>
                        </div>
                      </div>

                      {grn.items?.some((it: any) => it.putawayTasks?.length > 0) && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-2 pl-5 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                          {grn.items.map((it: any) =>
                            it.putawayTasks?.map((pt: any) => (
                              <span key={pt.id} className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                                Bin: <strong className="text-slate-700 dark:text-slate-200">{pt.targetBin?.code}</strong> ({pt.status})
                              </span>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  No shipments received against this PO yet. Inbound delivery pending from supplier.
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
              <Link
                to={`/receiving?poId=${selectedPO.id}&tab=GRN`}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center space-x-1"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Go to Receiving & Putaway</span>
              </Link>

              <button
                type="button"
                onClick={() => setSelectedPO(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add PR Modal */}
      {showAddPRModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-xs">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Purchase Requisition</h2>
              <button
                onClick={() => setShowAddPRModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPRMutation.mutate(prForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Department *</label>
                <select
                  required
                  value={prForm.departmentId}
                  onChange={(e) => setPRForm({ ...prForm, departmentId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select Department</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                  {departments.length === 0 && requisitions[0]?.department && (
                    <option value={requisitions[0].department.id}>{requisitions[0].department.name}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Product *</label>
                <select
                  required
                  value={prForm.productId}
                  onChange={(e) => setPRForm({ ...prForm, productId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select Product</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={prForm.quantity}
                    onChange={(e) => setPRForm({ ...prForm, quantity: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Est. Unit Cost ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={prForm.estimatedUnitCost}
                    onChange={(e) => setPRForm({ ...prForm, estimatedUnitCost: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Justification *</label>
                <textarea
                  rows={3}
                  required
                  value={prForm.justification}
                  onChange={(e) => setPRForm({ ...prForm, justification: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="State the business requirement and justification..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPRModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPRMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-md shadow-brand-500/25 transition disabled:opacity-50"
                >
                  {createPRMutation.isPending ? 'Saving...' : 'Save Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add PO Modal */}
      {showAddPOModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-xs">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create Supplier Purchase Order</h2>
              <button
                onClick={() => setShowAddPOModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {poForm.requisitionId && (
              <div className="mb-4 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-[11px] flex items-center justify-between">
                <span>
                  Converting Approved Requisition: <strong className="font-mono">{requisitions.find((r: any) => r.id === poForm.requisitionId)?.prNumber || poForm.requisitionId}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setPOForm((prev) => ({ ...prev, requisitionId: '' }))}
                  className="text-blue-500 hover:text-blue-700 underline text-[10px]"
                >
                  Unlink
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPOMutation.mutate(poForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Supplier *</label>
                <select
                  required
                  value={poForm.supplierId}
                  onChange={(e) => setPOForm({ ...poForm, supplierId: e.target.value })}
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
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Product *</label>
                <select
                  required
                  value={poForm.productId}
                  onChange={(e) => setPOForm({ ...poForm, productId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select Product</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Ordered Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={poForm.orderedQty}
                    onChange={(e) => setPOForm({ ...poForm, orderedQty: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Contract Unit Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={poForm.unitPrice}
                    onChange={(e) => setPOForm({ ...poForm, unitPrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Terms / Notes</label>
                <input
                  type="text"
                  value={poForm.notes}
                  onChange={(e) => setPOForm({ ...poForm, notes: e.target.value })}
                  placeholder="Net 30 terms, FOB warehouse..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPOModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPOMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-md shadow-brand-500/25 transition disabled:opacity-50"
                >
                  {createPOMutation.isPending ? 'Creating PO...' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Procurement;

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ShoppingCart, Plus, Send, CheckCircle, Clock, FileText, Lock, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Procurement: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'REQUISITIONS' | 'ORDERS'>('REQUISITIONS');
  const [showAddPRModal, setShowAddPRModal] = useState(false);
  const [showAddPOModal, setShowAddPOModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canCreatePR = hasRole('ADMIN', 'DEPARTMENT_MANAGER', 'PROCUREMENT_OFFICER') || hasPermission('procurement:requisition:create');
  const canCreatePO = hasRole('ADMIN', 'PROCUREMENT_OFFICER') || hasPermission('procurement:order:create');

  const [prForm, setPRForm] = useState({
    departmentId: '',
    justification: '',
    productId: '',
    quantity: 50,
    estimatedUnitCost: 10,
  });

  const [poForm, setPOForm] = useState({
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

  const submitPRMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/procurement/requisitions/${id}/submit`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['approval-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      setShowAddPRModal(false);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create requisition.');
    },
  });

  const createPOMutation = useMutation({
    mutationFn: async (payload: any) =>
      (
        await api.post('/procurement/orders', {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setShowAddPOModal(false);
      setErrorMessage(null);
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
            <span>Supply Chain Procurement</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Purchase Requisitions & Purchase Orders
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Departmental requests, multi-tier approval workflows, and supplier purchase orders.
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
        <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                <th className="p-4">PR Number</th>
                <th className="p-4">Department & Requestor</th>
                <th className="p-4">Requested Items</th>
                <th className="p-4 text-right">Est. Total Cost</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {isPRLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Loading requisitions...
                  </td>
                </tr>
              ) : requisitions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No purchase requisitions found.
                  </td>
                </tr>
              ) : (
                requisitions.map((pr: any) => (
                  <tr key={pr.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{pr.prNumber}</td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{pr.department.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">By {pr.requestedBy.username}</div>
                    </td>
                    <td className="p-4">
                      {pr.items?.map((i: any) => (
                        <div key={i.id} className="text-[11px] text-slate-600 dark:text-slate-300">
                          {i.product.name} ({i.quantity} units)
                        </div>
                      ))}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ${pr.totalEstimatedCost.toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          pr.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : pr.status === 'SUBMITTED'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : pr.status === 'ORDERED'
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {pr.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {pr.status === 'DRAFT' && canCreatePR && (
                        <button
                          onClick={() => submitPRMutation.mutate(pr.id)}
                          disabled={submitPRMutation.isPending}
                          className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-[11px] flex items-center space-x-1 ml-auto transition shadow"
                        >
                          <Send className="w-3 h-3" />
                          <span>Submit Approval</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Orders View */}
      {activeTab === 'ORDERS' && (
        <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                <th className="p-4">PO Number</th>
                <th className="p-4">Supplier</th>
                <th className="p-4">Ordered Items & Receipt Progress</th>
                <th className="p-4 text-right">PO Total</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {isPOLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                orders.map((po: any) => (
                  <tr key={po.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">{po.poNumber}</td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{po.supplier.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{po.supplier.code}</div>
                    </td>
                    <td className="p-4">
                      {po.items?.map((item: any) => {
                        const pct = Math.min(100, Math.round((item.receivedQty / item.orderedQty) * 100));
                        return (
                          <div key={item.id} className="space-y-1 mb-2">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-700 dark:text-slate-300 font-medium">
                                {item.product.name}
                              </span>
                              <span className="font-mono text-slate-500 dark:text-slate-400">
                                {item.receivedQty} / {item.orderedQty} rec'd
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full"
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ${po.totalAmount.toFixed(2)}
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

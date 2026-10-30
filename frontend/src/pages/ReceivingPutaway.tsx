import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Truck, Plus, CheckCircle2, Clock, Archive, ArrowRight, ShieldCheck, Lock, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ReceivingPutaway: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'GRN' | 'PUTAWAY'>('PUTAWAY');
  const [showAddGRNModal, setShowAddGRNModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    acceptedQty: 95,
    damagedQty: 5,
    rejectedQty: 0,
    batchNumber: 'LOT-2026-REC',
    remarks: 'Visual inspection completed',
  });

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

  const confirmPutawayMutation = useMutation({
    mutationFn: async (task: any) =>
      (
        await api.post(`/receiving/putaway-tasks/${task.id}/confirm`, {
          targetBinId: task.targetBinId,
          quantity: task.quantity,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['putaway-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Putaway confirmation failed.');
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
            },
          ],
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['putaway-tasks'] });
      setShowAddGRNModal(false);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to generate Goods Receipt.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
            <Truck className="w-4 h-4" />
            <span>Goods Inward & Quality Inspection</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Goods Receipts (GRN) & Putaway Tasks
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Acceptance inspection, batch registration, and bin-level putaway posting to stock ledger.
          </p>
        </div>

        {canCreateGRN ? (
          <button
            onClick={() => setShowAddGRNModal(true)}
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
          onClick={() => setActiveTab('PUTAWAY')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'PUTAWAY'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-extrabold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Pending Putaway Tasks ({putawayTasks.filter((t: any) => t.status !== 'COMPLETED').length})
        </button>
        <button
          onClick={() => setActiveTab('GRN')}
          className={`pb-3 border-b-2 transition ${
            activeTab === 'GRN'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-extrabold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Goods Receipt Notes History ({receipts.length})
        </button>
      </div>

      {/* Putaway Tasks View */}
      {activeTab === 'PUTAWAY' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isTasksLoading ? (
              <div className="col-span-3 text-center py-12 text-slate-400 text-xs">
                Loading putaway tasks...
              </div>
            ) : putawayTasks.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-slate-400 text-xs">
                No putaway tasks available.
              </div>
            ) : (
              putawayTasks.map((task: any) => (
                <div
                  key={task.id}
                  className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                    task.status === 'COMPLETED'
                      ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-70'
                      : 'glass-card border-brand-200 dark:border-brand-500/30 shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        GRN: {task.goodsReceiptItem?.goodsReceipt?.grnNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>

                    <div className="font-bold text-slate-900 dark:text-white text-sm">{task.product.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      {task.product.sku}
                    </div>

                    <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                          Target Bin
                        </span>
                        <span className="text-xs font-bold text-brand-700 dark:text-brand-300 font-mono flex items-center space-x-1">
                          <Archive className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                          <span>{task.targetBin?.code}</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Quantity</span>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {task.quantity} {task.product.uom?.symbol}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800">
                    {task.status !== 'COMPLETED' ? (
                      canPutaway ? (
                        <button
                          onClick={() => confirmPutawayMutation.mutate(task)}
                          disabled={confirmPutawayMutation.isPending}
                          className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirm Putaway to Bin</span>
                        </button>
                      ) : (
                        <div className="text-[11px] text-slate-400 text-center flex items-center justify-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>Warehouse Staff authorization required</span>
                        </div>
                      )
                    ) : (
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 text-center font-medium flex items-center justify-center space-x-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Completed & Posted to Ledger</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* GRN View */}
      {activeTab === 'GRN' && (
        <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                <th className="p-4">GRN Document</th>
                <th className="p-4">Supplier & Warehouse</th>
                <th className="p-4">Inspection Breakdown</th>
                <th className="p-4">Putaway Status</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {isReceiptsLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Loading GRN records...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No goods receipts registered yet.
                  </td>
                </tr>
              ) : (
                receipts.map((grn: any) => (
                  <tr key={grn.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-4">
                      <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {grn.grnNumber}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {new Date(grn.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{grn.supplier.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        Receiving Wh: {grn.warehouse.name}
                      </div>
                    </td>
                    <td className="p-4">
                      {grn.items?.map((item: any) => (
                        <div key={item.id} className="space-y-0.5 mb-1 text-[11px]">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{item.product.name}</div>
                          <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                            Delivered: {item.deliveredQty} |{' '}
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Accepted: {item.acceptedQty}
                            </span>{' '}
                            |{' '}
                            <span className="text-rose-600 dark:text-rose-400">
                              Damaged: {item.damagedQty}
                            </span>
                          </div>
                        </div>
                      ))}
                    </td>
                    <td className="p-4">
                      {grn.items?.map((i: any) =>
                        i.putawayTasks?.map((pt: any) => (
                          <div key={pt.id} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center space-x-1">
                            <span>Bin {pt.targetBin?.code}:</span>
                            <span
                              className={
                                pt.status === 'COMPLETED'
                                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                  : 'text-amber-600 dark:text-amber-400 font-bold'
                              }
                            >
                              {pt.status}
                            </span>
                          </div>
                        ))
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                        {grn.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add GRN Modal */}
      {showAddGRNModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-xs">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Generate Goods Receipt Note (GRN)
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
              className="space-y-3"
            >
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
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Receiving Warehouse *</label>
                  <select
                    required
                    value={grnForm.warehouseId}
                    onChange={(e) => setGRNForm({ ...grnForm, warehouseId: e.target.value })}
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
                  onChange={(e) => setGRNForm({ ...grnForm, productId: e.target.value })}
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Delivered Qty *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={grnForm.deliveredQty}
                    onChange={(e) => setGRNForm({ ...grnForm, deliveredQty: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                    onChange={(e) => setGRNForm({ ...grnForm, damagedQty: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Batch / Heat Number</label>
                <input
                  type="text"
                  value={grnForm.batchNumber}
                  onChange={(e) => setGRNForm({ ...grnForm, batchNumber: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-md shadow-brand-500/25 transition disabled:opacity-50"
                >
                  {createGRNMutation.isPending ? 'Generating...' : 'Generate GRN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

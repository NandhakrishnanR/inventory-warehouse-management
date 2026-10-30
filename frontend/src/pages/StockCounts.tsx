import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ClipboardCheck, Plus, CheckCircle2, AlertTriangle, ShieldCheck, Lock, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const StockCounts: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole, hasPermission } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeCount, setActiveCount] = useState<any | null>(null);
  const [countsMap, setCountsMap] = useState<Record<string, { qty: number; reason: string }>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canCreateCount =
    hasRole('ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_MANAGER') || hasPermission('stock_count:create');
  const canRecordCounts =
    hasRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF') || hasPermission('stock_count:record');
  const canPostAdjustments =
    hasRole('ADMIN', 'INVENTORY_MANAGER') || hasPermission('stock_count:post');

  const [createForm, setCreateForm] = useState({
    warehouseId: '',
    countType: 'CYCLE',
    notes: 'Weekly physical inventory cycle count',
  });

  const { data: counts = [], isLoading } = useQuery({
    queryKey: ['stock-counts'],
    queryFn: async () => (await api.get('/stock-counts')).data.data,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data.data,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post('/stock-counts', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] });
      setShowAddModal(false);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to initiate count cycle.');
    },
  });

  const recordCountsMutation = useMutation({
    mutationFn: async ({ id, items }: any) =>
      (await api.post(`/stock-counts/${id}/record-quantities`, { items })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] });
      setActiveCount(null);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to record counts.');
    },
  });

  const postAdjustmentsMutation = useMutation({
    mutationFn: async (id: string) =>
      (await api.post(`/stock-counts/${id}/post-adjustments`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-counts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to post adjustments.');
    },
  });

  const openCountRecording = (count: any) => {
    setActiveCount(count);
    const initialMap: Record<string, { qty: number; reason: string }> = {};
    count.items?.forEach((i: any) => {
      initialMap[i.id] = { qty: i.countedQty, reason: i.reasonCode || 'SURPLUS' };
    });
    setCountsMap(initialMap);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
            <ClipboardCheck className="w-4 h-4" />
            <span>Inventory Accuracy & Audit</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Physical Stock Counts & Adjustments
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Snapshot system balances, record physical counts, compute variances, and post ledger adjustments.
          </p>
        </div>

        {canCreateCount ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-brand-500/25 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Cycle Count</span>
          </button>
        ) : (
          <div
            title="Requires Warehouse Manager, Inventory Manager, or Admin role"
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 text-xs flex items-center space-x-1.5 opacity-70 cursor-not-allowed"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>New Cycle Count</span>
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

      {/* Counts Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                <th className="p-4">Count Sheet</th>
                <th className="p-4">Facility & Zone</th>
                <th className="p-4">Count Items & Variances</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Loading stock counts...
                  </td>
                </tr>
              ) : counts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    No stock count sessions recorded.
                  </td>
                </tr>
              ) : (
                counts.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-4">
                      <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                        {c.countNumber}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">
                        Type: {c.countType} • {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{c.warehouse.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {c.zone ? `Zone: ${c.zone.name}` : 'Entire Facility'}
                      </div>
                    </td>
                    <td className="p-4">
                      {c.items?.map((item: any) => (
                        <div key={item.id} className="text-[11px] space-y-0.5 mb-1.5">
                          <span className="font-bold text-slate-900 dark:text-white">{item.product.name}</span>
                          <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px] block">
                            Sys: {item.systemQty} | Counted: {item.countedQty} |
                            <span
                              className={`ml-1 font-bold ${
                                item.varianceQty === 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : item.varianceQty > 0
                                  ? 'text-cyan-600 dark:text-cyan-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              Var: {item.varianceQty > 0 ? `+${item.varianceQty}` : item.varianceQty}
                            </span>
                          </span>
                        </div>
                      ))}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          c.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : c.status === 'COMPLETED'
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {c.status === 'IN_PROGRESS' && canRecordCounts && (
                        <button
                          onClick={() => openCountRecording(c)}
                          className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-[11px] ml-auto shadow"
                        >
                          Record Quantities
                        </button>
                      )}

                      {c.status === 'COMPLETED' && canPostAdjustments && (
                        <button
                          onClick={() => postAdjustmentsMutation.mutate(c.id)}
                          disabled={postAdjustmentsMutation.isPending}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] ml-auto shadow"
                        >
                          Post Adjustments
                        </button>
                      )}

                      {c.status === 'APPROVED' && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end space-x-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Ledger Reconciled</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Physical Counts Modal */}
      {activeCount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl text-xs">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Record Physical Counts: {activeCount.countNumber}
              </h2>
              <button
                onClick={() => setActiveCount(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter verified physical count quantities. System will compute variance and queue for ledger reconciliation.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const payload = Object.entries(countsMap).map(([itemId, val]) => ({
                  itemId,
                  countedQty: Number(val.qty),
                  reasonCode: val.reason,
                }));
                recordCountsMutation.mutate({ id: activeCount.id, items: payload });
              }}
              className="space-y-4"
            >
              <div className="max-h-72 overflow-y-auto space-y-3 pr-2">
                {activeCount.items?.map((item: any) => {
                  const state = countsMap[item.id] || { qty: item.systemQty, reason: 'SURPLUS' };
                  const variance = state.qty - item.systemQty;

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 dark:text-white">{item.product.name}</span>
                        <span className="text-slate-500 dark:text-slate-400 font-mono">
                          System Qty: {item.systemQty}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                            Counted Physical Units
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={state.qty}
                            onChange={(e) =>
                              setCountsMap({
                                ...countsMap,
                                [item.id]: { ...state, qty: Number(e.target.value) },
                              })
                            }
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                            Variance:{' '}
                            <span
                              className={
                                variance === 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : variance > 0
                                  ? 'text-cyan-600 dark:text-cyan-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {variance}
                            </span>
                          </label>
                          <select
                            value={state.reason}
                            onChange={(e) =>
                              setCountsMap({
                                ...countsMap,
                                [item.id]: { ...state, reason: e.target.value },
                              })
                            }
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            <option value="SURPLUS">Surplus Found</option>
                            <option value="LOSS">Loss / Shrinkage</option>
                            <option value="DAMAGE">Physical Damage</option>
                            <option value="DATA_ENTRY">Data Entry Correction</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveCount(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordCountsMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-md shadow-brand-500/25 transition disabled:opacity-50"
                >
                  {recordCountsMutation.isPending ? 'Saving...' : 'Submit Physical Counts'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Count Session Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl text-xs">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Initiate Stock Count Session</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(createForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Target Facility *</label>
                <select
                  required
                  value={createForm.warehouseId}
                  onChange={(e) => setCreateForm({ ...createForm, warehouseId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select Facility</option>
                  {warehouses.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Count Methodology</label>
                <select
                  value={createForm.countType}
                  onChange={(e) => setCreateForm({ ...createForm, countType: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="CYCLE">Cycle Count (Frequent ABC sample)</option>
                  <option value="FULL">Full Physical Inventory (Wall-to-wall)</option>
                  <option value="SPOT">Spot Check</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Session Notes</label>
                <input
                  type="text"
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-md shadow-brand-500/25 transition disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Starting...' : 'Create Count Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

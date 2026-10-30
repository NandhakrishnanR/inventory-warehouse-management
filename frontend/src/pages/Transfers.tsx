import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ArrowRightLeft, Plus, Send, CheckCircle, AlertTriangle, Truck, Archive, Lock, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Transfers: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole, hasPermission } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [dispatchModalTransfer, setDispatchModalTransfer] = useState<any | null>(null);
  const [receiveModalTransfer, setReceiveModalTransfer] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canInitiateTransfer =
    hasRole('ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_MANAGER') || hasPermission('transfer:create');
  const canOperateTransfer = hasRole('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF');

  const [createForm, setCreateForm] = useState({
    sourceWarehouseId: '',
    destWarehouseId: '',
    productId: '',
    requestedQty: 25,
    reason: 'Depot stock replenishment',
  });

  const [dispatchForm, setDispatchForm] = useState({
    trackingNumber: 'TRK-EXP-' + Math.floor(Math.random() * 10000),
    carrier: 'Apex Logistics Dedicated Freight',
  });

  const [receiveForm, setReceiveForm] = useState({
    receivedQty: 25,
    destBinId: '',
    notes: 'Destination verified intact',
  });

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

  // Fetch bins for destination warehouse
  const { data: destWhTree } = useQuery({
    queryKey: ['warehouse-dest-tree', receiveModalTransfer?.destWarehouseId],
    queryFn: async () => {
      if (!receiveModalTransfer?.destWarehouseId) return null;
      return (await api.get(`/warehouses/${receiveModalTransfer.destWarehouseId}/tree`)).data.data;
    },
    enabled: Boolean(receiveModalTransfer?.destWarehouseId),
  });

  const availableDestBins: any[] = [];
  if (destWhTree) {
    destWhTree.zones?.forEach((z: any) => {
      z.racks?.forEach((r: any) => {
        r.bins?.forEach((b: any) => availableDestBins.push(b));
      });
    });
    destWhTree.bins?.forEach((b: any) => availableDestBins.push(b));
  }

  const createMutation = useMutation({
    mutationFn: async (payload: any) =>
      (
        await api.post('/transfers', {
          sourceWarehouseId: payload.sourceWarehouseId,
          destWarehouseId: payload.destWarehouseId,
          reason: payload.reason,
          items: [
            {
              productId: payload.productId,
              requestedQty: Number(payload.requestedQty),
            },
          ],
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      setShowAddModal(false);
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Transfer initiation failed.');
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: async ({ id, data }: any) =>
      (await api.post(`/transfers/${id}/dispatch`, data)).data,
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
    mutationFn: async ({ id, data }: any) =>
      (await api.post(`/transfers/${id}/receive`, data)).data,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
            <ArrowRightLeft className="w-4 h-4" />
            <span>Inter-Warehouse & Bin Logistics</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Inter-Facility Stock Transfers
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Traceable stock movement lifecycle: Approved → Dispatched (Transit) → Received with Discrepancy audit.
          </p>
        </div>

        {canInitiateTransfer ? (
          <button
            onClick={() => setShowAddModal(true)}
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

      {/* Transfers Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                <th className="p-4">Transfer Number</th>
                <th className="p-4">Source Hub</th>
                <th className="p-4">Destination Hub</th>
                <th className="p-4">Transferred Items</th>
                <th className="p-4 text-center">Status</th>
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
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No transfers on record.
                  </td>
                </tr>
              ) : (
                transfers.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                      <div>{t.transferNumber}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">{t.reason}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{t.sourceWarehouse.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {t.sourceWarehouse.code}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{t.destWarehouse.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {t.destWarehouse.code}
                      </div>
                    </td>
                    <td className="p-4">
                      {t.items?.map((item: any) => (
                        <div key={item.id} className="text-[11px] text-slate-700 dark:text-slate-200 space-y-0.5">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{item.product.name}</span>
                            <span className="text-slate-500 dark:text-slate-400 ml-1">
                              ({item.requestedQty} units)
                            </span>
                          </div>
                          {item.discrepancyQty > 0 && (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Discrepancy: Shortage of {item.discrepancyQty} units</span>
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
                    <td className="p-4 text-right">
                      {t.status === 'APPROVED' && canOperateTransfer && (
                        <button
                          onClick={() => setDispatchModalTransfer(t)}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px] flex items-center space-x-1 ml-auto shadow"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Dispatch Stock</span>
                        </button>
                      )}

                      {t.status === 'IN_TRANSIT' && canOperateTransfer && (
                        <button
                          onClick={() => {
                            setReceiveModalTransfer(t);
                            setReceiveForm({
                              receivedQty: t.items[0]?.dispatchedQty || 25,
                              destBinId: '',
                              notes: 'Received at dock',
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center space-x-1 ml-auto shadow"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Receive Goods</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Initiate Transfer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-xs">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Initiate Stock Transfer</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Stock availability will be validated at source. Once approved, dispatching deducts source balance into transit.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(createForm);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Source Warehouse *</label>
                  <select
                    required
                    value={createForm.sourceWarehouseId}
                    onChange={(e) => setCreateForm({ ...createForm, sourceWarehouseId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Source</option>
                    {warehouses.map((w: any) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Destination Warehouse *</label>
                  <select
                    required
                    value={createForm.destWarehouseId}
                    onChange={(e) => setCreateForm({ ...createForm, destWarehouseId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Destination</option>
                    {warehouses.map((w: any) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Product to Move *</label>
                <select
                  required
                  value={createForm.productId}
                  onChange={(e) => setCreateForm({ ...createForm, productId: e.target.value })}
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

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Transfer Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={createForm.requestedQty}
                  onChange={(e) => setCreateForm({ ...createForm, requestedQty: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Reason / Justification</label>
                <input
                  type="text"
                  value={createForm.reason}
                  onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
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
                  {createMutation.isPending ? 'Initiating...' : 'Submit Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      {dispatchModalTransfer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl text-xs">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dispatch Stock</h2>
              <button
                onClick={() => setDispatchModalTransfer(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Stock will be deducted from source warehouse and placed into transit ledger.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                dispatchMutation.mutate({ id: dispatchModalTransfer.id, data: dispatchForm });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Carrier / Truck</label>
                <input
                  type="text"
                  value={dispatchForm.carrier}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, carrier: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Tracking Number</label>
                <input
                  type="text"
                  value={dispatchForm.trackingNumber}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, trackingNumber: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDispatchModalTransfer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
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

      {/* Destination Receive Modal */}
      {receiveModalTransfer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl text-xs">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Destination Goods Receipt</h2>
              <button
                onClick={() => setReceiveModalTransfer(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Record actual physical units received. Any shortage or discrepancy will be recorded in the discrepancy ledger.
            </p>
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
              className="space-y-3"
            >
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Destination Bin *</label>
                <select
                  required
                  value={receiveForm.destBinId}
                  onChange={(e) => setReceiveForm({ ...receiveForm, destBinId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select Destination Bin</option>
                  {availableDestBins.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.code} ({b.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">
                  Actual Received Quantity (Dispatched: {receiveModalTransfer.items[0]?.dispatchedQty})
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={receiveForm.receivedQty}
                  onChange={(e) => setReceiveForm({ ...receiveForm, receivedQty: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Discrepancy Notes</label>
                <input
                  type="text"
                  value={receiveForm.notes}
                  onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReceiveModalTransfer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={receiveMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/25 transition disabled:opacity-50"
                >
                  {receiveMutation.isPending ? 'Receiving...' : 'Confirm Destination Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

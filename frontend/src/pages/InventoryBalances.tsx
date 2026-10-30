import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Layers, Plus, Warehouse, Archive, Lock, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const InventoryBalances: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole, hasPermission } = useAuth();
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [showDirectIntakeModal, setShowDirectIntakeModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canPerformIntake =
    hasRole('ADMIN', 'INVENTORY_MANAGER', 'WAREHOUSE_MANAGER') || hasPermission('inventory:write');

  const [intakeForm, setIntakeForm] = useState({
    warehouseId: '',
    binId: '',
    productId: '',
    quantity: 10,
    batchNumber: '',
    notes: '',
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get('/warehouses')).data.data,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => (await api.get('/products')).data.data,
  });

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ['stock-balances', selectedWarehouse],
    queryFn: async () => {
      const url = selectedWarehouse ? `/inventory/balances?warehouseId=${selectedWarehouse}` : '/inventory/balances';
      const res = await api.get(url);
      return res.data.data;
    },
  });

  // Fetch bins for selected intake warehouse
  const { data: selectedWhDetails } = useQuery({
    queryKey: ['warehouse-tree', intakeForm.warehouseId],
    queryFn: async () => {
      if (!intakeForm.warehouseId) return null;
      const res = await api.get(`/warehouses/${intakeForm.warehouseId}/tree`);
      return res.data.data;
    },
    enabled: Boolean(intakeForm.warehouseId),
  });

  // Extract flat list of bins
  const availableBins: any[] = [];
  if (selectedWhDetails) {
    selectedWhDetails.zones?.forEach((z: any) => {
      z.racks?.forEach((r: any) => {
        r.bins?.forEach((b: any) => availableBins.push(b));
      });
    });
    selectedWhDetails.bins?.forEach((b: any) => availableBins.push(b));
  }

  const directIntakeMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post('/inventory/direct-receipt', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-balances'] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      setShowDirectIntakeModal(false);
      setIntakeForm({ warehouseId: '', binId: '', productId: '', quantity: 10, batchNumber: '', notes: '' });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Inflow transaction failed.');
    },
  });

  const handleIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    directIntakeMutation.mutate({
      ...intakeForm,
      quantity: Number(intakeForm.quantity),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Multi-Bin Inventory Ledger Summary</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Real-Time Stock Balances
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tracking on-hand, reserved, available, damaged, and in-transit units per bin and batch.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {canPerformIntake ? (
            <button
              onClick={() => setShowDirectIntakeModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-brand-500/25 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Controlled Inflow</span>
            </button>
          ) : (
            <div
              title="Requires Inventory Manager or Warehouse Manager role"
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 text-xs flex items-center space-x-1.5 opacity-70 cursor-not-allowed"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Controlled Inflow</span>
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

      {/* Filter Bar */}
      <div className="glass-card p-4 rounded-xl flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-3">
          <Warehouse className="w-4 h-4 text-slate-400" />
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Warehouses & Locations</option>
            {warehouses.map((w: any) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>

        <div className="text-[11px] text-slate-400 font-mono hidden md:block">
          Rule: Available = On-Hand - Reservations - Damaged - Quarantined
        </div>
      </div>

      {/* Balances Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                <th className="p-4">Product / SKU</th>
                <th className="p-4">Warehouse & Site</th>
                <th className="p-4">Bin Location</th>
                <th className="p-4">Batch / Lot</th>
                <th className="p-4 text-right">On-Hand</th>
                <th className="p-4 text-right">Reserved</th>
                <th className="p-4 text-right">In-Transit</th>
                <th className="p-4 text-right font-bold text-brand-600 dark:text-brand-400">Available Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Loading stock balances...
                  </td>
                </tr>
              ) : balances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No stock balances found.
                  </td>
                </tr>
              ) : (
                balances.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">{b.product.name}</div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{b.product.sku}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{b.warehouse.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {b.warehouse.site?.name || b.warehouse.code}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-brand-700 dark:text-brand-300 font-mono text-[11px] border border-slate-200 dark:border-slate-700 flex items-center space-x-1 w-fit">
                        <Archive className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                        <span>{b.bin?.code || 'Unassigned Dock'}</span>
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                      {b.batchNumber || '—'}
                    </td>
                    <td className="p-4 text-right font-semibold text-slate-900 dark:text-white">
                      {b.onHandQty} {b.product.uom?.symbol}
                    </td>
                    <td className="p-4 text-right text-slate-500 dark:text-slate-400">{b.reservedQty}</td>
                    <td className="p-4 text-right text-sky-600 dark:text-sky-400 font-mono">
                      {b.inTransitQty > 0 ? `+${b.inTransitQty}` : '0'}
                    </td>
                    <td className="p-4 text-right">
                      <span className="px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-extrabold text-sm font-mono">
                        {b.availableQty}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Controlled Inflow Modal */}
      {showDirectIntakeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Controlled Inventory Inflow</h2>
              <button
                onClick={() => setShowDirectIntakeModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Directly records a verified intake into a specific warehouse bin and writes an atomic transaction to the stock ledger.
            </p>
            <form onSubmit={handleIntakeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Target Warehouse *</label>
                <select
                  required
                  value={intakeForm.warehouseId}
                  onChange={(e) => setIntakeForm({ ...intakeForm, warehouseId: e.target.value, binId: '' })}
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

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Target Storage Bin *</label>
                <select
                  required
                  value={intakeForm.binId}
                  onChange={(e) => setIntakeForm({ ...intakeForm, binId: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  disabled={!intakeForm.warehouseId}
                >
                  <option value="">{intakeForm.warehouseId ? 'Select Bin' : 'Select warehouse first'}</option>
                  {availableBins.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.code} ({b.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Product *</label>
                  <select
                    required
                    value={intakeForm.productId}
                    onChange={(e) => setIntakeForm({ ...intakeForm, productId: e.target.value })}
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
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Intake Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={intakeForm.quantity}
                    onChange={(e) => setIntakeForm({ ...intakeForm, quantity: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Batch / Lot Number</label>
                <input
                  type="text"
                  value={intakeForm.batchNumber}
                  onChange={(e) => setIntakeForm({ ...intakeForm, batchNumber: e.target.value })}
                  placeholder="LOT-2026-X"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Audit Ledger Notes</label>
                <input
                  type="text"
                  value={intakeForm.notes}
                  onChange={(e) => setIntakeForm({ ...intakeForm, notes: e.target.value })}
                  placeholder="Reason / Reference document"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDirectIntakeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={directIntakeMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-md shadow-brand-500/25 transition disabled:opacity-50"
                >
                  {directIntakeMutation.isPending ? 'Posting Ledger...' : 'Post to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

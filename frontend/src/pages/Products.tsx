import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Package, Search, Plus, AlertTriangle, CheckCircle, Lock, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Products: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole, hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canManageProducts = hasRole('ADMIN', 'INVENTORY_MANAGER') || hasPermission('inventory:write');

  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    categoryId: '',
    uomId: '',
    brand: '',
    costPrice: 0,
    sellingPrice: 0,
    reorderLevel: 20,
    minStock: 10,
    maxStock: 500,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/products/categories')).data.data,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: async () => (await api.get('/products/units')).data.data,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', search, selectedCategory, lowStockOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (lowStockOnly) params.append('lowStockOnly', 'true');
      const res = await api.get(`/products?${params.toString()}`);
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post('/products', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowAddModal(false);
      setFormData({
        sku: '',
        barcode: '',
        name: '',
        description: '',
        categoryId: '',
        uomId: '',
        brand: '',
        costPrice: 0,
        sellingPrice: 0,
        reorderLevel: 20,
        minStock: 10,
        maxStock: 500,
      });
      setErrorMessage(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create product master.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      costPrice: Number(formData.costPrice),
      sellingPrice: Number(formData.sellingPrice),
      reorderLevel: Number(formData.reorderLevel),
      minStock: Number(formData.minStock),
      maxStock: Number(formData.maxStock),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
            <Package className="w-4 h-4" />
            <span>Master Data Catalog</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Product Master & Inventory Parameters
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            SKU definitions, UoM conversions, reorder thresholds, and real-time total on-hand balances.
          </p>
        </div>

        {canManageProducts ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-brand-500/20 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Product</span>
          </button>
        ) : (
          <div
            title="Requires INVENTORY_MANAGER or ADMIN role"
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center space-x-2 cursor-not-allowed opacity-75 self-start sm:self-auto"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Read-Only Catalog</span>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by SKU, Product Name, or Barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Categories</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700"
          />
          <span className="font-medium text-amber-600 dark:text-amber-400 flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Only</span>
          </span>
        </label>
      </div>

      {/* Products Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                <th className="p-4">SKU & Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Unit</th>
                <th className="p-4 text-right">Cost / Selling</th>
                <th className="p-4 text-center">Thresholds</th>
                <th className="p-4 text-right">Total On-Hand</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    Loading catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No products match the filter criteria.
                  </td>
                </tr>
              ) : (
                products.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{p.name}</div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] mt-0.5">
                        {p.sku} {p.barcode && `• Barcode: ${p.barcode}`}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] border border-slate-200 dark:border-slate-700">
                        {p.category?.name}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                      {p.uom?.name} ({p.uom?.symbol})
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-slate-800 dark:text-slate-300 font-medium">${p.costPrice.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">Sell: ${p.sellingPrice.toFixed(2)}</div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="text-slate-700 dark:text-slate-300">
                        Min: {p.minStock} | Max: {p.maxStock}
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        Reorder at: {p.reorderLevel}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {p.totalOnHand} {p.uom?.symbol}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Avail: {p.totalAvailable} | Res: {p.totalReserved}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {p.isOutOfStock ? (
                        <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[10px] font-bold">
                          OUT OF STOCK
                        </span>
                      ) : p.isLowStock ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-[10px] font-bold flex items-center justify-center space-x-1 mx-auto w-fit">
                          <AlertTriangle className="w-3 h-3" />
                          <span>LOW STOCK</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold flex items-center justify-center space-x-1 mx-auto w-fit">
                          <CheckCircle className="w-3 h-3" />
                          <span>NORMAL</span>
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

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create New Product Master</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="SKU-PRD-001"
                  />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Barcode</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="89012345..."
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Precision Stainless Steel Bearing"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Category *</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Unit of Measure *</label>
                  <select
                    required
                    value={formData.uomId}
                    onChange={(e) => setFormData({ ...formData, uomId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select Unit</option>
                    {units.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
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
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-md shadow-brand-500/20 transition disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

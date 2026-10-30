import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { ScrollText, Filter, Calendar, FileText, User } from 'lucide-react';

export const StockLedger: React.FC = () => {
  const [selectedType, setSelectedType] = useState('');
  const [page, setPage] = useState(1);

  const { data: movementsData, isLoading } = useQuery({
    queryKey: ['stock-movements', selectedType, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedType) params.append('transactionType', selectedType);
      params.append('page', String(page));
      params.append('limit', '25');
      const res = await api.get(`/inventory/movements?${params.toString()}`);
      return res.data;
    },
  });

  const movements = movementsData?.data || [];
  const pagination = movementsData?.pagination || { total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
            <ScrollText className="w-4 h-4" />
            <span>Immutable Source of Truth</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Stock Movement Transaction Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Strict append-only transaction ledger with atomic posting and zero un-traceable adjustments.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl text-xs">
          <Filter className="w-4 h-4 text-slate-400 ml-2" />
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="bg-transparent text-slate-800 dark:text-white px-2 py-1 focus:outline-none"
          >
            <option value="" className="bg-white dark:bg-slate-900">All Transaction Types</option>
            <option value="RECEIPT" className="bg-white dark:bg-slate-900">RECEIPT (Intake / GRN)</option>
            <option value="ISSUE" className="bg-white dark:bg-slate-900">ISSUE (Material Consumption)</option>
            <option value="TRANSFER_OUT" className="bg-white dark:bg-slate-900">TRANSFER_OUT (Dispatched)</option>
            <option value="TRANSFER_IN" className="bg-white dark:bg-slate-900">TRANSFER_IN (Received)</option>
            <option value="ADJUSTMENT_UP" className="bg-white dark:bg-slate-900">ADJUSTMENT_UP (Surplus)</option>
            <option value="ADJUSTMENT_DOWN" className="bg-white dark:bg-slate-900">ADJUSTMENT_DOWN (Loss/Shrinkage)</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                <th className="p-4">Transaction / Time</th>
                <th className="p-4">Type</th>
                <th className="p-4">Product / SKU</th>
                <th className="p-4">Source Location</th>
                <th className="p-4">Destination Location</th>
                <th className="p-4 text-right">Quantity</th>
                <th className="p-4">Reference & Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-sans">
                    Reading ledger journal...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-sans">
                    No transactions matching criteria.
                  </td>
                </tr>
              ) : (
                movements.map((m: any) => {
                  const isPositive = ['RECEIPT', 'TRANSFER_IN', 'ADJUSTMENT_UP'].includes(m.transactionType);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-white text-[12px]">
                          {m.transactionNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans flex items-center space-x-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{new Date(m.createdAt).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                            m.transactionType === 'RECEIPT'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : m.transactionType.includes('TRANSFER')
                              ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                              : m.transactionType === 'ISSUE'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {m.transactionType}
                        </span>
                      </td>
                      <td className="p-4 font-sans">
                        <div className="font-semibold text-slate-800 dark:text-white">{m.product.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          {m.product.sku}
                        </div>
                      </td>
                      <td className="p-4 font-sans">
                        {m.sourceWarehouse ? (
                          <div className="text-slate-700 dark:text-slate-300">
                            {m.sourceWarehouse.name}
                            {m.sourceBin && (
                              <span className="text-[10px] text-brand-600 dark:text-brand-400 block font-mono">
                                Bin: {m.sourceBin.code}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-4 font-sans">
                        {m.destWarehouse ? (
                          <div className="text-slate-700 dark:text-slate-300">
                            {m.destWarehouse.name}
                            {m.destBin && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono">
                                Bin: {m.destBin.code}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={`font-bold text-sm ${
                            isPositive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isPositive ? '+' : '-'}{m.quantity}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1 font-sans">
                          {m.product.uom?.symbol}
                        </span>
                      </td>
                      <td className="p-4 font-sans">
                        <div className="text-[11px] text-slate-700 dark:text-slate-200 font-mono flex items-center space-x-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span>{m.referenceType}: {m.referenceId || 'N/A'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>By {m.performedBy.username}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing Page <span className="font-bold text-slate-900 dark:text-white">{page}</span> of {pagination.totalPages} ({pagination.total} total postings)
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

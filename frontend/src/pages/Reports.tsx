import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { BarChart3, Download, DollarSign } from 'lucide-react';

export const Reports: React.FC = () => {
  const { data: valuation = [], isLoading } = useQuery({
    queryKey: ['valuation-report'],
    queryFn: async () => (await api.get('/reports/valuation')).data.data,
  });

  const totalPortfolioValuation = valuation.reduce((sum: number, item: any) => sum + item.valuation, 0);

  const exportCSV = () => {
    if (valuation.length === 0) return;
    const headers = [
      'SKU',
      'Product Name',
      'Category',
      'Unit',
      'Unit Cost',
      'Selling Price',
      'Total Qty',
      'Total Valuation ($)',
    ];
    const rows = valuation.map((v: any) => [
      v.sku,
      `"${v.name}"`,
      `"${v.category}"`,
      v.uom,
      v.costPrice,
      v.sellingPrice,
      v.totalQty,
      v.valuation,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Apex_Inventory_Valuation_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
            <BarChart3 className="w-4 h-4" />
            <span>Executive Inventory Intelligence</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Inventory Valuation & Location Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Financial asset valuation, cost-of-goods breakdown, and CSV data export for auditors.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-semibold flex items-center space-x-2 border border-slate-200 dark:border-slate-700 shadow-sm transition"
        >
          <Download className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Valuation Summary Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-gradient-to-r dark:from-violet-950/60 dark:via-slate-900 dark:to-slate-900 border border-violet-200 dark:border-violet-800/40 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wider">
            Total Inventory Asset Valuation
          </span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 font-mono tracking-tight">
            $
            {totalPortfolioValuation.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Valued using standard manufacturing cost methodology across active warehouses.
          </p>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-600/20 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 flex items-center justify-center">
          <DollarSign className="w-6 h-6" />
        </div>
      </div>

      {/* Valuation Details Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                <th className="p-4">SKU / Item</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Standard Cost</th>
                <th className="p-4 text-right">Selling Price</th>
                <th className="p-4 text-right">On-Hand Stock</th>
                <th className="p-4 text-right font-bold text-violet-600 dark:text-violet-400">Total Asset Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Calculating portfolio valuation...
                  </td>
                </tr>
              ) : (
                valuation.map((v: any) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{v.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{v.sku}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] border border-slate-200 dark:border-slate-700">
                        {v.category}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-slate-700 dark:text-slate-300">
                      ${v.costPrice.toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-mono text-slate-500 dark:text-slate-400">
                      ${v.sellingPrice.toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900 dark:text-white font-mono">
                      {v.totalQty} {v.uom}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-sm text-violet-600 dark:text-violet-400">
                      ${v.valuation.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

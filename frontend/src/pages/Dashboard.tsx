import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import {
  Package,
  Layers,
  DollarSign,
  AlertTriangle,
  ArrowRightLeft,
  Clock,
  ArrowUpRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['stock-summary'],
    queryFn: async () => {
      const res = await api.get('/reports/stock-summary');
      return res.data.data;
    },
  });

  const { data: recentMovements = [], isLoading: isMovementsLoading } = useQuery({
    queryKey: ['recent-movements'],
    queryFn: async () => {
      const res = await api.get('/inventory/movements?limit=6');
      return res.data.data;
    },
  });

  const metrics = summaryData?.metrics || {
    totalProducts: 0,
    totalStockQuantity: 0,
    totalStockValuation: 0,
    lowStockProducts: 0,
    pendingApprovals: 0,
    transfersInTransit: 0,
  };

  const statCards = [
    {
      title: 'Total Active SKUs',
      value: metrics.totalProducts,
      sub: 'Cataloged products',
      icon: Package,
      color: 'from-blue-600 to-cyan-500',
      link: '/products',
    },
    {
      title: 'Total Stock Quantity',
      value: metrics.totalStockQuantity.toLocaleString(),
      sub: 'Physical units in storage',
      icon: Layers,
      color: 'from-emerald-600 to-teal-500',
      link: '/balances',
    },
    {
      title: 'Total Inventory Valuation',
      value: `$${metrics.totalStockValuation.toLocaleString()}`,
      sub: 'Standard cost valuation',
      icon: DollarSign,
      color: 'from-violet-600 to-purple-500',
      link: '/reports',
    },
    {
      title: 'Low Stock Alerts',
      value: metrics.lowStockProducts,
      sub: 'At or below reorder level',
      icon: AlertTriangle,
      color: metrics.lowStockProducts > 0 ? 'from-amber-600 to-orange-500' : 'from-slate-600 to-slate-500',
      link: '/products?lowStock=true',
    },
    {
      title: 'Transfers In-Transit',
      value: metrics.transfersInTransit,
      sub: 'Dispatched between facilities',
      icon: ArrowRightLeft,
      color: 'from-sky-600 to-blue-500',
      link: '/transfers',
    },
    {
      title: 'Pending Approvals',
      value: metrics.pendingApprovals,
      sub: 'Awaiting your review',
      icon: Clock,
      color: 'from-rose-600 to-pink-500',
      link: '/approvals',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:via-brand-950/40 dark:to-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Enterprise Multi-Location Operations
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time multi-location warehouse visibility, double-entry inventory ledger, and approval workflows.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/transfers"
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5 transition"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>New Transfer</span>
          </Link>
          <Link
            to="/procurement"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-xs font-semibold text-white shadow-lg shadow-brand-500/25 flex items-center space-x-1.5 transition"
          >
            <span>Procure Goods</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, idx) => (
          <Link
            key={idx}
            to={card.link}
            className="glass-card glass-card-hover p-4 rounded-xl flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.title}</span>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${card.color} flex items-center justify-center text-white shadow-md`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:text-brand-600 dark:group-hover:text-brand-300 transition">
                {card.value}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{card.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Breakdowns & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Breakdown by City & Warehouse */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Stock by Location Hub</h3>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-400">Physical on-hand</span>
            </div>

            <div className="mt-4 space-y-3">
              {summaryData?.breakdowns?.byCity &&
                Object.entries(summaryData.breakdowns.byCity).map(([city, qty]: any) => (
                  <div key={city} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <span>{city} Region</span>
                      <span className="text-brand-600 dark:text-brand-400 font-bold">{qty.toLocaleString()} units</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-brand-500 to-indigo-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.round((qty / (metrics.totalStockQuantity || 1)) * 100))}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
            <span>Locations Active: 2 Cities, 2 Warehouses</span>
            <Link to="/hierarchy" className="text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1 font-medium">
              <span>View Tree</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Recent Ledger Transactions */}
        <div className="glass-card p-5 rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Ledger Postings</h3>
            </div>
            <Link to="/ledger" className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1 font-medium">
              <span>View Full Ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-4 divide-y divide-slate-200/80 dark:divide-slate-800/80">
            {recentMovements.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No stock movements recorded yet.</div>
            ) : (
              recentMovements.map((m: any) => (
                <div key={m.id} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/80 dark:hover:bg-slate-800/40 px-2 rounded-lg transition">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${m.transactionType === 'RECEIPT'
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
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{m.product.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {m.transactionNumber} • By {m.performedBy.username}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {m.quantity} {m.product.uom.symbol}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

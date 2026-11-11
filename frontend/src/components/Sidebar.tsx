import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  Package,
  Layers,
  ScrollText,
  ShoppingCart,
  Truck,
  ArrowLeftRight,
  ClipboardCheck,
  Inbox,
  BarChart3,
  History,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Warehouse Tree', path: '/hierarchy', icon: Network },
    { label: 'Product Master', path: '/products', icon: Package },
    { label: 'Stock Balances', path: '/balances', icon: Layers },
    { label: 'Movement Ledger', path: '/ledger', icon: ScrollText },
    { label: 'Procurement & PO', path: '/procurement', icon: ShoppingCart },
    { label: 'Receiving & Putaway', path: '/receiving', icon: Truck },
    { label: 'Stock Transfers', path: '/transfers', icon: ArrowLeftRight },
    { label: 'Counts & Variance', path: '/stock-counts', icon: ClipboardCheck },
    { label: 'Approval Inbox', path: '/approvals', icon: Inbox },
    { label: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    { label: 'Audit Trail', path: '/audit', icon: History },
    { label: 'Users & Permissions', path: '/users', icon: Users, badge: 'RBAC' },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 transition-colors duration-150">
      <div className="p-4 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
          Warehouse ERP Operations
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${isActive
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/25 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 font-mono">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 m-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping"></span>
          <span>Ledger Synced</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          PostgreSQL ACID ledger transactions verified.
        </p>
      </div>
    </aside>
  );
};

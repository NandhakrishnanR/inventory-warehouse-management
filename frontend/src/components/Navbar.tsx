import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Bell,
  User,
  LogOut,
  Shield,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  Building2,
  Sun,
  Moon,
  Key,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const Navbar: React.FC = () => {
  const { user, logout, login } = useAuth();
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/reports/notifications');
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const demoRoles = [
    { label: 'Admin (System)', username: 'admin', role: 'ADMIN', badge: 'Full Access' },
    { label: 'Inventory Manager', username: 'inv_manager', role: 'INVENTORY_MANAGER', badge: 'Stock & Items' },
    { label: 'Warehouse Manager', username: 'wh_manager', role: 'WAREHOUSE_MANAGER', badge: 'Racks & Bins' },
    { label: 'Warehouse Staff', username: 'wh_staff', role: 'WAREHOUSE_STAFF', badge: 'Scan & Pick' },
    { label: 'Procurement Officer', username: 'proc_officer', role: 'PROCUREMENT_OFFICER', badge: 'PO & Vendors' },
    { label: 'Department Head', username: 'dept_manager', role: 'DEPARTMENT_MANAGER', badge: 'Req & Sign-off' },
    { label: 'Finance Approver', username: 'fin_approver', role: 'FINANCE_APPROVER', badge: 'CapEx Approval' },
    { label: 'Auditor', username: 'auditor', role: 'AUDITOR', badge: 'Read Only' },
  ];

  const handleRoleSwitch = async (username: string) => {
    try {
      await login(username, 'Password123!');
      setShowRoleMenu(false);
    } catch (err) {
      console.error('Role switch failed:', err);
    }
  };

  const primaryRole = user?.roles?.[0] || 'User';
  const permissionsCount = user?.permissions?.length || 0;

  return (
    <header className="h-16 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-150">
      {/* Brand & Version */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-brand-500 dark:text-brand-400 font-bold text-lg tracking-tight">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="text-slate-900 dark:text-white font-extrabold text-xl tracking-tight">
            APEX<span className="text-brand-600 dark:text-brand-400 font-light">ERP</span>
          </span>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
          v1.0 • Enterprise Warehouse
        </span>
      </div>

      <div className="flex items-center space-x-3">
        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition flex items-center justify-center"
          aria-label="Toggle Theme"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 transition transform hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600 transition transform hover:-rotate-12" />
          )}
        </button>

        {/* Quick Role Switcher for Seamless Testing & Demonstration */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
          >
            <Shield className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span className="font-semibold text-brand-700 dark:text-brand-300">{primaryRole}</span>
            <span className="hidden sm:inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
              <Key className="w-2.5 h-2.5" />
              <span>{permissionsCount} perms</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex justify-between items-center">
                <span>Switch Demo Persona</span>
                <span className="text-[10px] font-mono text-brand-600 dark:text-brand-400">8 Roles</span>
              </div>
              <div className="space-y-1 mt-1">
                {demoRoles.map((dr) => (
                  <button
                    key={dr.username}
                    onClick={() => handleRoleSwitch(dr.username)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${user?.username === dr.username
                      ? 'bg-brand-600 text-white font-medium shadow-md shadow-brand-500/20'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                      }`}
                  >
                    <div>
                      <div className="font-medium">{dr.label}</div>
                      <div className={`text-[10px] ${user?.username === dr.username ? 'text-brand-100' : 'text-slate-400 dark:text-slate-500'}`}>
                        {dr.badge}
                      </div>
                    </div>
                    {user?.username === dr.username && <CheckCircle className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 relative transition"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2 mb-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Alerts & Notifications</span>
                <span className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold">{unreadCount} unread</span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400">No new notifications</div>
                ) : (
                  notifications.slice(0, 5).map((n: any) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/40 text-xs"
                    >
                      <div className="flex items-center space-x-1.5 font-semibold text-amber-600 dark:text-amber-400 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{n.title}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px]">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center space-x-3 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              {user?.employee?.name || user?.username}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              {user?.employee?.department || user?.email}
            </div>
          </div>
          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

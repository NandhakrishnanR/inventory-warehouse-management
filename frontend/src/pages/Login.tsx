import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Shield, ArrowRight, Sun, Moon } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { label: 'System Admin', username: 'admin', role: 'ADMIN' },
    { label: 'Inventory Mgr', username: 'inv_manager', role: 'INVENTORY_MANAGER' },
    { label: 'Warehouse Mgr', username: 'wh_manager', role: 'WAREHOUSE_MANAGER' },
    { label: 'Warehouse Staff', username: 'wh_staff', role: 'WAREHOUSE_STAFF' },
    { label: 'Procurement Officer', username: 'proc_officer', role: 'PROCUREMENT_OFFICER' },
    { label: 'Department Head', username: 'dept_manager', role: 'DEPARTMENT_MANAGER' },
    { label: 'Finance Approver', username: 'fin_approver', role: 'FINANCE_APPROVER' },
    { label: 'Auditor', username: 'auditor', role: 'AUDITOR' },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (uname: string) => {
    setUsername(uname);
    setPassword('Password123!');
    setLoading(true);
    try {
      await login(uname, 'Password123!');
      navigate('/');
    } catch (err: any) {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden transition-colors duration-150">
      {/* Theme toggle in top right */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-sm transition"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>
      </div>

      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 dark:bg-brand-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-6 z-10">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 mx-auto flex items-center justify-center text-white shadow-xl shadow-brand-500/25">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            APEX<span className="text-brand-600 dark:text-brand-400 font-light">ERP</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enterprise Multi-Location Inventory & Warehouse System
          </p>
        </div>

        <div className="glass-card p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">
                Username or Corporate Email
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="admin or user@apexerp.com"
              />
            </div>

            <div>
              <label className="text-slate-700 dark:text-slate-300 block mb-1 font-semibold">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-brand-500/25 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2.5 text-center">
              1-Click Demo Personas
            </span>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((d) => (
                <button
                  key={d.username}
                  type="button"
                  onClick={() => handleQuickLogin(d.username)}
                  className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-left transition"
                >
                  <div className="text-[11px] font-bold text-slate-800 dark:text-white truncate">
                    {d.label}
                  </div>
                  <div className="text-[9px] text-brand-600 dark:text-brand-400 font-mono truncate">
                    {d.role}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 font-mono">
          Demo Default Password: <span className="text-slate-700 dark:text-slate-300 font-semibold">Password123!</span>
        </div>
      </div>
    </div>
  );
};

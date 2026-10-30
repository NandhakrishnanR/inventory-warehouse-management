import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  Building,
  UserCheck,
  UserX,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Lock,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserRecord, RoleRecord, PermissionRecord } from '../types';

export const UsersManagement: React.FC = () => {
  const { user: currentUser, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'users' | 'matrix' | 'permissions'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserRecord | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const isAdmin = currentUser?.roles?.includes('ADMIN');

  // Queries
  const { data: users = [], isLoading: loadingUsers, refetch: refetchUsers } = useQuery<UserRecord[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/auth/users');
      return res.data.data;
    },
  });

  const { data: roles = [], isLoading: loadingRoles } = useQuery<RoleRecord[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get('/auth/roles');
      return res.data.data;
    },
  });

  const { data: permissions = [], isLoading: loadingPermissions } = useQuery<PermissionRecord[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await api.get('/auth/permissions');
      return res.data.data;
    },
  });

  // Mutations
  const toggleStatusMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.patch(`/auth/users/${userId}/toggle-status`);
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess('User status updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setTimeout(() => setActionSuccess(null), 4000);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Failed to update user status.');
      setTimeout(() => setActionError(null), 5000);
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const res = await api.post('/auth/users/assign-role', { userId, roleId });
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess('Role assigned successfully.');
      setSelectedUserForRole(null);
      setSelectedRoleId('');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setTimeout(() => setActionSuccess(null), 4000);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Failed to assign role.');
      setTimeout(() => setActionError(null), 5000);
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const res = await api.post('/auth/users/remove-role', { userId, roleId });
      return res.data;
    },
    onSuccess: () => {
      setActionSuccess('Role removed successfully.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setTimeout(() => setActionSuccess(null), 4000);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Failed to remove role.');
      setTimeout(() => setActionError(null), 5000);
    },
  });

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.employee?.name && u.employee.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.employee?.department && u.employee.department.toLowerCase().includes(searchQuery.toLowerCase()));

    if (roleFilter === 'ALL') return matchesSearch;
    return matchesSearch && u.userRoles.some((ur) => ur.role.name === roleFilter);
  });

  const getRoleBadgeClass = (roleName: string) => {
    switch (roleName) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'INVENTORY_MANAGER':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'WAREHOUSE_MANAGER':
        return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800';
      case 'WAREHOUSE_STAFF':
        return 'bg-teal-100 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      case 'PROCUREMENT_OFFICER':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'DEPARTMENT_MANAGER':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'FINANCE_APPROVER':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'AUDITOR':
        return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & KPI Cards */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2.5">
            <Shield className="w-7 h-7 text-brand-600 dark:text-brand-400" />
            <span>Access Control & Permission Matrix</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enterprise RBAC governing multi-tier warehouse access, ledger modifications, and approval authority.
          </p>
        </div>

        <button
          onClick={() => refetchUsers()}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center space-x-2 animate-in fade-in">
          <XCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{users.length}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{users.filter((u) => u.isActive).length} active enterprise accounts</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">System Roles</span>
            <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{roles.length || 8}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Full RBAC separation of duties
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Granular Permissions</span>
            <Key className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{permissions.length || 25}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Across 7 functional modules
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Your Active Persona</span>
            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-lg font-bold text-brand-600 dark:text-brand-400 truncate">
            {currentUser?.roles?.[0] || 'User'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {currentUser?.permissions?.length || 0} permissions resolved
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex space-x-4">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-xs font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'users'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Directory & Role Assignments</span>
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 text-xs font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'matrix'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Role & Permission Matrix</span>
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`pb-3 text-xs font-semibold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'permissions'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Granular Permissions Catalog</span>
        </button>
      </div>

      {/* Tab 1: User Directory */}
      {activeTab === 'users' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          {/* Controls bar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, username, email, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">All Roles ({roles.length})</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">User / Employee</th>
                  <th className="py-3 px-4">Assigned Roles</th>
                  <th className="py-3 px-4">Warehouse Access</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading users directory...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No users match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      {/* Name / Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {u.employee?.name || u.username}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-2">
                          <span>@{u.username}</span>
                          <span>•</span>
                          <span>{u.email}</span>
                          {u.employee?.department && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-brand-600 dark:text-brand-400">
                                {u.employee.department}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Roles */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {u.userRoles.map((ur) => (
                            <span
                              key={ur.role.id}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${getRoleBadgeClass(
                                ur.role.name
                              )}`}
                            >
                              <span>{ur.role.name}</span>
                              {isAdmin && u.userRoles.length > 1 && (
                                <button
                                  onClick={() =>
                                    removeRoleMutation.mutate({ userId: u.id, roleId: ur.role.id })
                                  }
                                  title={`Remove ${ur.role.name}`}
                                  className="ml-1 text-slate-400 hover:text-rose-600 transition"
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          ))}
                          {isAdmin && (
                            <button
                              onClick={() => setSelectedUserForRole(u)}
                              className="px-2 py-0.5 rounded-md border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-brand-600 hover:border-brand-500 transition text-[10px] flex items-center space-x-1"
                              title="Assign another role"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Role</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Warehouse Access */}
                      <td className="py-3.5 px-4">
                        {u.userWarehouses && u.userWarehouses.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.userWarehouses.map((uw, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              >
                                <Building className="w-2.5 h-2.5 text-slate-400" />
                                <span>{uw.warehouse.name}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Enterprise Global (All Sites)</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.isActive
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {isAdmin ? (
                          <button
                            onClick={() => toggleStatusMutation.mutate(u.id)}
                            disabled={toggleStatusMutation.isPending}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition inline-flex items-center space-x-1.5 ${
                              u.isActive
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            {u.isActive ? (
                              <>
                                <UserX className="w-3 h-3" />
                                <span>Suspend</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3" />
                                <span>Reactivate</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Admin Only</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Role & Permission Matrix */}
      {activeTab === 'matrix' && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Comprehensive Role-Permission Mapping Matrix
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verified against database <code className="font-mono">RolePermission</code> table.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
              {permissions.length} Granular Gates
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4 min-w-[200px]">Permission Code / Description</th>
                  {roles.map((r) => (
                    <th key={r.id} className="py-3 px-2 text-center min-w-[100px] text-[11px]">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{r.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                {permissions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4">
                      <div className="font-mono font-semibold text-brand-600 dark:text-brand-400">{p.code}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{p.description}</div>
                    </td>
                    {roles.map((r) => {
                      const hasPerm =
                        r.name === 'ADMIN' ||
                        r.rolePermissions?.some((rp) => rp.permission?.code === p.code || rp.permission?.id === p.id);

                      return (
                        <td key={r.id} className="py-2.5 px-2 text-center">
                          {hasPerm ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                              ✓
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-300 dark:text-slate-700">
                              -
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Permissions Catalog */}
      {activeTab === 'permissions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {['inventory', 'transfer', 'procurement', 'receiving', 'stock_count', 'warehouse', 'reports', 'audit', 'users'].map(
            (module) => {
              const modulePerms = permissions.filter((p) => p.module === module);
              if (modulePerms.length === 0) return null;

              return (
                <div key={module} className="glass-card p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                      <span className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                        {module.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                        {modulePerms.length} rules
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {modulePerms.map((p) => (
                        <div
                          key={p.id}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80"
                        >
                          <div className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
                            {p.code}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {p.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* Assign Role Modal */}
      {selectedUserForRole && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Shield className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>Assign Role to {selectedUserForRole.employee?.name || selectedUserForRole.username}</span>
              </h3>
              <button
                onClick={() => setSelectedUserForRole(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a role from the enterprise directory to grant this user corresponding granular permissions.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Available Roles</label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select a role...</option>
                {roles
                  .filter((r) => !selectedUserForRole.userRoles.some((ur) => ur.role.id === r.id))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} - {r.description}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedUserForRole(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                disabled={!selectedRoleId || assignRoleMutation.isPending}
                onClick={() =>
                  assignRoleMutation.mutate({
                    userId: selectedUserForRole.id,
                    roleId: selectedRoleId,
                  })
                }
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/25 transition disabled:opacity-50"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  User,
  ArrowRight,
  ExternalLink,
  Layers,
  FileText,
  Building,
  Check,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ApprovalInbox: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab scopes: 'assigned' (default), 'submitted', 'all', 'history'
  const initialScope = (searchParams.get('scope') as 'assigned' | 'submitted' | 'all' | 'history') || 'assigned';
  const [activeScope, setActiveScope] = useState<'assigned' | 'submitted' | 'all' | 'history'>(initialScope);

  const [selectedInstance, setSelectedInstance] = useState<any | null>(null);
  const [comments, setComments] = useState('');
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'RETURN'>('APPROVE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Type Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<'ALL' | 'PURCHASE_REQUISITION' | 'STOCK_TRANSFER'>('ALL');

  const isAdmin = hasRole('ADMIN');
  const isFinance = hasRole('FINANCE_APPROVER');
  const isAuditor = hasRole('AUDITOR');

  const handleScopeChange = (scope: 'assigned' | 'submitted' | 'all' | 'history') => {
    setActiveScope(scope);
    setSearchParams({ scope });
  };

  const { data: inbox = [], isLoading } = useQuery({
    queryKey: ['approval-inbox', activeScope],
    queryFn: async () => (await api.get(`/approvals/inbox?scope=${activeScope}`)).data.data,
  });

  // Query counts for badges
  const { data: assignedItems = [] } = useQuery({
    queryKey: ['approval-inbox', 'assigned'],
    queryFn: async () => (await api.get('/approvals/inbox?scope=assigned')).data.data,
  });

  const { data: submittedItems = [] } = useQuery({
    queryKey: ['approval-inbox', 'submitted'],
    queryFn: async () => (await api.get('/approvals/inbox?scope=submitted')).data.data,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action, comments }: any) => {
      const endpoint = action.toLowerCase();
      return (await api.post(`/approvals/${id}/${endpoint}`, { comments })).data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['approval-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      setSelectedInstance(null);
      setComments('');
      setErrorMessage(null);
      setSuccessMessage(data.message || 'Approval action completed successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Approval action failed.');
      setTimeout(() => setErrorMessage(null), 6000);
    },
  });

  const handleAction = (instance: any, type: 'APPROVE' | 'REJECT' | 'RETURN') => {
    setSelectedInstance(instance);
    setActionType(type);
    setComments('');
    setErrorMessage(null);
  };

  const submitAction = (e: React.FormEvent) => {
    e.preventDefault();
    actionMutation.mutate({
      id: selectedInstance.id,
      action: actionType,
      comments,
    });
  };

  const filteredInbox = useMemo(() => {
    return inbox.filter((inst: any) => {
      if (docTypeFilter !== 'ALL' && inst.documentType !== docTypeFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const docNum = inst.document?.prNumber || inst.document?.poNumber || inst.document?.transferNumber || inst.documentId || '';
      const initiator = inst.initiatedBy?.username || '';
      const dept = inst.document?.department?.name || inst.document?.sourceWarehouse?.name || '';
      const notes = inst.document?.justification || inst.document?.notes || '';
      return (
        docNum.toLowerCase().includes(q) ||
        initiator.toLowerCase().includes(q) ||
        dept.toLowerCase().includes(q) ||
        notes.toLowerCase().includes(q)
      );
    });
  }, [inbox, docTypeFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
            <Inbox className="w-4 h-4" />
            <span>Workflow Engine Inbox</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Authorizations & Approvals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enforcing multi-tier approval workflows, role thresholds, and separation of duties.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono border border-slate-200 dark:border-slate-700">
            Role: <span className="font-bold text-brand-600 dark:text-brand-400">{user?.roles?.join(', ') || 'USER'}</span>
          </span>
          {isAdmin && (
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
              Admin Override Active
            </span>
          )}
          {isFinance && (
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold">
              Finance Approver Active
            </span>
          )}
        </div>
      </div>

      {/* Success / Error Messages */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center space-x-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-xs font-bold">
        <button
          onClick={() => handleScopeChange('assigned')}
          className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
            activeScope === 'assigned'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-extrabold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Pending My Authorization</span>
          {assignedItems.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 font-mono">
              {assignedItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleScopeChange('submitted')}
          className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
            activeScope === 'submitted'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-extrabold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>My Submitted Requests</span>
          {submittedItems.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
              {submittedItems.length}
            </span>
          )}
        </button>

        {(isAdmin || isAuditor || isFinance) && (
          <button
            onClick={() => handleScopeChange('all')}
            className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
              activeScope === 'all'
                ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-extrabold'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>All Requests (Pipeline Oversight)</span>
          </button>
        )}

        <button
          onClick={() => handleScopeChange('history')}
          className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
            activeScope === 'history'
              ? 'border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400 font-extrabold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Completed & History</span>
        </button>
      </div>

      {/* Search & Document Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center glass-card p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search Document#, Requester, Dept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {(['ALL', 'PURCHASE_REQUISITION', 'STOCK_TRANSFER'] as const).map((dt) => (
            <button
              key={dt}
              type="button"
              onClick={() => setDocTypeFilter(dt)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                docTypeFilter === dt
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {dt === 'ALL' ? 'All Document Types' : dt.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Inbox List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-xs">Checking approval queue...</div>
        ) : filteredInbox.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {activeScope === 'assigned'
                ? 'Your Authorization Queue is Clear!'
                : activeScope === 'submitted'
                ? 'No Requests Submitted Yet'
                : 'No Approval Records Found'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {activeScope === 'assigned'
                ? 'There are no pending requests awaiting authorization from your assigned role. If you recently created and submitted a Purchase Requisition, check the "My Submitted Requests" tab.'
                : activeScope === 'submitted'
                ? 'You have not submitted any Purchase Requisitions or Transfers awaiting workflow approval.'
                : 'No historical approval workflows match this filter.'}
            </p>
            {activeScope === 'assigned' && submittedItems.length > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleScopeChange('submitted')}
                  className="px-4 py-2 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950 dark:hover:bg-brand-900 text-brand-600 dark:text-brand-400 text-xs font-semibold inline-flex items-center space-x-1.5 transition"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>View My {submittedItems.length} Submitted Request(s)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredInbox.map((inst: any) => {
            const isInitiator = inst.initiatedById === user?.id;
            const isRoleAuthorized =
              isAdmin ||
              (isFinance && inst.documentType === 'PURCHASE_REQUISITION') ||
              hasRole(inst.currentStep?.approverRole);
            const canApprove = (isAdmin || !isInitiator) && isRoleAuthorized && inst.status === 'PENDING';

            return (
              <div
                key={inst.id}
                className="glass-card p-6 rounded-2xl border border-brand-200 dark:border-brand-500/25 flex flex-col md:flex-row justify-between gap-6 hover:border-brand-400 dark:hover:border-brand-500/50 transition shadow-sm dark:shadow-xl"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                      {inst.documentType.replace('_', ' ')}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inst.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : inst.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : inst.status === 'RETURNED'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {inst.status}
                    </span>

                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Submitted {new Date(inst.createdAt).toLocaleString()}</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span>{inst.document?.prNumber || inst.document?.poNumber || inst.document?.transferNumber || inst.documentId}</span>
                      {inst.documentType === 'PURCHASE_REQUISITION' && (
                        <Link
                          to="/procurement"
                          className="text-xs text-brand-600 hover:text-brand-500 inline-flex items-center space-x-0.5 font-normal"
                        >
                          <span>View in Procurement</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {inst.document?.justification || inst.document?.notes || 'Standard workflow approval requested'}
                    </p>
                  </div>

                  {/* Summary Bar */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex flex-wrap gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-semibold">
                        Initiator
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold flex items-center space-x-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{inst.initiatedBy?.username}</span>
                        {isInitiator && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-semibold">
                            You
                          </span>
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-semibold">
                        Department / Facility
                      </span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {inst.document?.department?.name || inst.document?.sourceWarehouse?.name || 'Operations'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-semibold">
                        Current Approval Step
                      </span>
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        Step {inst.currentStep?.stepOrder}: {inst.currentStep?.stepName} ({inst.currentStep?.approverRole})
                      </span>
                    </div>

                    {inst.document?.totalEstimatedCost !== undefined && (
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-semibold">
                          Total Amount
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                          ${Number(inst.document.totalEstimatedCost).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Line Items Preview */}
                  {inst.document?.items && inst.document.items.length > 0 && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                      <span className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                        Requested Line Items:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {inst.document.items.map((i: any) => (
                          <span
                            key={i.id}
                            className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]"
                          >
                            {i.product?.name || 'Product'} × {i.quantity || i.requestedQty} units
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Separation of Duties Notice */}
                  {isInitiator && !isAdmin && inst.status === 'PENDING' && (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] flex items-center space-x-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>
                        <strong>Separation of Duties Notice:</strong> You submitted this request. To prevent self-authorization, an independent approver with role <strong>{inst.currentStep?.approverRole}</strong> or System Admin must review and sign off.
                      </span>
                    </div>
                  )}

                  {/* Audit Trail of Prior Actions */}
                  {inst.actions && inst.actions.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                        Approval Action Log:
                      </span>
                      <div className="space-y-1">
                        {inst.actions.map((act: any) => (
                          <div key={act.id} className="flex items-center space-x-2 text-slate-600 dark:text-slate-300">
                            <span className="font-semibold">{act.actor?.username}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                act.action === 'APPROVE'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : act.action === 'REJECT'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {act.action}
                            </span>
                            <span>{new Date(act.actionDate).toLocaleDateString()}</span>
                            {act.comments && <span className="italic text-slate-500">"{act.comments}"</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {inst.status === 'PENDING' && (
                  <div className="flex md:flex-col justify-end gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(inst, 'APPROVE')}
                      disabled={!canApprove}
                      title={!canApprove ? 'Initiator cannot self-approve submission' : 'Approve current step'}
                      className={`px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md transition ${
                        canApprove
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20'
                          : 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isAdmin && isInitiator
                          ? 'Admin Override Approve'
                          : isFinance && inst.documentType === 'PURCHASE_REQUISITION'
                          ? 'Authorize Budget'
                          : 'Approve Step'}
                      </span>
                    </button>
                    <button
                      onClick={() => handleAction(inst, 'RETURN')}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-700 dark:text-amber-300 font-semibold text-xs flex items-center justify-center space-x-1.5 border border-slate-200 dark:border-slate-700 transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Return for Edit</span>
                    </button>
                    <button
                      onClick={() => handleAction(inst, 'REJECT')}
                      className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-slate-900 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center justify-center space-x-1.5 border border-rose-200 dark:border-slate-800 dark:hover:border-rose-800 transition"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Action Dialog Modal */}
      {selectedInstance && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl text-xs">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Confirm Action: <span className="uppercase text-brand-600 dark:text-brand-400">{actionType}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Your approval action and comment will be permanently recorded in the audit trail.
            </p>
            <form onSubmit={submitAction} className="space-y-4">
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1">Approver Review Comments</label>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Reasoning, budget line verification, or revision instructions..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedInstance(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionMutation.isPending}
                  className={`px-4 py-2 rounded-xl text-white font-bold transition shadow-md disabled:opacity-50 ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                      : actionType === 'RETURN'
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                  }`}
                >
                  {actionMutation.isPending ? 'Processing...' : `Confirm ${actionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

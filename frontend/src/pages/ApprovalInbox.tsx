import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Inbox, CheckCircle2, XCircle, RotateCcw, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ApprovalInbox: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedInstance, setSelectedInstance] = useState<any | null>(null);
  const [comments, setComments] = useState('');
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'RETURN'>('APPROVE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: inbox = [], isLoading } = useQuery({
    queryKey: ['approval-inbox'],
    queryFn: async () => (await api.get('/approvals/inbox')).data.data,
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
            Pending Authorizations & Approvals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enforcing separation of duties, role thresholds, and sequential workflow step sign-offs.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono border border-slate-200 dark:border-slate-700">
          {inbox.length} pending items
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

      {/* Inbox List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-16 text-slate-400 text-xs">Checking approval queue...</div>
        ) : inbox.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Your Approval Queue is Empty!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              There are no pending purchase requisitions or transfers awaiting review for your assigned role permissions.
            </p>
          </div>
        ) : (
          inbox.map((inst: any) => (
            <div
              key={inst.id}
              className="glass-card p-6 rounded-2xl border border-brand-200 dark:border-brand-500/25 flex flex-col md:flex-row justify-between gap-6 hover:border-brand-400 dark:hover:border-brand-500/50 transition shadow-sm dark:shadow-xl"
            >
              <div className="space-y-3 flex-1">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                    {inst.documentType.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Submitted {new Date(inst.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {inst.document?.prNumber || inst.document?.poNumber || inst.documentId}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {inst.document?.justification || 'Standard workflow approval requested'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex flex-wrap gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-semibold">
                      Initiator
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">
                      {inst.initiatedBy?.username}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-semibold">
                      Department
                    </span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {inst.document?.department?.name || 'Operations'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-semibold">
                      Current Step
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      {inst.currentStep?.stepName} ({inst.currentStep?.approverRole})
                    </span>
                  </div>
                  {inst.document?.totalEstimatedCost && (
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-semibold">
                        Total Amount
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                        ${inst.document.totalEstimatedCost.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex md:flex-col justify-end gap-2 shrink-0">
                <button
                  onClick={() => handleAction(inst, 'APPROVE')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Step</span>
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
            </div>
          ))
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

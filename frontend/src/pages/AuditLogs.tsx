import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { History, User, Calendar, FileText } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [activeJsonLog, setActiveJsonLog] = useState<any | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', selectedEntity, selectedAction],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedEntity) params.append('entity', selectedEntity);
      if (selectedAction) params.append('action', selectedAction);
      params.append('limit', '100');
      const res = await api.get(`/reports/audit-logs?${params.toString()}`);
      return res.data.data;
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
            <History className="w-4 h-4" />
            <span>Compliance & Governance</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Immutable Audit Trail
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tracking actor, action, timestamp, entity reference, and full before/after JSON diff snapshots.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Entities</option>
            <option value="StockMovement">StockMovement</option>
            <option value="StockTransfer">StockTransfer</option>
            <option value="PurchaseOrder">PurchaseOrder</option>
            <option value="PurchaseRequisition">PurchaseRequisition</option>
            <option value="GoodsReceipt">GoodsReceipt</option>
            <option value="StockAdjustment">StockAdjustment</option>
            <option value="WarehouseBin">WarehouseBin</option>
            <option value="User">User</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Action</th>
                <th className="p-4">Entity & Reference</th>
                <th className="p-4 text-right">Payload Snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 font-sans">
                    Reading audit records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 font-sans">
                    No audit logs matching query.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-4 text-slate-700 dark:text-slate-300">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-4 font-sans">
                      <div className="flex items-center space-x-1.5 font-semibold text-slate-900 dark:text-white">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.actor?.username || 'SYSTEM'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action.includes('POST') || log.action === 'APPROVE'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : log.action.includes('DISPATCH') || log.action === 'RECEIVE'
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
                            : log.action === 'REJECT'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 font-sans">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{log.entity}</div>
                      <div className="text-[10px] text-brand-600 dark:text-brand-400 font-mono">
                        {log.reference || log.entityId}
                      </div>
                    </td>
                    <td className="p-4 text-right font-sans">
                      {log.beforeValue || log.afterValue ? (
                        <button
                          onClick={() => setActiveJsonLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px] border border-slate-200 dark:border-slate-700 transition"
                        >
                          View Diff
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Diff Inspector Modal */}
      {activeJsonLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl text-xs">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Audit Payload: {activeJsonLog.entity} ({activeJsonLog.action})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-mono">
              Reference: {activeJsonLog.reference}
            </p>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {activeJsonLog.beforeValue && (
                <div>
                  <span className="text-rose-600 dark:text-rose-400 font-bold block mb-1 font-mono">
                    Before State:
                  </span>
                  <pre className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto text-[11px] text-slate-800 dark:text-slate-300 font-mono">
                    {JSON.stringify(
                      typeof activeJsonLog.beforeValue === 'string'
                        ? JSON.parse(activeJsonLog.beforeValue)
                        : activeJsonLog.beforeValue,
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}

              {activeJsonLog.afterValue && (
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold block mb-1 font-mono">
                    After State:
                  </span>
                  <pre className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto text-[11px] text-emerald-800 dark:text-emerald-300 font-mono">
                    {JSON.stringify(
                      typeof activeJsonLog.afterValue === 'string'
                        ? JSON.parse(activeJsonLog.afterValue)
                        : activeJsonLog.afterValue,
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
              <button
                onClick={() => setActiveJsonLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

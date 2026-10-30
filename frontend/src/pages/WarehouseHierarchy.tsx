import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  Network,
  Building,
  MapPin,
  Warehouse,
  Boxes,
  Grid,
  Archive,
  ChevronRight,
  ChevronDown,
  Plus,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const WarehouseHierarchy: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole, hasPermission } = useAuth();
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [selectedBin, setSelectedBin] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'ZONE' | 'RACK' | 'BIN'>('BIN');
  const [formData, setFormData] = useState({
    warehouseId: '',
    zoneId: '',
    rackId: '',
    code: '',
    name: '',
    binType: 'STORAGE',
  });

  const canManageWarehouse =
    hasRole('ADMIN', 'WAREHOUSE_MANAGER') || hasPermission('warehouse:write');

  const { data: treeData = [], isLoading } = useQuery({
    queryKey: ['location-tree'],
    queryFn: async () => {
      const res = await api.get('/warehouses/tree');
      return res.data.data;
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const createBinMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (modalType === 'ZONE') return (await api.post('/warehouses/zones', payload)).data;
      if (modalType === 'RACK') return (await api.post('/warehouses/racks', payload)).data;
      return (await api.post('/warehouses/bins', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-tree'] });
      setShowAddModal(false);
      setFormData({ warehouseId: '', zoneId: '', rackId: '', code: '', name: '', binType: 'STORAGE' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBinMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
            <Network className="w-4 h-4" />
            <span>Multi-Tier Storage Topology</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            Warehouse & Location Hierarchy
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Company → Region → City → Site → Warehouse → Zone → Rack → Bin
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {canManageWarehouse ? (
            <button
              onClick={() => {
                setModalType('BIN');
                setShowAddModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-brand-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Bin</span>
            </button>
          ) : (
            <div
              title="Requires Warehouse Manager or Admin role"
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 text-xs flex items-center space-x-1.5 opacity-70 cursor-not-allowed"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Topology Locked</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hierarchy Tree Viewer */}
        <div className="glass-card p-6 rounded-2xl lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span>Enterprise Location Hierarchy Tree</span>
            <span className="text-[11px] text-slate-400">Expandable Nodes</span>
          </h2>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading location tree...</div>
          ) : (
            <div className="space-y-2">
              {treeData.map((company: any) => (
                <div
                  key={company.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/70 dark:bg-slate-900/50"
                >
                  {/* Company Level */}
                  <div
                    onClick={() => toggleExpand(company.id)}
                    className="flex items-center justify-between cursor-pointer text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-300 transition"
                  >
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                      <span>
                        {company.name} ({company.code})
                      </span>
                    </div>
                    {expandedNodes[company.id] ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  {/* Regions & Cities */}
                  {expandedNodes[company.id] && (
                    <div className="mt-3 pl-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-3">
                      {company.regions?.map((reg: any) => (
                        <div key={reg.id} className="space-y-2">
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                            <span>{reg.name}</span>
                          </div>

                          {/* Cities */}
                          <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-3">
                            {reg.cities?.map((city: any) => (
                              <div key={city.id} className="space-y-2">
                                <div className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center space-x-1.5">
                                  <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400"></span>
                                  <span>
                                    {city.name}, {city.state}
                                  </span>
                                </div>

                                {/* Sites */}
                                <div className="pl-4 border-l border-slate-200 dark:border-slate-800 space-y-3">
                                  {city.sites?.map((site: any) => (
                                    <div key={site.id} className="space-y-2">
                                      <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold bg-slate-100 dark:bg-slate-800/40 px-2 py-1 rounded">
                                        Site: {site.name} ({site.code})
                                      </div>

                                      {/* Warehouses */}
                                      <div className="pl-3 space-y-3">
                                        {site.warehouses?.map((wh: any) => (
                                          <div
                                            key={wh.id}
                                            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2"
                                          >
                                            <div
                                              onClick={() => toggleExpand(wh.id)}
                                              className="flex items-center justify-between cursor-pointer"
                                            >
                                              <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 dark:text-white">
                                                <Warehouse className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                <span>{wh.name}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-mono">
                                                  {wh.code}
                                                </span>
                                              </div>
                                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                            </div>

                                            {/* Zones */}
                                            {expandedNodes[wh.id] !== false && (
                                              <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-2 pt-2">
                                                {wh.zones?.map((zone: any) => (
                                                  <div key={zone.id} className="space-y-1.5">
                                                    <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                                                      <Boxes className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                                                      <span>
                                                        {zone.name} ({zone.code})
                                                      </span>
                                                    </div>

                                                    {/* Racks */}
                                                    <div className="pl-3 space-y-2">
                                                      {zone.racks?.map((rack: any) => (
                                                        <div key={rack.id} className="space-y-1">
                                                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                                                            <Grid className="w-2.5 h-2.5 text-sky-500 dark:text-sky-400" />
                                                            <span>
                                                              {rack.name} ({rack.code}) - {rack.levels} levels
                                                            </span>
                                                          </div>

                                                          {/* Bins Grid */}
                                                          <div className="flex flex-wrap gap-1.5 pt-1">
                                                            {rack.bins?.map((bin: any) => (
                                                              <button
                                                                key={bin.id}
                                                                onClick={() => setSelectedBin(bin)}
                                                                className={`px-2 py-1 rounded text-[10px] font-mono transition flex items-center space-x-1 ${
                                                                  selectedBin?.id === bin.id
                                                                    ? 'bg-brand-600 text-white font-bold ring-2 ring-brand-400'
                                                                    : bin.stockBalances?.some((b: any) => b.onHandQty > 0)
                                                                    ? 'bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50 hover:bg-emerald-100 dark:hover:bg-slate-700'
                                                                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                                                                }`}
                                                              >
                                                                <Archive className="w-2.5 h-2.5" />
                                                                <span>{bin.code}</span>
                                                              </button>
                                                            ))}
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                ))}

                                                {/* Direct Warehouse Bins */}
                                                {wh.bins && wh.bins.length > 0 && (
                                                  <div className="pt-2">
                                                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                                      Direct Bins:
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                                      {wh.bins.map((bin: any) => (
                                                        <button
                                                          key={bin.id}
                                                          onClick={() => setSelectedBin(bin)}
                                                          className="px-2 py-1 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                                                        >
                                                          {bin.code}
                                                        </button>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Bin Inspector & Stock Content */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-2">
              <Archive className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Bin Details & Physical Stock</span>
            </h2>

            {selectedBin ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-lg font-bold text-slate-900 dark:text-white font-mono">{selectedBin.code}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedBin.name}</div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Type</span>
                      <span className="font-semibold text-brand-600 dark:text-brand-400">{selectedBin.binType}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Status</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {selectedBin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Current Stored Inventory
                  </h3>
                  {selectedBin.stockBalances && selectedBin.stockBalances.length > 0 ? (
                    <div className="space-y-2">
                      {selectedBin.stockBalances.map((b: any) => (
                        <div
                          key={b.id}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center"
                        >
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-white">{b.product.name}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              {b.product.sku}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              {b.onHandQty}
                            </span>
                            <span className="text-[10px] text-slate-400 block">on-hand</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      Bin is currently empty.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-2">
                <Archive className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                <p>Click any bin code in the tree to inspect capacity and stock balances.</p>
              </div>
            )}
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Deleting locations with historical transactions is permanently blocked. Use deactivation to preserve audit ledger.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

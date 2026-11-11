import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import {
  Network,
  Building,
  Building2,
  Globe,
  MapPin,
  Warehouse,
  Boxes,
  Grid,
  Archive,
  ChevronRight,
  ChevronDown,
  Plus,
  ShieldCheck,
  X,
  XCircle,
  Pencil,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type HierarchyNodeType =
  | 'COMPANY'
  | 'REGION'
  | 'CITY'
  | 'SITE'
  | 'WAREHOUSE'
  | 'ZONE'
  | 'RACK'
  | 'BIN';

interface SelectedNodeInfo {
  type: HierarchyNodeType;
  data: any;
  parentName?: string;
}

export const WarehouseHierarchy: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasRole, hasPermission } = useAuth();
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Inspector panel state
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addNodeType, setAddNodeType] = useState<HierarchyNodeType>('BIN');
  const [addErrorMessage, setAddErrorMessage] = useState<string | null>(null);
  const [addFormData, setAddFormData] = useState({
    companyId: '',
    regionId: '',
    cityId: '',
    siteId: '',
    warehouseId: '',
    zoneId: '',
    rackId: '',
    code: '',
    name: '',
    currency: 'USD',
    address: '',
    state: '',
    country: 'USA',
    contactNumber: '',
    warehouseType: 'STANDARD',
    zoneType: 'STORAGE',
    binType: 'STORAGE',
    levels: 4,
    maxWeight: '',
    maxVolume: '',
  });

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editModalNode, setEditModalNode] = useState<{ type: HierarchyNodeType; data: any } | null>(null);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    code: '',
    name: '',
    currency: 'USD',
    address: '',
    state: '',
    country: 'USA',
    contactNumber: '',
    warehouseType: 'STANDARD',
    zoneType: 'STORAGE',
    binType: 'STORAGE',
    rackId: '',
    levels: 4,
    maxWeight: '',
    maxVolume: '',
    isActive: true,
  });

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteModalNode, setDeleteModalNode] = useState<{ type: HierarchyNodeType; data: any } | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  const isAdmin = hasRole('ADMIN');
  const isInventoryManager = hasRole('ADMIN', 'INVENTORY_MANAGER');
  const canManageWarehouse =
    hasRole('ADMIN', 'WAREHOUSE_MANAGER') ||
    hasPermission('warehouse:write') ||
    hasPermission('warehouse:manage');

  // Load Hierarchy Tree
  const { data: treeData = [], isLoading } = useQuery({
    queryKey: ['location-tree'],
    queryFn: async () => {
      const res = await api.get('/warehouses/tree');
      return res.data.data;
    },
  });

  // Helper to extract all node IDs under a specific company
  const getCompanyNodeKeys = (company: any): string[] => {
    if (!company) return [];
    const keys: string[] = [company.id];
    company.regions?.forEach((r: any) => {
      keys.push(r.id);
      r.cities?.forEach((c: any) => {
        keys.push(c.id);
        c.sites?.forEach((s: any) => {
          keys.push(s.id);
          s.warehouses?.forEach((w: any) => {
            keys.push(w.id);
          });
        });
      });
    });
    return keys;
  };

  // On initial load, all companies remain collapsed by default until clicked
  useEffect(() => {
    if (treeData && treeData.length > 0 && !selectedNode) {
      setSelectedNode({ type: 'COMPANY', data: treeData[0] });
    }
  }, [treeData]);

  // Toggle expand / collapse for a specific company's entire subtree
  const toggleCompanyFullExpand = (company: any) => {
    const companyKeys = getCompanyNodeKeys(company);
    const isFullyExpanded = companyKeys.length > 0 && companyKeys.every((key) => expandedNodes[key]);

    setExpandedNodes((prev) => {
      const next = { ...prev };
      if (isFullyExpanded) {
        companyKeys.forEach((key) => {
          delete next[key];
        });
      } else {
        companyKeys.forEach((key) => {
          next[key] = true;
        });
      }
      return next;
    });
  };

  // Flattened Lookups for Modal Dropdowns & Aggregations
  const allCompanies = useMemo(() => {
    if (!Array.isArray(treeData)) return [];
    return treeData.map((c: any) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      currency: c.currency || 'USD',
      regions: c.regions || [],
    }));
  }, [treeData]);

  const allRegions = useMemo(() => {
    return allCompanies.flatMap((c: any) =>
      (c.regions || []).map((r: any) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        companyId: c.id,
        companyName: c.name,
        cities: r.cities || [],
      }))
    );
  }, [allCompanies]);

  const allCities = useMemo(() => {
    return allRegions.flatMap((r: any) =>
      (r.cities || []).map((ct: any) => ({
        id: ct.id,
        code: ct.code,
        name: ct.name,
        state: ct.state,
        country: ct.country,
        regionId: r.id,
        regionName: r.name,
        companyId: r.companyId,
        sites: ct.sites || [],
      }))
    );
  }, [allRegions]);

  const allSites = useMemo(() => {
    return allCities.flatMap((ct: any) =>
      (ct.sites || []).map((s: any) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        address: s.address,
        cityId: ct.id,
        cityName: ct.name,
        warehouses: s.warehouses || [],
      }))
    );
  }, [allCities]);

  const allWarehouses = useMemo(() => {
    return allSites.flatMap((s: any) =>
      (s.warehouses || []).map((w: any) => ({
        id: w.id,
        code: w.code,
        name: w.name,
        warehouseType: w.warehouseType,
        siteId: s.id,
        siteName: s.name,
        zones: w.zones || [],
        bins: w.bins || [],
      }))
    );
  }, [allSites]);

  const allBins = useMemo(() => {
    const list: any[] = [];
    allWarehouses.forEach((w: any) => {
      (w.zones || []).forEach((z: any) => {
        (z.racks || []).forEach((r: any) => {
          (r.bins || []).forEach((b: any) =>
            list.push({
              ...b,
              warehouseId: w.id,
              warehouseName: w.name,
              rackName: r.name,
              zoneName: z.name,
            })
          );
        });
      });
      (w.bins || []).forEach((b: any) =>
        list.push({
          ...b,
          warehouseId: w.id,
          warehouseName: w.name,
          rackName: 'Floor',
          zoneName: 'Floor',
        })
      );
    });
    return list;
  }, [allWarehouses]);

  // Dynamic live node data so that when treeData updates in background, selectedNode reflects it immediately
  const activeNodeData = useMemo(() => {
    if (!selectedNode) return null;
    if (selectedNode.type === 'BIN') {
      const match = allBins.find((b: any) => b.id === selectedNode.data.id);
      if (match) return match;
    }
    return selectedNode.data;
  }, [selectedNode, allBins]);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to open Add Modal pre-filled with context
  const openAddModal = (
    type: HierarchyNodeType,
    defaults?: Partial<{
      companyId: string;
      regionId: string;
      cityId: string;
      siteId: string;
      warehouseId: string;
      zoneId: string;
      rackId: string;
    }>
  ) => {
    setAddNodeType(type);
    setAddErrorMessage(null);

    const defaultComp = defaults?.companyId || (allCompanies[0]?.id ?? '');
    const defaultReg = defaults?.regionId || (allRegions.find((r) => r.companyId === defaultComp)?.id ?? allRegions[0]?.id ?? '');
    const defaultCity = defaults?.cityId || (allCities.find((c) => c.regionId === defaultReg)?.id ?? allCities[0]?.id ?? '');
    const defaultSite = defaults?.siteId || (allSites.find((s) => s.cityId === defaultCity)?.id ?? allSites[0]?.id ?? '');
    const defaultWh = defaults?.warehouseId || (allWarehouses.find((w) => w.siteId === defaultSite)?.id ?? allWarehouses[0]?.id ?? '');

    setAddFormData({
      companyId: defaultComp,
      regionId: defaultReg,
      cityId: defaultCity,
      siteId: defaultSite,
      warehouseId: defaultWh,
      zoneId: defaults?.zoneId || '',
      rackId: defaults?.rackId || '',
      code: '',
      name: '',
      currency: 'USD',
      address: '',
      state: '',
      country: 'USA',
      contactNumber: '',
      warehouseType: 'STANDARD',
      zoneType: 'STORAGE',
      binType: 'STORAGE',
      levels: 4,
      maxWeight: '',
      maxVolume: '',
    });
    setShowAddModal(true);
  };

  // Helper to open Edit Modal pre-filled
  const openEditModal = (type: HierarchyNodeType, data: any) => {
    setEditModalNode({ type, data });
    setEditErrorMessage(null);
    setEditFormData({
      code: data.code || '',
      name: data.name || '',
      currency: data.currency || 'USD',
      address: data.address || '',
      state: data.state || '',
      country: data.country || 'USA',
      contactNumber: data.contactNumber || '',
      warehouseType: data.warehouseType || 'STANDARD',
      zoneType: data.zoneType || 'STORAGE',
      binType: data.binType || 'STORAGE',
      rackId: data.rackId || '',
      levels: data.levels || 4,
      maxWeight: data.maxWeight !== undefined && data.maxWeight !== null ? String(data.maxWeight) : '',
      maxVolume: data.maxVolume !== undefined && data.maxVolume !== null ? String(data.maxVolume) : '',
      isActive: data.isActive ?? true,
    });
    setShowEditModal(true);
  };

  // Helper to open Delete Modal
  const openDeleteModal = (type: HierarchyNodeType, data: any) => {
    setDeleteModalNode({ type, data });
    setDeleteErrorMessage(null);
    setShowDeleteModal(true);
  };

  // ==========================================
  // MUTATIONS
  // ==========================================

  const createMutation = useMutation({
    mutationFn: async () => {
      let endpoint = '';
      let payload: any = {};

      switch (addNodeType) {
        case 'COMPANY':
          endpoint = '/warehouses/companies';
          payload = {
            code: addFormData.code.trim().toUpperCase(),
            name: addFormData.name.trim(),
            currency: addFormData.currency,
            address: addFormData.address.trim() || null,
          };
          break;
        case 'REGION':
          endpoint = '/warehouses/regions';
          payload = {
            companyId: addFormData.companyId,
            code: addFormData.code.trim().toUpperCase(),
            name: addFormData.name.trim(),
          };
          break;
        case 'CITY':
          endpoint = '/warehouses/cities';
          payload = {
            regionId: addFormData.regionId,
            code: addFormData.code.trim().toUpperCase(),
            name: addFormData.name.trim(),
            state: addFormData.state.trim() || null,
            country: addFormData.country.trim() || 'USA',
          };
          break;
        case 'SITE':
          endpoint = '/warehouses/sites';
          payload = {
            cityId: addFormData.cityId,
            code: addFormData.code.trim().toUpperCase(),
            name: addFormData.name.trim(),
            address: addFormData.address.trim() || null,
            contactNumber: addFormData.contactNumber.trim() || null,
          };
          break;
        case 'WAREHOUSE':
          endpoint = '/warehouses';
          payload = {
            siteId: addFormData.siteId,
            code: addFormData.code.trim().toUpperCase(),
            name: addFormData.name.trim(),
            warehouseType: addFormData.warehouseType,
            address: addFormData.address.trim() || null,
          };
          break;
        case 'ZONE':
          endpoint = '/warehouses/zones';
          payload = {
            warehouseId: addFormData.warehouseId,
            code: addFormData.code.trim().toUpperCase(),
            name: addFormData.name.trim(),
            zoneType: addFormData.zoneType,
          };
          break;
        case 'RACK':
          endpoint = '/warehouses/racks';
          payload = {
            zoneId: addFormData.zoneId,
            code: addFormData.code.trim().toUpperCase(),
            name: addFormData.name.trim(),
            levels: Number(addFormData.levels) || 4,
          };
          break;
        case 'BIN':
          endpoint = '/warehouses/bins';
          payload = {
            warehouseId: addFormData.warehouseId,
            rackId: addFormData.rackId || null,
            code: addFormData.code.trim().toUpperCase(),
            name: addFormData.name.trim(),
            binType: addFormData.binType,
            maxWeight: addFormData.maxWeight ? parseFloat(addFormData.maxWeight) : undefined,
            maxVolume: addFormData.maxVolume ? parseFloat(addFormData.maxVolume) : undefined,
          };
          break;
      }

      const res = await api.post(endpoint, payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['location-tree'] });
      setShowAddModal(false);
      setAddErrorMessage(null);
      if (data?.data) {
        setSelectedNode({ type: addNodeType, data: data.data });
      }
    },
    onError: (err: any) => {
      setAddErrorMessage(err.response?.data?.message || 'Failed to create entity. Please check required fields.');
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editModalNode) return;
      const { type, data } = editModalNode;
      let endpoint = '';
      let payload: any = {};

      switch (type) {
        case 'COMPANY':
          endpoint = `/warehouses/companies/${data.id}`;
          payload = {
            code: editFormData.code.trim().toUpperCase(),
            name: editFormData.name.trim(),
            currency: editFormData.currency,
            address: editFormData.address.trim() || null,
            isActive: editFormData.isActive,
          };
          break;
        case 'REGION':
          endpoint = `/warehouses/regions/${data.id}`;
          payload = {
            code: editFormData.code.trim().toUpperCase(),
            name: editFormData.name.trim(),
          };
          break;
        case 'CITY':
          endpoint = `/warehouses/cities/${data.id}`;
          payload = {
            code: editFormData.code.trim().toUpperCase(),
            name: editFormData.name.trim(),
            state: editFormData.state.trim() || null,
            country: editFormData.country.trim() || 'USA',
          };
          break;
        case 'SITE':
          endpoint = `/warehouses/sites/${data.id}`;
          payload = {
            code: editFormData.code.trim().toUpperCase(),
            name: editFormData.name.trim(),
            address: editFormData.address.trim() || null,
            contactNumber: editFormData.contactNumber.trim() || null,
            isActive: editFormData.isActive,
          };
          break;
        case 'WAREHOUSE':
          endpoint = `/warehouses/${data.id}`;
          payload = {
            code: editFormData.code.trim().toUpperCase(),
            name: editFormData.name.trim(),
            warehouseType: editFormData.warehouseType,
            address: editFormData.address.trim() || null,
            isActive: editFormData.isActive,
          };
          break;
        case 'ZONE':
          endpoint = `/warehouses/zones/${data.id}`;
          payload = {
            code: editFormData.code.trim().toUpperCase(),
            name: editFormData.name.trim(),
            zoneType: editFormData.zoneType,
            isActive: editFormData.isActive,
          };
          break;
        case 'RACK':
          endpoint = `/warehouses/racks/${data.id}`;
          payload = {
            code: editFormData.code.trim().toUpperCase(),
            name: editFormData.name.trim(),
            levels: Number(editFormData.levels) || 4,
            isActive: editFormData.isActive,
          };
          break;
        case 'BIN':
          endpoint = `/warehouses/bins/${data.id}`;
          payload = {
            code: editFormData.code.trim().toUpperCase(),
            name: editFormData.name.trim(),
            binType: editFormData.binType,
            rackId: editFormData.rackId || null,
            maxWeight: editFormData.maxWeight ? parseFloat(editFormData.maxWeight) : null,
            maxVolume: editFormData.maxVolume ? parseFloat(editFormData.maxVolume) : null,
            isActive: editFormData.isActive,
          };
          break;
      }

      const res = await api.put(endpoint, payload);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['location-tree'] });
      setShowEditModal(false);
      setEditErrorMessage(null);
      if (editModalNode && res?.data) {
        setSelectedNode({ type: editModalNode.type, data: res.data });
      }
    },
    onError: (err: any) => {
      setEditErrorMessage(err.response?.data?.message || 'Failed to update entity.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteModalNode) return;
      const { type, data } = deleteModalNode;
      let endpoint = '';

      switch (type) {
        case 'COMPANY':
          endpoint = `/warehouses/companies/${data.id}`;
          break;
        case 'REGION':
          endpoint = `/warehouses/regions/${data.id}`;
          break;
        case 'CITY':
          endpoint = `/warehouses/cities/${data.id}`;
          break;
        case 'SITE':
          endpoint = `/warehouses/sites/${data.id}`;
          break;
        case 'WAREHOUSE':
          endpoint = `/warehouses/${data.id}`;
          break;
        case 'ZONE':
          endpoint = `/warehouses/zones/${data.id}`;
          break;
        case 'RACK':
          endpoint = `/warehouses/racks/${data.id}`;
          break;
        case 'BIN':
          endpoint = `/warehouses/bins/${data.id}`;
          break;
      }

      const res = await api.delete(endpoint);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-tree'] });
      setShowDeleteModal(false);
      setDeleteErrorMessage(null);
      if (deleteModalNode && selectedNode?.data?.id === deleteModalNode.data.id) {
        setSelectedNode(null);
      }
    },
    onError: (err: any) => {
      setDeleteErrorMessage(
        err.response?.data?.message || 'Failed to delete entity. Ensure all child dependencies or active inventory are cleared.'
      );
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ type, id, currentActive }: { type: HierarchyNodeType; id: string; currentActive: boolean }) => {
      if (type === 'COMPANY') {
        const res = await api.put(`/warehouses/companies/${id}/toggle-status`);
        return res.data;
      } else if (type === 'BIN') {
        const res = await api.put(`/warehouses/bins/${id}/toggle-status`);
        return res.data;
      } else if (type === 'SITE') {
        const res = await api.put(`/warehouses/sites/${id}`, { isActive: !currentActive });
        return res.data;
      } else if (type === 'WAREHOUSE') {
        const res = await api.put(`/warehouses/${id}`, { isActive: !currentActive });
        return res.data;
      } else if (type === 'ZONE') {
        const res = await api.put(`/warehouses/zones/${id}`, { isActive: !currentActive });
        return res.data;
      } else if (type === 'RACK') {
        const res = await api.put(`/warehouses/racks/${id}`, { isActive: !currentActive });
        return res.data;
      }
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['location-tree'] });
      if (selectedNode && selectedNode.data.id === vars.id && res?.data) {
        setSelectedNode({ ...selectedNode, data: res.data });
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Status toggle failed.');
    },
  });

  // Calculate current warehouse zones & racks for Bin / Rack modals
  const currentWhZones = useMemo(() => {
    if (!addFormData.warehouseId) return [];
    const wh = allWarehouses.find((w) => w.id === addFormData.warehouseId);
    return wh?.zones || [];
  }, [allWarehouses, addFormData.warehouseId]);

  const currentWhRacks = useMemo(() => {
    if (!addFormData.warehouseId) return [];
    const wh = allWarehouses.find((w) => w.id === addFormData.warehouseId);
    if (!wh) return [];
    if (addFormData.zoneId) {
      const z = wh.zones.find((zone: any) => zone.id === addFormData.zoneId);
      return z?.racks || [];
    }
    return wh.zones.flatMap((z: any) => z.racks || []);
  }, [allWarehouses, addFormData.warehouseId, addFormData.zoneId]);

  return (
    <div className="space-y-6">
      {/* Top Header & Global Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
            <Network className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            <span>Warehouse & Location Hierarchy</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            End-to-End Enterprise Topology: <span className="font-semibold text-brand-600 dark:text-brand-400">Company → Region → City → Site → Warehouse → Zone → Rack → Bin</span>
          </p>
        </div>

        {/* Global Add Action Buttons */}
        <div className="flex items-center space-x-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => openAddModal('COMPANY')}
              className="group relative inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 border border-blue-400/20"
            >
              <div className="p-1 rounded-lg bg-white/15 backdrop-blur-xs transition-transform group-hover:scale-110">
                <Building className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="tracking-wide">Add Company</span>
              <Plus className="w-3.5 h-3.5 text-blue-200 group-hover:text-white transition-colors" />
            </button>
          )}

          {canManageWarehouse && (
            <button
              type="button"
              onClick={() => openAddModal('BIN')}
              className="group relative inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-600 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 border border-blue-400/20"
            >
              <div className="p-1 rounded-lg bg-white/15 backdrop-blur-xs transition-transform group-hover:scale-110">
                <Plus className="w-4 h-4 text-brand-600 dark:text-brand-400 text-white" />
              </div>

              <span>Add Node</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['location-tree'] })}
            title="Refresh location tree"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Full 8-Tier Hierarchy Tree */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <span>Enterprise Topology Tree</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800 font-normal">
                {allCompanies.length} Companies · {allWarehouses.length} Facilities
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Per-Company Expand / Collapse
            </span>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading complete enterprise topology...</div>
          ) : treeData.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 space-y-3">
              <Building className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
              <p>No companies or locations registered yet.</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => openAddModal('COMPANY')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
                >
                  <Building className="w-4 h-4" />
                  <span>Create First Company</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* LEVEL 1: COMPANY */}
              {treeData.map((company: any) => {
                const isSelected = selectedNode?.type === 'COMPANY' && selectedNode.data.id === company.id;
                const isExpanded = !!expandedNodes[company.id];
                const companyKeys = getCompanyNodeKeys(company);
                const isCompanyFullyExpanded = companyKeys.length > 0 && companyKeys.every((key) => expandedNodes[key]);

                return (
                  <div
                    key={company.id}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/70 dark:bg-slate-900/50"
                  >
                    <div
                      className={`flex items-center justify-between text-sm font-bold text-slate-800 dark:text-slate-200 transition p-2 rounded-xl ${isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60'
                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                        }`}
                    >
                      <div
                        onClick={() => {
                          setSelectedNode({ type: 'COMPANY', data: company });
                          toggleExpand(company.id);
                        }}
                        className="flex items-center space-x-2 cursor-pointer flex-1"
                      >
                        <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="hover:text-indigo-600 dark:hover:text-indigo-300 transition">
                          {company.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-mono">
                          {company.code}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono">
                          {company.currency || 'USD'}
                        </span>
                        {!company.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5 ml-2">
                        {/* Per-Company Expand / Collapse Toggle Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCompanyFullExpand(company);
                          }}
                          title={isCompanyFullyExpanded ? 'Collapse entire company tree' : 'Expand entire company tree'}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition flex items-center space-x-1 border ${isCompanyFullyExpanded
                            ? 'bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                        >
                          {isCompanyFullyExpanded ? (
                            <>
                              <ChevronDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                              <span>Collapse All</span>
                            </>
                          ) : (
                            <>
                              <ChevronRight className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                              <span>Expand All</span>
                            </>
                          )}
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAddModal('REGION', { companyId: company.id });
                              }}
                              title="Add Region under this Company"
                              className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold transition flex items-center space-x-0.5 border border-indigo-200 dark:border-indigo-800"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Region</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal('COMPANY', company);
                              }}
                              title="Edit Company Details"
                              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-indigo-600 dark:text-slate-400 transition"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteModal('COMPANY', company);
                              }}
                              title="Delete Company"
                              className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:text-slate-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleExpand(company.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* LEVEL 2: REGION */}
                    {isExpanded && (
                      <div className="mt-3 pl-4 border-l-2 border-indigo-200 dark:border-indigo-900 space-y-3">
                        {company.regions?.length === 0 ? (
                          <div className="text-[11px] text-slate-400 py-1 flex items-center justify-between">
                            <span>No regions configured for this company.</span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => openAddModal('REGION', { companyId: company.id })}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                              >
                                + Add First Region
                              </button>
                            )}
                          </div>
                        ) : (
                          company.regions?.map((reg: any) => {
                            const isRegSelected = selectedNode?.type === 'REGION' && selectedNode.data.id === reg.id;
                            const isRegExpanded = !!expandedNodes[reg.id];

                            return (
                              <div key={reg.id} className="space-y-2">
                                <div
                                  className={`flex items-center justify-between text-xs font-semibold p-1.5 rounded-lg transition ${isRegSelected
                                    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 border border-sky-200 dark:border-sky-800'
                                    : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                  <div
                                    onClick={() => {
                                      setSelectedNode({ type: 'REGION', data: reg, parentName: company.name });
                                      toggleExpand(reg.id);
                                    }}
                                    className="flex items-center space-x-2 cursor-pointer flex-1"
                                  >
                                    <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                                    <span>{reg.name}</span>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800 font-mono">
                                      {reg.code}
                                    </span>
                                  </div>

                                  <div className="flex items-center space-x-1.5 ml-2">
                                    {isAdmin && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openAddModal('CITY', { regionId: reg.id });
                                          }}
                                          title="Add City in this Region"
                                          className="px-1.5 py-0.5 rounded bg-sky-50 hover:bg-sky-100 dark:bg-sky-950 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 text-[9px] font-semibold transition border border-sky-200 dark:border-sky-800"
                                        >
                                          + City
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openEditModal('REGION', reg);
                                          }}
                                          title="Edit Region"
                                          className="p-1 rounded text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition"
                                        >
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openDeleteModal('REGION', reg);
                                          }}
                                          title="Delete Region"
                                          className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => toggleExpand(reg.id)}
                                      className="p-1 text-slate-400"
                                    >
                                      {isRegExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </div>

                                {/* LEVEL 3: CITY */}
                                {isRegExpanded && (
                                  <div className="pl-4 border-l-2 border-sky-200 dark:border-sky-900 space-y-2">
                                    {reg.cities?.length === 0 ? (
                                      <div className="text-[11px] text-slate-400 py-1 flex items-center justify-between">
                                        <span>No cities registered in {reg.name}.</span>
                                        {isAdmin && (
                                          <button
                                            type="button"
                                            onClick={() => openAddModal('CITY', { regionId: reg.id })}
                                            className="text-sky-600 dark:text-sky-400 hover:underline font-semibold"
                                          >
                                            + Add First City
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      reg.cities?.map((city: any) => {
                                        const isCitySelected = selectedNode?.type === 'CITY' && selectedNode.data.id === city.id;
                                        const isCityExpanded = !!expandedNodes[city.id];

                                        return (
                                          <div key={city.id} className="space-y-2">
                                            <div
                                              className={`flex items-center justify-between text-xs font-medium p-1.5 rounded-lg transition ${isCitySelected
                                                ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 border border-teal-200 dark:border-teal-800'
                                                : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                              <div
                                                onClick={() => {
                                                  setSelectedNode({ type: 'CITY', data: city, parentName: reg.name });
                                                  toggleExpand(city.id);
                                                }}
                                                className="flex items-center space-x-2 cursor-pointer flex-1"
                                              >
                                                <MapPin className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                                                <span>
                                                  {city.name}
                                                  {city.state ? `, ${city.state}` : ''}
                                                </span>
                                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 font-mono">
                                                  {city.code}
                                                </span>
                                              </div>

                                              <div className="flex items-center space-x-1.5 ml-2">
                                                {isAdmin && (
                                                  <>
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openAddModal('SITE', { cityId: city.id });
                                                      }}
                                                      title="Add Logistics Site in this City"
                                                      className="px-1.5 py-0.5 rounded bg-teal-50 hover:bg-teal-100 dark:bg-teal-950 dark:hover:bg-teal-900 text-teal-700 dark:text-teal-300 text-[9px] font-semibold transition border border-teal-200 dark:border-teal-800"
                                                    >
                                                      + Site
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal('CITY', city);
                                                      }}
                                                      title="Edit City"
                                                      className="p-1 rounded text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition"
                                                    >
                                                      <Pencil className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openDeleteModal('CITY', city);
                                                      }}
                                                      title="Delete City"
                                                      className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                                                    >
                                                      <Trash2 className="w-3 h-3" />
                                                    </button>
                                                  </>
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={() => toggleExpand(city.id)}
                                                  className="p-1 text-slate-400"
                                                >
                                                  {isCityExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                </button>
                                              </div>
                                            </div>

                                            {/* LEVEL 4: SITE */}
                                            {isCityExpanded && (
                                              <div className="pl-4 border-l border-teal-200 dark:border-teal-900 space-y-2">
                                                {city.sites?.length === 0 ? (
                                                  <div className="text-[11px] text-slate-400 py-1 flex items-center justify-between">
                                                    <span>No logistics sites registered in {city.name}.</span>
                                                    {isAdmin && (
                                                      <button
                                                        type="button"
                                                        onClick={() => openAddModal('SITE', { cityId: city.id })}
                                                        className="text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                                                      >
                                                        + Add First Site
                                                      </button>
                                                    )}
                                                  </div>
                                                ) : (
                                                  city.sites?.map((site: any) => {
                                                    const isSiteSelected = selectedNode?.type === 'SITE' && selectedNode.data.id === site.id;
                                                    const isSiteExpanded = !!expandedNodes[site.id];

                                                    return (
                                                      <div key={site.id} className="space-y-2">
                                                        <div
                                                          className={`flex items-center justify-between text-xs font-semibold p-2 rounded-lg transition ${isSiteSelected
                                                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800'
                                                            : 'bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                                            }`}
                                                        >
                                                          <div
                                                            onClick={() => {
                                                              setSelectedNode({ type: 'SITE', data: site, parentName: city.name });
                                                              toggleExpand(site.id);
                                                            }}
                                                            className="flex items-center space-x-2 cursor-pointer flex-1"
                                                          >
                                                            <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                                            <span>Site: {site.name}</span>
                                                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-mono">
                                                              {site.code}
                                                            </span>
                                                          </div>

                                                          <div className="flex items-center space-x-1.5 ml-2">
                                                            {isInventoryManager && (
                                                              <>
                                                                <button
                                                                  type="button"
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openAddModal('WAREHOUSE', { siteId: site.id });
                                                                  }}
                                                                  title="Add Warehouse Facility into this Site"
                                                                  className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[9px] font-semibold transition border border-emerald-200 dark:border-emerald-800"
                                                                >
                                                                  + Warehouse
                                                                </button>
                                                                <button
                                                                  type="button"
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openEditModal('SITE', site);
                                                                  }}
                                                                  title="Edit Site Details"
                                                                  className="p-1 rounded text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
                                                                >
                                                                  <Pencil className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                  type="button"
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openDeleteModal('SITE', site);
                                                                  }}
                                                                  title="Delete Site"
                                                                  className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                                                                >
                                                                  <Trash2 className="w-3 h-3" />
                                                                </button>
                                                              </>
                                                            )}
                                                            <button
                                                              type="button"
                                                              onClick={() => toggleExpand(site.id)}
                                                              className="p-1 text-slate-400"
                                                            >
                                                              {isSiteExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                            </button>
                                                          </div>
                                                        </div>

                                                        {/* LEVEL 5: WAREHOUSE */}
                                                        {isSiteExpanded && (
                                                          <div className="pl-3 space-y-3">
                                                            {site.warehouses?.length === 0 ? (
                                                              <div className="text-[11px] text-slate-400 py-1 pl-2 flex items-center justify-between">
                                                                <span>No warehouse facilities built in {site.name}.</span>
                                                                {isInventoryManager && (
                                                                  <button
                                                                    type="button"
                                                                    onClick={() => openAddModal('WAREHOUSE', { siteId: site.id })}
                                                                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                                                                  >
                                                                    + Build Warehouse
                                                                  </button>
                                                                )}
                                                              </div>
                                                            ) : (
                                                              site.warehouses?.map((wh: any) => {
                                                                const isWhSelected = selectedNode?.type === 'WAREHOUSE' && selectedNode.data.id === wh.id;
                                                                const isWhExpanded = expandedNodes[wh.id] !== false;

                                                                return (
                                                                  <div
                                                                    key={wh.id}
                                                                    className={`p-3 bg-white dark:bg-slate-900 border rounded-xl space-y-2 transition ${isWhSelected
                                                                      ? 'border-emerald-500 shadow-sm'
                                                                      : 'border-slate-200 dark:border-slate-800'
                                                                      }`}
                                                                  >
                                                                    <div
                                                                      onClick={() => {
                                                                        setSelectedNode({ type: 'WAREHOUSE', data: wh, parentName: site.name });
                                                                        toggleExpand(wh.id);
                                                                      }}
                                                                      className="flex items-center justify-between cursor-pointer"
                                                                    >
                                                                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 dark:text-white">
                                                                        <Warehouse className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                                        <span>{wh.name}</span>
                                                                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-mono">
                                                                          {wh.code}
                                                                        </span>
                                                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                                                                          {wh.warehouseType}
                                                                        </span>
                                                                        {!wh.isActive && (
                                                                          <span className="text-[9px] px-1 rounded bg-rose-50 text-rose-600 border border-rose-200">
                                                                            Inactive
                                                                          </span>
                                                                        )}
                                                                      </div>

                                                                      <div className="flex items-center space-x-1.5">
                                                                        {canManageWarehouse && (
                                                                          <>
                                                                            <button
                                                                              type="button"
                                                                              onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                openAddModal('ZONE', { warehouseId: wh.id });
                                                                              }}
                                                                              title="Add Zone to this Warehouse"
                                                                              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-brand-50 dark:bg-slate-800 dark:hover:bg-brand-950 text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 text-[10px] font-medium transition flex items-center space-x-1"
                                                                            >
                                                                              <Plus className="w-2.5 h-2.5" />
                                                                              <span>Zone</span>
                                                                            </button>
                                                                            <button
                                                                              type="button"
                                                                              onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                openAddModal('BIN', { warehouseId: wh.id });
                                                                              }}
                                                                              title="Add Floor Bin to this Warehouse"
                                                                              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-brand-50 dark:bg-slate-800 dark:hover:bg-brand-950 text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 text-[10px] font-medium transition flex items-center space-x-1"
                                                                            >
                                                                              <Plus className="w-2.5 h-2.5" />
                                                                              <span>Bin</span>
                                                                            </button>
                                                                            <button
                                                                              type="button"
                                                                              onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                openEditModal('WAREHOUSE', wh);
                                                                              }}
                                                                              title="Edit Warehouse Facility"
                                                                              className="p-1 rounded text-slate-400 hover:text-emerald-600 transition"
                                                                            >
                                                                              <Pencil className="w-3 h-3" />
                                                                            </button>
                                                                            <button
                                                                              type="button"
                                                                              onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                openDeleteModal('WAREHOUSE', wh);
                                                                              }}
                                                                              title="Delete Warehouse Facility"
                                                                              className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                                                                            >
                                                                              <Trash2 className="w-3 h-3" />
                                                                            </button>
                                                                          </>
                                                                        )}
                                                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                                                      </div>
                                                                    </div>

                                                                    {/* LEVEL 6: ZONE */}
                                                                    {isWhExpanded && (
                                                                      <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-2 pt-2">
                                                                        {wh.zones?.map((zone: any) => {
                                                                          const isZoneSelected = selectedNode?.type === 'ZONE' && selectedNode.data.id === zone.id;

                                                                          return (
                                                                            <div key={zone.id} className="space-y-1.5">
                                                                              <div
                                                                                className={`flex items-center justify-between p-1 rounded-lg transition ${isZoneSelected
                                                                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 border border-amber-200 dark:border-amber-800'
                                                                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                                                                  }`}
                                                                              >
                                                                                <div
                                                                                  onClick={() =>
                                                                                    setSelectedNode({
                                                                                      type: 'ZONE',
                                                                                      data: { ...zone, warehouseId: wh.id },
                                                                                      parentName: wh.name,
                                                                                    })
                                                                                  }
                                                                                  className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 cursor-pointer flex-1"
                                                                                >
                                                                                  <Boxes className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                                                                                  <span>
                                                                                    {zone.name} ({zone.code})
                                                                                  </span>
                                                                                  <span className="text-[9px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                                                                                    {zone.zoneType}
                                                                                  </span>
                                                                                </div>

                                                                                <div className="flex items-center space-x-1">
                                                                                  {canManageWarehouse && (
                                                                                    <>
                                                                                      <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                          openAddModal('RACK', {
                                                                                            warehouseId: wh.id,
                                                                                            zoneId: zone.id,
                                                                                          })
                                                                                        }
                                                                                        title="Add Rack to this Zone"
                                                                                        className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-brand-50 dark:bg-slate-800 text-slate-500 hover:text-brand-600 text-[9px] font-medium transition flex items-center space-x-0.5"
                                                                                      >
                                                                                        <Plus className="w-2 h-2" />
                                                                                        <span>Rack</span>
                                                                                      </button>
                                                                                      <button
                                                                                        type="button"
                                                                                        onClick={() => openEditModal('ZONE', zone)}
                                                                                        title="Edit Zone"
                                                                                        className="p-1 rounded text-slate-400 hover:text-amber-600 transition"
                                                                                      >
                                                                                        <Pencil className="w-2.5 h-2.5" />
                                                                                      </button>
                                                                                      <button
                                                                                        type="button"
                                                                                        onClick={() => openDeleteModal('ZONE', zone)}
                                                                                        title="Delete Zone"
                                                                                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                                                                                      >
                                                                                        <Trash2 className="w-2.5 h-2.5" />
                                                                                      </button>
                                                                                    </>
                                                                                  )}
                                                                                </div>
                                                                              </div>

                                                                              {/* LEVEL 7: RACK */}
                                                                              <div className="pl-3 space-y-2">
                                                                                {zone.racks?.map((rack: any) => {
                                                                                  const isRackSelected = selectedNode?.type === 'RACK' && selectedNode.data.id === rack.id;

                                                                                  return (
                                                                                    <div key={rack.id} className="space-y-1">
                                                                                      <div
                                                                                        className={`flex items-center justify-between p-1 rounded transition ${isRackSelected
                                                                                          ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-900 border border-sky-200 dark:border-sky-800'
                                                                                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                                                                          }`}
                                                                                      >
                                                                                        <div
                                                                                          onClick={() =>
                                                                                            setSelectedNode({
                                                                                              type: 'RACK',
                                                                                              data: { ...rack, warehouseId: wh.id, zoneId: zone.id },
                                                                                              parentName: `${wh.name} / ${zone.name}`,
                                                                                            })
                                                                                          }
                                                                                          className="text-[10px] font-mono text-slate-600 dark:text-slate-400 flex items-center space-x-1 cursor-pointer flex-1"
                                                                                        >
                                                                                          <Grid className="w-2.5 h-2.5 text-sky-500 dark:text-sky-400" />
                                                                                          <span>
                                                                                            {rack.name} ({rack.code}) - {rack.levels} tiers
                                                                                          </span>
                                                                                        </div>

                                                                                        <div className="flex items-center space-x-1">
                                                                                          {canManageWarehouse && (
                                                                                            <>
                                                                                              <button
                                                                                                type="button"
                                                                                                onClick={() =>
                                                                                                  openAddModal('BIN', {
                                                                                                    warehouseId: wh.id,
                                                                                                    zoneId: zone.id,
                                                                                                    rackId: rack.id,
                                                                                                  })
                                                                                                }
                                                                                                title="Add Bin to this Rack"
                                                                                                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-brand-50 text-slate-500 hover:text-brand-600 text-[9px] font-medium transition flex items-center space-x-0.5"
                                                                                              >
                                                                                                <Plus className="w-2 h-2" />
                                                                                                <span>Bin</span>
                                                                                              </button>
                                                                                              <button
                                                                                                type="button"
                                                                                                onClick={() => openEditModal('RACK', rack)}
                                                                                                title="Edit Rack"
                                                                                                className="p-1 rounded text-slate-400 hover:text-sky-600 transition"
                                                                                              >
                                                                                                <Pencil className="w-2.5 h-2.5" />
                                                                                              </button>
                                                                                              <button
                                                                                                type="button"
                                                                                                onClick={() => openDeleteModal('RACK', rack)}
                                                                                                title="Delete Rack"
                                                                                                className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                                                                                              >
                                                                                                <Trash2 className="w-2.5 h-2.5" />
                                                                                              </button>
                                                                                            </>
                                                                                          )}
                                                                                        </div>
                                                                                      </div>

                                                                                      {/* LEVEL 8: BIN */}
                                                                                      <div className="flex flex-wrap gap-1.5 pt-1 pl-3">
                                                                                        {rack.bins?.map((bin: any) => {
                                                                                          const isBinSelected = selectedNode?.type === 'BIN' && selectedNode.data.id === bin.id;

                                                                                          return (
                                                                                            <button
                                                                                              key={bin.id}
                                                                                              onClick={() =>
                                                                                                setSelectedNode({
                                                                                                  type: 'BIN',
                                                                                                  data: { ...bin, warehouseId: wh.id, rackName: rack.name },
                                                                                                  parentName: `${wh.name} / ${zone.name} / ${rack.name}`,
                                                                                                })
                                                                                              }
                                                                                              title={`${bin.name} (${bin.code}) - Click to inspect`}
                                                                                              className={`px-2 py-1 rounded text-[10px] font-mono transition flex items-center space-x-1 ${isBinSelected
                                                                                                ? 'bg-brand-600 text-white font-bold ring-2 ring-brand-400'
                                                                                                : bin.stockBalances?.some((b: any) => b.onHandQty > 0)
                                                                                                  ? 'bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50 hover:bg-emerald-100'
                                                                                                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                                                                                                }`}
                                                                                            >
                                                                                              <Archive className="w-2.5 h-2.5" />
                                                                                              <span>{bin.code}</span>
                                                                                            </button>
                                                                                          );
                                                                                        })}
                                                                                      </div>
                                                                                    </div>
                                                                                  );
                                                                                })}
                                                                              </div>
                                                                            </div>
                                                                          );
                                                                        })}

                                                                        {/* Direct Warehouse Floor Bins */}
                                                                        {wh.bins && wh.bins.length > 0 && (
                                                                          <div className="pt-2">
                                                                            <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                                                              Floor / Direct Bins:
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                                              {wh.bins.map((bin: any) => {
                                                                                const isBinSelected = selectedNode?.type === 'BIN' && selectedNode.data.id === bin.id;

                                                                                return (
                                                                                  <button
                                                                                    key={bin.id}
                                                                                    onClick={() =>
                                                                                      setSelectedNode({
                                                                                        type: 'BIN',
                                                                                        data: { ...bin, warehouseId: wh.id },
                                                                                        parentName: `${wh.name} (Floor)`,
                                                                                      })
                                                                                    }
                                                                                    title={`${bin.name} (${bin.code}) - Click to inspect`}
                                                                                    className={`px-2 py-1 rounded text-[10px] font-mono transition flex items-center space-x-1 ${isBinSelected
                                                                                      ? 'bg-brand-600 text-white font-bold ring-2 ring-brand-400'
                                                                                      : bin.stockBalances?.some((b: any) => b.onHandQty > 0)
                                                                                        ? 'bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50 hover:bg-emerald-100'
                                                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                                                                                      }`}
                                                                                  >
                                                                                    <Archive className="w-2.5 h-2.5" />
                                                                                    <span>{bin.code}</span>
                                                                                  </button>
                                                                                );
                                                                              })}
                                                                            </div>
                                                                          </div>
                                                                        )}
                                                                      </div>
                                                                    )}
                                                                  </div>
                                                                );
                                                              })
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Unified Node Inspector */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between">
          <div>
            {selectedNode ? (
              <>
                {/* Dynamic Inspector Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    {selectedNode.type === 'COMPANY' && <Building className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                    {selectedNode.type === 'REGION' && <Globe className="w-5 h-5 text-sky-600 dark:text-sky-400" />}
                    {selectedNode.type === 'CITY' && <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
                    {selectedNode.type === 'SITE' && <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                    {selectedNode.type === 'WAREHOUSE' && <Warehouse className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                    {selectedNode.type === 'ZONE' && <Boxes className="w-5 h-5 text-amber-500 dark:text-amber-400" />}
                    {selectedNode.type === 'RACK' && <Grid className="w-5 h-5 text-sky-500 dark:text-sky-400" />}
                    {selectedNode.type === 'BIN' && <Archive className="w-5 h-5 text-brand-600 dark:text-brand-400" />}

                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                        {selectedNode.type.toLowerCase()} Inspector
                      </h2>
                      {selectedNode.parentName && (
                        <p className="text-[10px] text-slate-400">Under: {selectedNode.parentName}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions for current node */}
                  <div className="flex items-center space-x-1.5">
                    {canManageWarehouse && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(selectedNode.type, selectedNode.data)}
                          title="Edit Details"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(selectedNode.type, selectedNode.data)}
                          title="Delete Node"
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Node Details Card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-base font-bold text-slate-900 dark:text-white">
                        {selectedNode.data.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        Code: {selectedNode.data.code}
                      </div>
                    </div>

                    {selectedNode.data.isActive !== undefined && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${selectedNode.data.isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          }`}
                      >
                        {selectedNode.data.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    {selectedNode.type === 'COMPANY' && (
                      <>
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">Currency</span>
                          <span className="font-semibold text-indigo-600 font-mono">
                            {selectedNode.data.currency || 'USD'}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">Total Regions</span>
                          <span className="font-semibold">{selectedNode.data.regions?.length || 0}</span>
                        </div>
                      </>
                    )}

                    {selectedNode.type === 'CITY' && (
                      <>
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">State / Province</span>
                          <span className="font-semibold">{selectedNode.data.state || 'N/A'}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">Country</span>
                          <span className="font-semibold">{selectedNode.data.country || 'USA'}</span>
                        </div>
                      </>
                    )}

                    {selectedNode.type === 'SITE' && selectedNode.data.contactNumber && (
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 col-span-2">
                        <span className="text-[10px] text-slate-400 block">Contact Phone</span>
                        <span className="font-semibold">{selectedNode.data.contactNumber}</span>
                      </div>
                    )}

                    {selectedNode.type === 'WAREHOUSE' && (
                      <>
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">Warehouse Type</span>
                          <span className="font-semibold text-emerald-600">{selectedNode.data.warehouseType}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">Zones Configured</span>
                          <span className="font-semibold">{selectedNode.data.zones?.length || 0}</span>
                        </div>
                      </>
                    )}

                    {selectedNode.type === 'ZONE' && (
                      <>
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">Zone Purpose</span>
                          <span className="font-semibold text-amber-600">{selectedNode.data.zoneType}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">Racks</span>
                          <span className="font-semibold">{selectedNode.data.racks?.length || 0}</span>
                        </div>
                      </>
                    )}

                    {selectedNode.type === 'RACK' && (
                      <>
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">Tier Levels</span>
                          <span className="font-semibold text-sky-600">{selectedNode.data.levels}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">Bins</span>
                          <span className="font-semibold">{selectedNode.data.bins?.length || 0}</span>
                        </div>
                      </>
                    )}

                    {selectedNode.type === 'BIN' && (
                      <>
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">Bin Type</span>
                          <span className="font-semibold text-brand-600">{selectedNode.data.binType}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">Capacity</span>
                          <span className="font-semibold">
                            {selectedNode.data.maxWeight ? `${selectedNode.data.maxWeight} kg` : 'Unlimited'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {selectedNode.data.address && (
                    <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-xs">
                      <span className="text-[10px] text-slate-400 block mb-0.5">Address</span>
                      <p className="text-slate-700 dark:text-slate-300">{selectedNode.data.address}</p>
                    </div>
                  )}

                  {/* Quick Child Create Action */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    {selectedNode.type === 'COMPANY' && isAdmin && (
                      <button
                        type="button"
                        onClick={() => openAddModal('REGION', { companyId: selectedNode.data.id })}
                        className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center space-x-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Region to this Company</span>
                      </button>
                    )}

                    {selectedNode.type === 'REGION' && isAdmin && (
                      <button
                        type="button"
                        onClick={() => openAddModal('CITY', { regionId: selectedNode.data.id })}
                        className="w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center space-x-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add City to this Region</span>
                      </button>
                    )}

                    {selectedNode.type === 'CITY' && isAdmin && (
                      <button
                        type="button"
                        onClick={() => openAddModal('SITE', { cityId: selectedNode.data.id })}
                        className="w-full py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center justify-center space-x-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Site to this City</span>
                      </button>
                    )}

                    {selectedNode.type === 'SITE' && isInventoryManager && (
                      <button
                        type="button"
                        onClick={() => openAddModal('WAREHOUSE', { siteId: selectedNode.data.id })}
                        className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center space-x-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Warehouse to this Site</span>
                      </button>
                    )}

                    {selectedNode.type === 'WAREHOUSE' && canManageWarehouse && (
                      <div className="grid grid-cols-2 gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => openAddModal('ZONE', { warehouseId: selectedNode.data.id })}
                          className="py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center justify-center space-x-1 transition"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Zone</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openAddModal('BIN', { warehouseId: selectedNode.data.id })}
                          className="py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-semibold flex items-center justify-center space-x-1 transition"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Floor Bin</span>
                        </button>
                      </div>
                    )}

                    {selectedNode.type === 'ZONE' && canManageWarehouse && (
                      <button
                        type="button"
                        onClick={() =>
                          openAddModal('RACK', {
                            warehouseId: selectedNode.data.warehouseId,
                            zoneId: selectedNode.data.id,
                          })
                        }
                        className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center space-x-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Storage Rack</span>
                      </button>
                    )}

                    {selectedNode.type === 'RACK' && canManageWarehouse && (
                      <button
                        type="button"
                        onClick={() =>
                          openAddModal('BIN', {
                            warehouseId: selectedNode.data.warehouseId,
                            zoneId: selectedNode.data.zoneId,
                            rackId: selectedNode.data.id,
                          })
                        }
                        className="w-full py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center justify-center space-x-1 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Bin to this Rack</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Stored Inventory Breakdown (if Bin) */}
                {selectedNode.type === 'BIN' && (
                  <div className="mt-4">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Current Physical Inventory</span>
                      <span className="text-[10px] font-normal text-slate-400 font-mono">Live Synced</span>
                    </h3>
                    {(activeNodeData?.stockBalances || selectedNode.data.stockBalances)?.length > 0 ? (
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {(activeNodeData?.stockBalances || selectedNode.data.stockBalances).map((b: any) => (
                          <div
                            key={b.id}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center"
                          >
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-white">{b.product.name}</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                {b.product.sku} {b.batchNumber ? `· Batch: ${b.batchNumber}` : ''}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-sm font-bold ${b.onHandQty > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
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
                )}
              </>
            ) : (
              <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center justify-center space-y-2">
                <Archive className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                <p className="font-medium text-slate-600 dark:text-slate-300">No node selected</p>
                <p className="max-w-xs text-[11px]">
                  Click any node in the tree hierarchy to inspect its details, view child metrics, or add/edit/delete nodes.
                </p>
              </div>
            )}
          </div>

          {/* ERP Governance Notice Footer */}
          <div className="mt-6 p-3 bg-slate-50 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              ERP Ledger Safeguard: Deleting any node containing active inventory balances or historical movement records is permanently prevented to maintain audit compliance.
            </span>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* ADD NODE MODAL (Supports All 8 Levels)      */}
      {/* ========================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                    Add New {addNodeType.toLowerCase()} Node
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Register a new level in the Enterprise Location Hierarchy
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {addErrorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{addErrorMessage}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-3.5"
            >
              {/* Type Switcher */}
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Node Type</label>
                <select
                  value={addNodeType}
                  onChange={(e) => {
                    const nt = e.target.value as HierarchyNodeType;
                    openAddModal(nt, {
                      companyId: addFormData.companyId,
                      regionId: addFormData.regionId,
                      cityId: addFormData.cityId,
                      siteId: addFormData.siteId,
                      warehouseId: addFormData.warehouseId,
                    });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                >
                  {isAdmin && <option value="COMPANY">Company (Root Enterprise Entity)</option>}
                  {isAdmin && <option value="REGION">Region (under Company)</option>}
                  {isAdmin && <option value="CITY">City (under Region)</option>}
                  {isAdmin && <option value="SITE">Site (under City)</option>}
                  {isInventoryManager && <option value="WAREHOUSE">Warehouse (under Site)</option>}
                  {canManageWarehouse && <option value="ZONE">Zone (under Warehouse)</option>}
                  {canManageWarehouse && <option value="RACK">Rack (under Zone)</option>}
                  {canManageWarehouse && <option value="BIN">Bin (under Rack / Floor)</option>}
                </select>
              </div>

              {/* PARENT SELECTORS DEPENDING ON LEVEL */}
              {addNodeType === 'REGION' && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Target Company *</label>
                  <select
                    required
                    value={addFormData.companyId}
                    onChange={(e) => setAddFormData((p) => ({ ...p, companyId: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    {allCompanies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {addNodeType === 'CITY' && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Target Region *</label>
                  <select
                    required
                    value={addFormData.regionId}
                    onChange={(e) => setAddFormData((p) => ({ ...p, regionId: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    {allRegions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code}) [{r.companyName}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {addNodeType === 'SITE' && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Target City *</label>
                  <select
                    required
                    value={addFormData.cityId}
                    onChange={(e) => setAddFormData((p) => ({ ...p, cityId: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    {allCities.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.name} ({ct.code}) [{ct.regionName}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {addNodeType === 'WAREHOUSE' && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Logistics Site *</label>
                  <select
                    required
                    value={addFormData.siteId}
                    onChange={(e) => setAddFormData((p) => ({ ...p, siteId: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    {allSites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code}) [{s.cityName}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(addNodeType === 'ZONE' || addNodeType === 'RACK' || addNodeType === 'BIN') && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Warehouse Facility *</label>
                  <select
                    required
                    value={addFormData.warehouseId}
                    onChange={(e) =>
                      setAddFormData((p) => ({
                        ...p,
                        warehouseId: e.target.value,
                        zoneId: '',
                        rackId: '',
                      }))
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    {allWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code}) [{w.siteName}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(addNodeType === 'RACK' || (addNodeType === 'BIN' && currentWhZones.length > 0)) && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                    Warehouse Zone {addNodeType === 'RACK' ? '*' : '(Optional filter)'}
                  </label>
                  <select
                    required={addNodeType === 'RACK'}
                    value={addFormData.zoneId}
                    onChange={(e) => setAddFormData((p) => ({ ...p, zoneId: e.target.value, rackId: '' }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="">{addNodeType === 'RACK' ? 'Select Zone' : 'All Zones / Direct'}</option>
                    {currentWhZones.map((z: any) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {addNodeType === 'BIN' && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Storage Rack Placement</label>
                  <select
                    value={addFormData.rackId}
                    onChange={(e) => setAddFormData((p) => ({ ...p, rackId: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="">None (Floor / Direct Bin)</option>
                    {currentWhRacks.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* COMMON IDENTIFIER FIELDS */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Code *</label>
                  <input
                    type="text"
                    required
                    value={addFormData.code}
                    onChange={(e) => setAddFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="w-full uppercase font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                    placeholder="e.g. DAL-WH1"
                  />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Name *</label>
                  <input
                    type="text"
                    required
                    value={addFormData.name}
                    onChange={(e) => setAddFormData((p) => ({ ...p, name: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                    placeholder="e.g. Dallas Central Facility"
                  />
                </div>
              </div>

              {/* SPECIFIC ATTRIBUTES */}
              {addNodeType === 'COMPANY' && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Functional Currency</label>
                  <select
                    value={addFormData.currency}
                    onChange={(e) => setAddFormData((p) => ({ ...p, currency: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="SGD">SGD ($)</option>
                  </select>
                </div>
              )}

              {addNodeType === 'CITY' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">State / Province</label>
                    <input
                      type="text"
                      value={addFormData.state}
                      onChange={(e) => setAddFormData((p) => ({ ...p, state: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                      placeholder="e.g. TX"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Country</label>
                    <input
                      type="text"
                      value={addFormData.country}
                      onChange={(e) => setAddFormData((p) => ({ ...p, country: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                      placeholder="e.g. USA"
                    />
                  </div>
                </div>
              )}

              {(addNodeType === 'COMPANY' || addNodeType === 'SITE' || addNodeType === 'WAREHOUSE') && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Physical Address</label>
                  <textarea
                    rows={2}
                    value={addFormData.address}
                    onChange={(e) => setAddFormData((p) => ({ ...p, address: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                    placeholder="Street, City, Postal Code"
                  />
                </div>
              )}

              {addNodeType === 'SITE' && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Contact Phone</label>
                  <input
                    type="text"
                    value={addFormData.contactNumber}
                    onChange={(e) => setAddFormData((p) => ({ ...p, contactNumber: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                    placeholder="e.g. +1 555-0199"
                  />
                </div>
              )}

              {addNodeType === 'WAREHOUSE' && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Facility Type</label>
                  <select
                    value={addFormData.warehouseType}
                    onChange={(e) => setAddFormData((p) => ({ ...p, warehouseType: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="STANDARD">Standard Distribution Center</option>
                    <option value="TRANSIT">Cross-Dock Transit</option>
                    <option value="QUARANTINE">Quarantine & QA Hub</option>
                    <option value="BONDED">Bonded Customs Facility</option>
                  </select>
                </div>
              )}

              {addNodeType === 'ZONE' && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Zone Function</label>
                  <select
                    value={addFormData.zoneType}
                    onChange={(e) => setAddFormData((p) => ({ ...p, zoneType: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="STORAGE">Storage</option>
                    <option value="RECEIVING">Inbound Receiving</option>
                    <option value="PICKING">Fast Picking</option>
                    <option value="QUARANTINE">Quarantine</option>
                    <option value="DISPATCH">Outbound Dispatch</option>
                  </select>
                </div>
              )}

              {addNodeType === 'RACK' && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Vertical Levels (Tiers)</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={addFormData.levels}
                    onChange={(e) => setAddFormData((p) => ({ ...p, levels: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {addNodeType === 'BIN' && (
                <>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Bin Classification</label>
                    <select
                      value={addFormData.binType}
                      onChange={(e) => setAddFormData((p) => ({ ...p, binType: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                    >
                      <option value="STORAGE">Storage</option>
                      <option value="RECEIVING">Receiving</option>
                      <option value="PICKING">Picking</option>
                      <option value="QUARANTINE">Quarantine</option>
                      <option value="DISPATCH">Dispatch</option>
                      <option value="STAGING">Staging</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Max Weight (kg)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={addFormData.maxWeight}
                        onChange={(e) => setAddFormData((p) => ({ ...p, maxWeight: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                        placeholder="e.g. 500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Max Volume (m³)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={addFormData.maxVolume}
                        onChange={(e) => setAddFormData((p) => ({ ...p, maxVolume: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                        placeholder="e.g. 2.5"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold transition flex items-center space-x-1.5 shadow-lg shadow-brand-500/25"
                >
                  {createMutation.isPending ? (
                    <span>Creating...</span>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create {addNodeType}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* EDIT NODE MODAL                            */}
      {/* ========================================== */}
      {showEditModal && editModalNode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                    Edit {editModalNode.type.toLowerCase()} ({editModalNode.data.code})
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Update location properties and parameters
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editErrorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{editErrorMessage}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                editMutation.mutate();
              }}
              className="space-y-3.5"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Code *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.code}
                    onChange={(e) => setEditFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="w-full uppercase font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData((p) => ({ ...p, name: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {editModalNode.type === 'COMPANY' && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Currency</label>
                  <select
                    value={editFormData.currency}
                    onChange={(e) => setEditFormData((p) => ({ ...p, currency: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                    <option value="SGD">SGD ($)</option>
                  </select>
                </div>
              )}

              {editModalNode.type === 'CITY' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">State</label>
                    <input
                      type="text"
                      value={editFormData.state}
                      onChange={(e) => setEditFormData((p) => ({ ...p, state: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Country</label>
                    <input
                      type="text"
                      value={editFormData.country}
                      onChange={(e) => setEditFormData((p) => ({ ...p, country: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {(editModalNode.type === 'COMPANY' ||
                editModalNode.type === 'SITE' ||
                editModalNode.type === 'WAREHOUSE') && (
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Address</label>
                    <textarea
                      rows={2}
                      value={editFormData.address}
                      onChange={(e) => setEditFormData((p) => ({ ...p, address: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

              {editModalNode.type === 'SITE' && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Contact Phone</label>
                  <input
                    type="text"
                    value={editFormData.contactNumber}
                    onChange={(e) => setEditFormData((p) => ({ ...p, contactNumber: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {editModalNode.type === 'WAREHOUSE' && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Facility Type</label>
                  <select
                    value={editFormData.warehouseType}
                    onChange={(e) => setEditFormData((p) => ({ ...p, warehouseType: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="STANDARD">Standard Distribution Center</option>
                    <option value="TRANSIT">Cross-Dock Transit</option>
                    <option value="QUARANTINE">Quarantine & QA Hub</option>
                    <option value="BONDED">Bonded Customs Facility</option>
                  </select>
                </div>
              )}

              {editModalNode.type === 'ZONE' && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Zone Function</label>
                  <select
                    value={editFormData.zoneType}
                    onChange={(e) => setEditFormData((p) => ({ ...p, zoneType: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="STORAGE">Storage</option>
                    <option value="RECEIVING">Inbound Receiving</option>
                    <option value="PICKING">Fast Picking</option>
                    <option value="QUARANTINE">Quarantine</option>
                    <option value="DISPATCH">Outbound Dispatch</option>
                  </select>
                </div>
              )}

              {editModalNode.type === 'RACK' && (
                <div>
                  <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Vertical Levels</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editFormData.levels}
                    onChange={(e) => setEditFormData((p) => ({ ...p, levels: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {editModalNode.type === 'BIN' && (
                <>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Bin Classification</label>
                    <select
                      value={editFormData.binType}
                      onChange={(e) => setEditFormData((p) => ({ ...p, binType: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                    >
                      <option value="STORAGE">Storage</option>
                      <option value="RECEIVING">Receiving</option>
                      <option value="PICKING">Picking</option>
                      <option value="QUARANTINE">Quarantine</option>
                      <option value="DISPATCH">Dispatch</option>
                      <option value="STAGING">Staging</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Max Weight (kg)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={editFormData.maxWeight}
                        onChange={(e) => setEditFormData((p) => ({ ...p, maxWeight: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Max Volume (m³)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editFormData.maxVolume}
                        onChange={(e) => setEditFormData((p) => ({ ...p, maxVolume: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Active Toggle Checkbox */}
              {editModalNode.type !== 'REGION' && editModalNode.type !== 'CITY' && (
                <div className="pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.isActive}
                      onChange={(e) => setEditFormData((p) => ({ ...p, isActive: e.target.checked }))}
                      className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Active Status (Deactivating prevents future stock allocation)
                    </span>
                  </label>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold transition flex items-center space-x-1.5 shadow-lg shadow-brand-500/25"
                >
                  {editMutation.isPending ? <span>Saving...</span> : <span>Update {editModalNode.type}</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* DELETE NODE MODAL                          */}
      {/* ========================================== */}
      {showDeleteModal && deleteModalNode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/40">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                  Delete {deleteModalNode.type.toLowerCase()}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {deleteModalNode.data.code} - {deleteModalNode.data.name}
                </p>
              </div>
            </div>

            {deleteErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{deleteErrorMessage}</span>
              </div>
            )}

            <p className="text-slate-600 dark:text-slate-300 text-xs">
              Are you sure you want to permanently delete this {deleteModalNode.type.toLowerCase()}:{' '}
              <strong className="text-slate-900 dark:text-white">{deleteModalNode.data.name}</strong> (
              <span className="font-mono">{deleteModalNode.data.code}</span>)?
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <div className="flex items-center space-x-1 font-semibold text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span>ERP Data Safeguard Rule</span>
              </div>
              <p>
                Deleting this node cascades to its immediate children if safe. However, deletion is <strong>blocked</strong> if any warehouse or bin within this branch holds active physical stock or historical transaction movements.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold transition flex items-center space-x-1.5 shadow-lg shadow-rose-600/25"
              >
                {deleteMutation.isPending ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { WarehouseHierarchy } from './pages/WarehouseHierarchy';
import { Products } from './pages/Products';
import { InventoryBalances } from './pages/InventoryBalances';
import { StockLedger } from './pages/StockLedger';
import { Procurement } from './pages/Procurement';
import { ReceivingPutaway } from './pages/ReceivingPutaway';
import { Transfers } from './pages/Transfers';
import { StockCounts } from './pages/StockCounts';
import { ApprovalInbox } from './pages/ApprovalInbox';
import { Reports } from './pages/Reports';
import { AuditLogs } from './pages/AuditLogs';
import { UsersManagement } from './pages/UsersManagement';
import { Login } from './pages/Login';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
        Loading Apex ERP Environment...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden transition-colors duration-150">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-100/70 dark:bg-slate-950 transition-colors duration-150">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        }
      />
      <Route
        path="/hierarchy"
        element={
          <ProtectedLayout>
            <WarehouseHierarchy />
          </ProtectedLayout>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedLayout>
            <Products />
          </ProtectedLayout>
        }
      />
      <Route
        path="/balances"
        element={
          <ProtectedLayout>
            <InventoryBalances />
          </ProtectedLayout>
        }
      />
      <Route
        path="/ledger"
        element={
          <ProtectedLayout>
            <StockLedger />
          </ProtectedLayout>
        }
      />
      <Route
        path="/procurement"
        element={
          <ProtectedLayout>
            <Procurement />
          </ProtectedLayout>
        }
      />
      <Route
        path="/receiving"
        element={
          <ProtectedLayout>
            <ReceivingPutaway />
          </ProtectedLayout>
        }
      />
      <Route
        path="/transfers"
        element={
          <ProtectedLayout>
            <Transfers />
          </ProtectedLayout>
        }
      />
      <Route
        path="/stock-counts"
        element={
          <ProtectedLayout>
            <StockCounts />
          </ProtectedLayout>
        }
      />
      <Route
        path="/approvals"
        element={
          <ProtectedLayout>
            <ApprovalInbox />
          </ProtectedLayout>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedLayout>
            <Reports />
          </ProtectedLayout>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedLayout>
            <AuditLogs />
          </ProtectedLayout>
        }
      />
      <Route path="/audit-logs" element={<Navigate to="/audit" replace />} />
      <Route
        path="/users"
        element={
          <ProtectedLayout>
            <UsersManagement />
          </ProtectedLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

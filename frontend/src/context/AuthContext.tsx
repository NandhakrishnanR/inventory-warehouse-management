import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (...permissions: string[]) => boolean;
  hasRole: (...roles: string[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('erp_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('erp_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data);
      localStorage.setItem('erp_user', JSON.stringify(res.data.data));
    } catch (err) {
      logout();
    }
  }, [token]);

  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.data);
        localStorage.setItem('erp_user', JSON.stringify(res.data.data));
      } catch (err) {
        logout();
      } finally {
        setIsLoading(false);
      }
    };
    verifyUser();
  }, [token]);

  const login = async (usernameOrEmail: string, password: string) => {
    const res = await api.post('/auth/login', { usernameOrEmail, password });
    const { token: receivedToken, user: receivedUser } = res.data.data;
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('erp_token', receivedToken);
    localStorage.setItem('erp_user', JSON.stringify(receivedUser));

    // Invalidate and reset all queries for new user session
    queryClient.clear();
    await queryClient.invalidateQueries();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    queryClient.clear();
  };

  // RBAC & Permission Helper Checks
  const hasRole = useCallback((...roles: string[]): boolean => {
    if (!user || !user.roles) return false;
    if (user.roles.includes('ADMIN')) return true;
    return roles.some((role) => user.roles.includes(role));
  }, [user]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    // Admins implicitly possess all permissions
    if (user.roles && user.roles.includes('ADMIN')) return true;
    if (!user.permissions) return false;
    return user.permissions.includes(permission);
  }, [user]);

  const hasAnyPermission = useCallback((...permissions: string[]): boolean => {
    if (!user) return false;
    if (user.roles && user.roles.includes('ADMIN')) return true;
    if (!user.permissions) return false;
    return permissions.some((p) => user.permissions?.includes(p));
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isLoading,
        hasPermission,
        hasAnyPermission,
        hasRole,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

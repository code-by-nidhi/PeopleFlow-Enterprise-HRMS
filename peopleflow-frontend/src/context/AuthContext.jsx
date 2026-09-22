import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tokenStore, refreshSession, onSessionExpired } from '../api/client';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // status: 'loading' until the refresh cookie has been checked
  const [state, setState] = useState({ status: 'loading', user: null, employee: null });

  const signOutLocally = useCallback(() => {
    tokenStore.set(null);
    setState({ status: 'unauthenticated', user: null, employee: null });
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await authApi.me();
      const { user, employee } = res.data.data;
      setState((prev) => ({ ...prev, status: 'authenticated', user, employee }));
      return res.data.data;
    } catch {
      return null;
    }
  }, []);

  // Restore the session from the httpOnly refresh cookie on first load
  useEffect(() => {
    let active = true;
    onSessionExpired(signOutLocally);

    refreshSession()
      .then((data) => {
        if (!active) return;
        setState({ status: 'authenticated', user: data.user, employee: null });
        loadProfile();
      })
      .catch(() => active && signOutLocally());

    return () => {
      active = false;
    };
  }, [loadProfile, signOutLocally]);

  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    const { user, accessToken } = res.data.data;
    tokenStore.set(accessToken);
    setState({ status: 'authenticated', user, employee: null });
    loadProfile();
    return res.data.data;
  }, [loadProfile]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      signOutLocally();
    }
  }, [signOutLocally]);

  const updateUser = useCallback((patch) => {
    setState((prev) => ({ ...prev, user: prev.user ? { ...prev.user, ...patch } : prev.user }));
  }, []);

  const value = useMemo(() => ({
    ...state,
    isAuthenticated: state.status === 'authenticated',
    login,
    logout,
    refreshProfile: loadProfile,
    updateUser,
  }), [state, login, logout, loadProfile, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

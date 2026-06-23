import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

export const AuthContext = createContext({});

const STORAGE_KEY = 'yora_user';

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return !payload.exp || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function readStoredUser() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    if (!parsed?.token || isTokenExpired(parsed.token)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const api = import.meta.env.VITE_API;

  const [user, setUser] = useState(() => readStoredUser());
  const [company, setCompany] = useState(null);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setCompany(null);
  }, []);

  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = new Headers(options.headers || {});
      if (user?.token) {
        headers.set('Authorization', `Bearer ${user.token}`);
      }

      const response = await fetch(url, { ...options, headers });

      if (response.status === 401) {
        logout();
        window.location.assign('/login');
      }

      return response;
    },
    [user?.token, logout]
  );

  useEffect(() => {
    if (!user?.token) {
      setCompany(null);
      return;
    }

    authFetch(`${api}/masters/company`, { method: 'POST' })
      .then((response) => response.json())
      .then((data) => {
        if (data.status === 'success') {
          setCompany(data.data ?? null);
        }
      })
      .catch(() => setCompany(null));
  }, [api, authFetch, user?.token]);

  const login = useCallback(
    async (userId, password) => {
      const fd = new FormData();
      fd.append('user_id', userId);
      fd.append('password', password);

      const response = await fetch(`${api}/auth/login`, {
        method: 'POST',
        body: fd,
      });

      const data = await response.json();

      if (data.status !== 'success') {
        throw new Error(data.message || 'Invalid user ID or password.');
      }

      const nextUser = {
        userId: data.data.user_id,
        name: data.data.name || data.data.user_id,
        token: data.data.access_token,
      };

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      return nextUser;
    },
    [api]
  );

  const value = useMemo(
    () => ({
      api,
      user,
      company,
      isAuthenticated: !!user?.token && !isTokenExpired(user.token),
      login,
      logout,
      authFetch,
    }),
    [api, user, company, login, logout, authFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

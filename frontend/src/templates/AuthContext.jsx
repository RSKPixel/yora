import React, { createContext, useCallback, useMemo, useState } from 'react';

export const AuthContext = createContext({});

const STORAGE_KEY = 'yora_user';

export const AuthProvider = ({ children }) => {
  const api = import.meta.env.VITE_API;

  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

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
      };

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      return nextUser;
    },
    [api]
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      api,
      user,
      isAuthenticated: !!user,
      login,
      logout,
    }),
    [api, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

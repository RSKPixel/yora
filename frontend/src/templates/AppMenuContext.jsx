import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AuthContext from "./AuthContext";
import { DEFAULT_APP_MENU, flattenMenuItems } from "../config/appMenu";

export const AppMenuContext = createContext({
  menu: DEFAULT_APP_MENU,
  menuItems: flattenMenuItems(DEFAULT_APP_MENU),
  loading: true,
  error: null,
  reload: () => {},
});

function normalizeMenu(data) {
  if (!data || typeof data !== "object") return DEFAULT_APP_MENU;

  const topLevel = Array.isArray(data.topLevel) ? data.topLevel : [];
  const sections = Array.isArray(data.sections) ? data.sections : [];

  return {
    topLevel: topLevel.filter((item) => item?.label && item?.path),
    sections: sections
      .filter((section) => section?.label)
      .map((section) => ({
        label: section.label,
        icon: section.icon || "bi-circle",
        items: Array.isArray(section.items)
          ? section.items.filter((item) => item?.label && item?.path)
          : [],
      })),
  };
}

export function AppMenuProvider({ children }) {
  const { api, authFetch, isAuthenticated } = useContext(AuthContext);
  const [menu, setMenu] = useState(DEFAULT_APP_MENU);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMenu = useCallback(async () => {
    if (!isAuthenticated) {
      setMenu(DEFAULT_APP_MENU);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(`${api}/settings/nav-menu`, { method: "POST" });
      const data = await response.json();

      if (data.status === "success" && data.data) {
        setMenu(normalizeMenu(data.data));
      } else {
        setMenu(DEFAULT_APP_MENU);
        setError(data.message || "Unable to load navigation menu.");
      }
    } catch {
      setMenu(DEFAULT_APP_MENU);
      setError("Unable to load navigation menu.");
    } finally {
      setLoading(false);
    }
  }, [api, authFetch, isAuthenticated]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const menuItems = useMemo(() => flattenMenuItems(menu), [menu]);

  const value = useMemo(
    () => ({
      menu,
      menuItems,
      loading,
      error,
      reload: loadMenu,
    }),
    [menu, menuItems, loading, error, loadMenu]
  );

  return <AppMenuContext.Provider value={value}>{children}</AppMenuContext.Provider>;
}

export function useAppMenu() {
  return useContext(AppMenuContext);
}

export default AppMenuContext;

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AuthContext from "./AuthContext";
import { applyRootFontSize } from "../config/rootFontSize";
import {
  ROOT_FONT_SIZE_MAX,
  ROOT_FONT_SIZE_MIN,
  ROOT_FONT_SIZE_STEP,
  defaultUserPreferences,
  normalizeUserPreferences,
} from "../config/userPreferences";

export const UserPreferencesContext = createContext({
  loading: true,
  saving: false,
  menuStyle: defaultUserPreferences().menu_style,
  setMenuStyle: () => {},
  rootFontSize: defaultUserPreferences().root_font_size,
  setRootFontSize: () => {},
  increaseRootFontSize: () => {},
  decreaseRootFontSize: () => {},
  canIncreaseRootFontSize: false,
  canDecreaseRootFontSize: false,
  quickAccessVisible: defaultUserPreferences().dashboard_quick_access_visible,
  setQuickAccessVisible: () => {},
  dashboardSearchVisible: defaultUserPreferences().dashboard_search_visible,
  setDashboardSearchVisible: () => {},
});

export function UserPreferencesProvider({ children }) {
  const { api, authFetch, isAuthenticated } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState(defaultUserPreferences);
  const loadedRef = useRef(false);

  useEffect(() => {
    applyRootFontSize(preferences.root_font_size);
  }, [preferences.root_font_size]);

  const persistPreferences = useCallback(
    async (patch) => {
      if (!isAuthenticated) return null;

      setSaving(true);
      try {
        const fd = new FormData();
        Object.entries(patch).forEach(([key, value]) => {
          fd.append(key, String(value));
        });

        const response = await authFetch(`${api}/settings/preferences/update`, {
          method: "POST",
          body: fd,
        });
        const data = await response.json();

        if (data.status === "success" && data.data) {
          const normalized = normalizeUserPreferences(data.data);
          setPreferences(normalized);
          return normalized;
        }

        return null;
      } catch {
        return null;
      } finally {
        setSaving(false);
      }
    },
    [api, authFetch, isAuthenticated]
  );

  const loadPreferences = useCallback(async () => {
    if (!isAuthenticated) {
      setPreferences(defaultUserPreferences());
      setLoading(false);
      loadedRef.current = false;
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(`${api}/settings/preferences`, { method: "POST" });
      const data = await response.json();

      if (data.status === "success" && data.data) {
        setPreferences(normalizeUserPreferences(data.data));
        loadedRef.current = true;
      }
    } catch {
      setPreferences(defaultUserPreferences());
    } finally {
      setLoading(false);
    }
  }, [api, authFetch, isAuthenticated]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const setMenuStyle = useCallback(
    (style) => {
      const normalized = normalizeUserPreferences({ ...preferences, menu_style: style });
      setPreferences(normalized);
      persistPreferences({ menu_style: normalized.menu_style });
    },
    [preferences, persistPreferences]
  );

  const setRootFontSize = useCallback(
    (size) => {
      const normalized = normalizeUserPreferences({ ...preferences, root_font_size: size });
      setPreferences(normalized);
      persistPreferences({ root_font_size: normalized.root_font_size });
    },
    [preferences, persistPreferences]
  );

  const increaseRootFontSize = useCallback(() => {
    if (preferences.root_font_size >= ROOT_FONT_SIZE_MAX) return;
    setRootFontSize(preferences.root_font_size + ROOT_FONT_SIZE_STEP);
  }, [preferences.root_font_size, setRootFontSize]);

  const decreaseRootFontSize = useCallback(() => {
    if (preferences.root_font_size <= ROOT_FONT_SIZE_MIN) return;
    setRootFontSize(preferences.root_font_size - ROOT_FONT_SIZE_STEP);
  }, [preferences.root_font_size, setRootFontSize]);

  const setQuickAccessVisible = useCallback(
    (visible) => {
      const normalized = normalizeUserPreferences({
        ...preferences,
        dashboard_quick_access_visible: visible,
      });
      setPreferences(normalized);
      persistPreferences({
        dashboard_quick_access_visible: normalized.dashboard_quick_access_visible,
      });
    },
    [preferences, persistPreferences]
  );

  const setDashboardSearchVisible = useCallback(
    (visible) => {
      const normalized = normalizeUserPreferences({
        ...preferences,
        dashboard_search_visible: visible,
      });
      setPreferences(normalized);
      persistPreferences({
        dashboard_search_visible: normalized.dashboard_search_visible,
      });
    },
    [preferences, persistPreferences]
  );

  const value = useMemo(
    () => ({
      loading,
      saving,
      menuStyle: preferences.menu_style,
      setMenuStyle,
      rootFontSize: preferences.root_font_size,
      setRootFontSize,
      increaseRootFontSize,
      decreaseRootFontSize,
      canIncreaseRootFontSize: preferences.root_font_size < ROOT_FONT_SIZE_MAX,
      canDecreaseRootFontSize: preferences.root_font_size > ROOT_FONT_SIZE_MIN,
      quickAccessVisible: preferences.dashboard_quick_access_visible,
      setQuickAccessVisible,
      dashboardSearchVisible: preferences.dashboard_search_visible,
      setDashboardSearchVisible,
    }),
    [
      loading,
      saving,
      preferences,
      setMenuStyle,
      setRootFontSize,
      increaseRootFontSize,
      decreaseRootFontSize,
      setQuickAccessVisible,
      setDashboardSearchVisible,
    ]
  );

  return (
    <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  return useContext(UserPreferencesContext);
}

export default UserPreferencesContext;

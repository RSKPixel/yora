import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import AuthContext from "../templates/AuthContext";
import { flattenMenuItems } from "../config/appMenu";
import {
  DEFAULT_QUICK_ACCESS_PATHS,
  getAvailableQuickAccessItems,
  resolveQuickAccessItems,
} from "../config/quickAccess";

export function useQuickAccess() {
  const { api, authFetch } = useContext(AuthContext);
  const menuItems = useMemo(() => flattenMenuItems(), []);
  const [paths, setPathsState] = useState(DEFAULT_QUICK_ACCESS_PATHS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadPaths = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(`${api}/settings/quick-access`, { method: "POST" });
      const data = await response.json();

      if (data.status === "success" && Array.isArray(data.data)) {
        setPathsState(data.data);
      } else {
        setError(data.message || "Unable to load quick access settings.");
      }
    } catch {
      setError("Unable to load quick access settings.");
    } finally {
      setLoading(false);
    }
  }, [api, authFetch]);

  useEffect(() => {
    loadPaths();
  }, [loadPaths]);

  const persistPaths = useCallback(
    async (nextPaths) => {
      setSaving(true);
      setError(null);

      try {
        const fd = new FormData();
        fd.append("paths", JSON.stringify(nextPaths));

        const response = await authFetch(`${api}/settings/quick-access/update`, {
          method: "POST",
          body: fd,
        });
        const data = await response.json();

        if (data.status === "success" && Array.isArray(data.data)) {
          setPathsState(data.data);
          return true;
        }

        setError(data.message || "Unable to save quick access settings.");
        return false;
      } catch {
        setError("Unable to save quick access settings.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [api, authFetch]
  );

  const items = useMemo(
    () => resolveQuickAccessItems(paths, menuItems),
    [paths, menuItems]
  );

  const availableToAdd = useMemo(
    () => getAvailableQuickAccessItems(paths, menuItems),
    [paths, menuItems]
  );

  const setPaths = useCallback(
    (nextPaths) => {
      persistPaths(nextPaths);
    },
    [persistPaths]
  );

  const addPath = useCallback(
    (path) => {
      if (!path || paths.includes(path)) return;
      setPaths([...paths, path]);
    },
    [paths, setPaths]
  );

  const removePath = useCallback(
    (path) => {
      setPaths(paths.filter((entry) => entry !== path));
    },
    [paths, setPaths]
  );

  const movePath = useCallback(
    (path, direction) => {
      const index = paths.indexOf(path);
      if (index === -1) return;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= paths.length) return;

      const nextPaths = [...paths];
      [nextPaths[index], nextPaths[targetIndex]] = [
        nextPaths[targetIndex],
        nextPaths[index],
      ];
      setPaths(nextPaths);
    },
    [paths, setPaths]
  );

  const resetToDefaults = useCallback(() => {
    setPaths([...DEFAULT_QUICK_ACCESS_PATHS]);
  }, [setPaths]);

  return {
    items,
    paths,
    availableToAdd,
    loading,
    saving,
    error,
    reload: loadPaths,
    addPath,
    removePath,
    movePath,
    resetToDefaults,
  };
}

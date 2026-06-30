import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  MENU_STYLE_MODERN,
  MENU_STYLE_STORAGE_KEY,
  normalizeMenuStyle,
  readStoredMenuStyle,
} from "../config/menuStyle";

export const MenuStyleContext = createContext({
  menuStyle: MENU_STYLE_MODERN,
  setMenuStyle: () => {},
});

export function MenuStyleProvider({ children }) {
  const [menuStyle, setMenuStyleState] = useState(readStoredMenuStyle);

  const setMenuStyle = useCallback((style) => {
    const normalized = normalizeMenuStyle(style);
    window.localStorage.setItem(MENU_STYLE_STORAGE_KEY, normalized);
    setMenuStyleState(normalized);
  }, []);

  const value = useMemo(
    () => ({
      menuStyle,
      setMenuStyle,
    }),
    [menuStyle, setMenuStyle]
  );

  return <MenuStyleContext.Provider value={value}>{children}</MenuStyleContext.Provider>;
}

export function useMenuStyle() {
  return useContext(MenuStyleContext);
}

export default MenuStyleContext;

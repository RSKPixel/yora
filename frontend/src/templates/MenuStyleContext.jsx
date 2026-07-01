import { useUserPreferences } from "./UserPreferencesContext";

export function MenuStyleProvider({ children }) {
  return children;
}

export function useMenuStyle() {
  const { menuStyle, setMenuStyle } = useUserPreferences();
  return { menuStyle, setMenuStyle };
}

export default MenuStyleProvider;

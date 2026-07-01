import { useUserPreferences } from "./UserPreferencesContext";

export function QuickAccessVisibilityProvider({ children }) {
  return children;
}

export function useQuickAccessVisibility() {
  const { quickAccessVisible, setQuickAccessVisible } = useUserPreferences();
  return { quickAccessVisible, setQuickAccessVisible };
}

export default QuickAccessVisibilityProvider;

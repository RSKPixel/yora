import { useUserPreferences } from "./UserPreferencesContext";

export function RootFontSizeProvider({ children }) {
  return children;
}

export function useRootFontSize() {
  const {
    rootFontSize,
    setRootFontSize,
    increaseRootFontSize,
    decreaseRootFontSize,
    canIncreaseRootFontSize,
    canDecreaseRootFontSize,
  } = useUserPreferences();

  return {
    rootFontSize,
    setRootFontSize,
    increaseRootFontSize,
    decreaseRootFontSize,
    canIncreaseRootFontSize,
    canDecreaseRootFontSize,
  };
}

export default RootFontSizeProvider;

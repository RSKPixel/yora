import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ROOT_FONT_SIZE_DEFAULT,
  ROOT_FONT_SIZE_MAX,
  ROOT_FONT_SIZE_MIN,
  ROOT_FONT_SIZE_STEP,
  applyRootFontSize,
  readStoredRootFontSize,
  writeStoredRootFontSize,
} from "../config/rootFontSize";

export const RootFontSizeContext = createContext({
  rootFontSize: ROOT_FONT_SIZE_DEFAULT,
  setRootFontSize: () => {},
  increaseRootFontSize: () => {},
  decreaseRootFontSize: () => {},
  canIncreaseRootFontSize: false,
  canDecreaseRootFontSize: false,
});

export function RootFontSizeProvider({ children }) {
  const [rootFontSize, setRootFontSizeState] = useState(readStoredRootFontSize);

  useEffect(() => {
    applyRootFontSize(rootFontSize);
  }, [rootFontSize]);

  const setRootFontSize = useCallback((size) => {
    setRootFontSizeState(writeStoredRootFontSize(size));
  }, []);

  const increaseRootFontSize = useCallback(() => {
    setRootFontSizeState((current) => writeStoredRootFontSize(current + ROOT_FONT_SIZE_STEP));
  }, []);

  const decreaseRootFontSize = useCallback(() => {
    setRootFontSizeState((current) => writeStoredRootFontSize(current - ROOT_FONT_SIZE_STEP));
  }, []);

  const value = useMemo(
    () => ({
      rootFontSize,
      setRootFontSize,
      increaseRootFontSize,
      decreaseRootFontSize,
      canIncreaseRootFontSize: rootFontSize < ROOT_FONT_SIZE_MAX,
      canDecreaseRootFontSize: rootFontSize > ROOT_FONT_SIZE_MIN,
    }),
    [rootFontSize, setRootFontSize, increaseRootFontSize, decreaseRootFontSize]
  );

  return <RootFontSizeContext.Provider value={value}>{children}</RootFontSizeContext.Provider>;
}

export function useRootFontSize() {
  return useContext(RootFontSizeContext);
}

export default RootFontSizeContext;

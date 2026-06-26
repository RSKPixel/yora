import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const SpotlightContext = createContext(null);

export function SpotlightProvider({ children }) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const inlineFocusRef = useRef(null);

  const registerInlineFocus = useCallback((focusFn) => {
    inlineFocusRef.current = focusFn;
    return () => {
      if (inlineFocusRef.current === focusFn) {
        inlineFocusRef.current = null;
      }
    };
  }, []);

  const openSpotlight = useCallback(() => {
    if (inlineFocusRef.current) {
      inlineFocusRef.current();
      return;
    }
    setOverlayOpen(true);
  }, []);

  const closeOverlay = useCallback(() => setOverlayOpen(false), []);

  const toggleOverlay = useCallback(() => {
    if (inlineFocusRef.current) {
      inlineFocusRef.current();
      return;
    }
    setOverlayOpen((open) => !open);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;
      e.preventDefault();
      toggleOverlay();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleOverlay]);

  return (
    <SpotlightContext.Provider
      value={{ openSpotlight, registerInlineFocus, overlayOpen, closeOverlay }}
    >
      {children}
    </SpotlightContext.Provider>
  );
}

export function useSpotlight() {
  const context = useContext(SpotlightContext);
  if (!context) {
    throw new Error("useSpotlight must be used within SpotlightProvider");
  }
  return context;
}

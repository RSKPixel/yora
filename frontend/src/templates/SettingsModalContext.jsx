import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import SettingsModal from "../components/SettingsModal";

export const SETTINGS_TABS = [
  { id: "general", label: "General", icon: "bi-sliders" },
  { id: "profile", label: "Profile", icon: "bi-person-circle" },
  { id: "password", label: "Password", icon: "bi-shield-lock" },
  { id: "quick-access", label: "Quick Access", icon: "bi-grid" },
];

export const VALID_SETTINGS_TABS = new Set(SETTINGS_TABS.map((tab) => tab.id));

const SettingsModalContext = createContext({
  isOpen: false,
  activeTab: "general",
  openSettings: () => {},
  closeSettings: () => {},
  setActiveTab: () => {},
});

function normalizeTab(tab) {
  return VALID_SETTINGS_TABS.has(tab) ? tab : "general";
}

export function SettingsModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState("general");

  const openSettings = useCallback((tab = "general") => {
    setActiveTabState(normalizeTab(tab));
    setIsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setIsOpen(false);
  }, []);

  const setActiveTab = useCallback((tab) => {
    setActiveTabState(normalizeTab(tab));
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      activeTab,
      openSettings,
      closeSettings,
      setActiveTab,
    }),
    [isOpen, activeTab, openSettings, closeSettings, setActiveTab]
  );

  return (
    <SettingsModalContext.Provider value={value}>
      {children}
      <SettingsModal
        open={isOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onClose={closeSettings}
      />
    </SettingsModalContext.Provider>
  );
}

export function useSettingsModal() {
  return useContext(SettingsModalContext);
}

export default SettingsModalContext;

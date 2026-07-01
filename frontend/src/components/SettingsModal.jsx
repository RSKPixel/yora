import React, { useEffect } from "react";
import { SettingsPanel } from "../pages/Settings";

const SettingsModal = ({ open, activeTab, setActiveTab, onClose }) => {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="page-modal-overlay settings-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="page-modal settings-modal">
        <div className="page-modal-header">
          <span id="settings-modal-title" className="page-modal-title flex items-center gap-2">
            <span className="page-card-title-icon" aria-hidden="true">
              <i className="bi bi-gear" />
            </span>
            Settings
          </span>
          <button
            type="button"
            className="page-modal-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <SettingsPanel activeTab={activeTab} onActiveTabChange={setActiveTab} />
      </div>
    </div>
  );
};

export default SettingsModal;

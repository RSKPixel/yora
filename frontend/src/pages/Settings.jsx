import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MENU_STYLE_OPTIONS } from "../config/menuStyle";
import { useQuickAccess } from "../hooks/useQuickAccess";
import { useUserProfile } from "../hooks/useUserProfile";
import { useMenuStyle } from "../templates/MenuStyleContext";
import { useQuickAccessVisibility } from "../templates/QuickAccessVisibilityContext";
import { useUserPreferences } from "../templates/UserPreferencesContext";
import { useRootFontSize } from "../templates/RootFontSizeContext";
import {
  SETTINGS_TABS,
  useSettingsModal,
} from "../templates/SettingsModalContext";

function MasterFormField({ label, icon, children, className = "" }) {
  return (
    <div className={`page-master-form-field ${className}`.trim()}>
      <label className="page-form-label">{label}</label>
      <div className="page-field-wrap">
        <span className="page-field-icon" aria-hidden="true">
          <i className={`bi ${icon}`} />
        </span>
        {children}
      </div>
    </div>
  );
}

function MasterFormMessage({ type, message }) {
  if (!message) return null;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm normal-case tracking-normal ${
        type === "success"
          ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-400"
          : "border-red-500/30 bg-red-950/20 text-red-400"
      }`}
    >
      <i
        className={`bi mt-0.5 shrink-0 ${
          type === "success" ? "bi-check-circle" : "bi-exclamation-circle"
        }`}
        aria-hidden="true"
      />
      <span>{message}</span>
    </div>
  );
}

function QuickAccessTab() {
  const {
    items,
    paths,
    availableToAdd,
    loading,
    saving,
    error,
    addPath,
    removePath,
    movePath,
    resetToDefaults,
  } = useQuickAccess();
  const [selectedPath, setSelectedPath] = useState("");

  const handleAdd = () => {
    if (!selectedPath) return;
    addPath(selectedPath);
    setSelectedPath("");
  };

  return (
    <section className="settings-section" aria-labelledby="quick-access-heading">
      <div className="settings-section-header">
        <div>
          <h2 id="quick-access-heading" className="settings-section-title">
            Quick Access
          </h2>
          <p className="settings-section-desc">
            Choose modules shown in the dashboard dock for all users. Order top to bottom
            matches left to right on the dock.
          </p>
        </div>
        <button
          type="button"
          className="settings-reset-btn"
          disabled={loading || saving}
          onClick={resetToDefaults}
        >
          Reset defaults
        </button>
      </div>

      {error && <p className="settings-error">{error}</p>}
      {saving && <p className="settings-note">Saving…</p>}

      {loading ? (
        <p className="settings-empty">Loading quick access…</p>
      ) : items.length === 0 ? (
        <p className="settings-empty">No quick access items. Add one below.</p>
      ) : (
        <ul className="settings-quick-list">
          {items.map((item, index) => (
            <li key={item.path} className="settings-quick-item">
              <span className="settings-quick-icon" aria-hidden="true">
                <i className={`bi ${item.icon}`} />
              </span>
              <div className="settings-quick-copy">
                <span className="settings-quick-label">{item.label}</span>
                <span className="settings-quick-section">{item.section}</span>
              </div>
              <div className="settings-quick-actions">
                <button
                  type="button"
                  className="settings-icon-btn"
                  title="Move left"
                  disabled={loading || saving || index === 0}
                  onClick={() => movePath(item.path, "up")}
                >
                  <i className="bi bi-chevron-left" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="settings-icon-btn"
                  title="Move right"
                  disabled={loading || saving || index === items.length - 1}
                  onClick={() => movePath(item.path, "down")}
                >
                  <i className="bi bi-chevron-right" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="settings-icon-btn settings-icon-btn-danger"
                  title="Remove"
                  disabled={loading || saving}
                  onClick={() => removePath(item.path)}
                >
                  <i className="bi bi-trash" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="settings-add-row">
        <select
          className="settings-select"
          value={selectedPath}
          disabled={loading || saving}
          onChange={(event) => setSelectedPath(event.target.value)}
          aria-label="Module to add"
        >
          <option value="">Add a module…</option>
          {availableToAdd.map((item) => (
            <option key={item.path} value={item.path}>
              {item.section} — {item.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="settings-add-btn"
          disabled={!selectedPath || loading || saving}
          onClick={handleAdd}
        >
          Add
        </button>
      </div>

      {availableToAdd.length === 0 && paths.length > 0 && (
        <p className="settings-note">All available modules are already in quick access.</p>
      )}
    </section>
  );
}

function ProfileTab() {
  const {
    profile,
    loading,
    saving,
    error,
    success,
    setError,
    saveProfile,
  } = useUserProfile();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [previewPic, setPreviewPic] = useState("");
  const [pendingPic, setPendingPic] = useState("");
  const [removeProfilePic, setRemoveProfilePic] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (loading) return;
    setName(profile.name || "");
    setEmail(profile.email || "");
    setPhone(profile.phone || "");
    setPreviewPic(profile.profile_pic || "");
    setPendingPic("");
    setRemoveProfilePic(false);
  }, [loading, profile]);

  const handlePicChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > 1_048_576) {
      setError("Profile picture must be 1 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setPreviewPic(result);
      setPendingPic(result);
      setRemoveProfilePic(false);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePic = () => {
    setPreviewPic("");
    setPendingPic("");
    setRemoveProfilePic(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    await saveProfile({
      name,
      email,
      phone,
      profilePic: pendingPic,
      removeProfilePic,
    });
  };

  const avatarInitial = (name || profile.user_id || "?").charAt(0).toUpperCase();
  const profileFeedback = error || success;

  if (loading) {
    return <p className="settings-empty text-xs">Loading profile…</p>;
  }

  if (error && !profile.user_id) {
    return <MasterFormMessage type="error" message={error} />;
  }

  return (
    <form className="page-master-form" onSubmit={handleSaveProfile} autoComplete="off">
      <div className="page-master-form-body">
        <div className="page-master-form-fields">
          <div className="page-master-form-grid">
            <div className="page-master-form-field page-master-form-field-full">
              <label className="page-form-label">Profile picture</label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="profile-avatar-wrap">
                  {previewPic ? (
                    <img src={previewPic} alt="" className="profile-avatar-image" />
                  ) : (
                    <span className="profile-avatar-fallback" aria-hidden="true">
                      {avatarInitial}
                    </span>
                  )}
                </div>
                <div className="settings-profile-actions flex flex-wrap items-center gap-2">
                  <label className="btn btn-secondary cursor-pointer">
                    <i className="bi bi-upload" aria-hidden="true" />
                    Change photo
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={saving}
                      autoComplete="off"
                      onChange={handlePicChange}
                    />
                  </label>
                  {(previewPic || profile.profile_pic) && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={saving}
                      onClick={handleRemovePic}
                    >
                      <i className="bi bi-trash" aria-hidden="true" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <MasterFormField label="User ID" icon="bi-person-badge">
              <input
                type="text"
                className="page-field-input w-full min-w-0"
                value={profile.user_id}
                disabled
                autoComplete="off"
              />
            </MasterFormField>

            <MasterFormField label="Name *" icon="bi-person">
              <input
                type="text"
                className="page-field-input w-full min-w-0"
                value={name}
                disabled={saving}
                onChange={(event) => setName(event.target.value)}
                required
                autoComplete="off"
              />
            </MasterFormField>

            <MasterFormField label="Email" icon="bi-envelope">
              <input
                type="email"
                className="page-field-input w-full min-w-0"
                value={email}
                disabled={saving}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="off"
              />
            </MasterFormField>

            <MasterFormField label="Phone" icon="bi-telephone">
              <input
                type="tel"
                className="page-field-input w-full min-w-0"
                value={phone}
                disabled={saving}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="off"
              />
            </MasterFormField>
          </div>

          {profileFeedback && (
            <MasterFormMessage
              type={error ? "error" : "success"}
              message={profileFeedback}
            />
          )}
        </div>
      </div>

      <div className="page-master-form-actions">
        <button type="submit" className="btn btn-success" disabled={saving}>
          <i className="bi bi-check-lg" aria-hidden="true" />
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

function PasswordTab() {
  const {
    passwordSaving,
    error,
    success,
    setError,
    setSuccess,
    changePassword,
  } = useUserProfile();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    const saved = await changePassword({ currentPassword, newPassword });
    if (saved) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const feedback = error || success;

  return (
    <form className="page-master-form" onSubmit={handleChangePassword} autoComplete="off">
      <div className="page-master-form-body">
        <div className="page-master-form-fields">
          <div className="page-master-form-grid">
            <MasterFormField
              label="Current password"
              icon="bi-key"
              className="page-master-form-field-full"
            >
              <input
                type="password"
                className="page-field-input w-full min-w-0"
                value={currentPassword}
                disabled={passwordSaving}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="off"
              />
            </MasterFormField>

            <MasterFormField label="New password" icon="bi-shield-lock">
              <input
                type="password"
                className="page-field-input w-full min-w-0"
                value={newPassword}
                disabled={passwordSaving}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="off"
              />
            </MasterFormField>

            <MasterFormField label="Confirm new password" icon="bi-shield-check">
              <input
                type="password"
                className="page-field-input w-full min-w-0"
                value={confirmPassword}
                disabled={passwordSaving}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="off"
              />
            </MasterFormField>
          </div>

          {feedback && (
            <MasterFormMessage type={error ? "error" : "success"} message={feedback} />
          )}
        </div>
      </div>

      <div className="page-master-form-actions">
        <button type="submit" className="btn btn-success" disabled={passwordSaving}>
          <i className="bi bi-check-lg" aria-hidden="true" />
          {passwordSaving ? "Saving…" : "Update password"}
        </button>
      </div>
    </form>
  );
}

function GeneralTab() {
  const { menuStyle, setMenuStyle } = useMenuStyle();
  const { quickAccessVisible, setQuickAccessVisible } = useQuickAccessVisibility();
  const { dashboardSearchVisible, setDashboardSearchVisible } = useUserPreferences();
  const {
    rootFontSize,
    increaseRootFontSize,
    decreaseRootFontSize,
    canIncreaseRootFontSize,
    canDecreaseRootFontSize,
  } = useRootFontSize();

  return (
    <section className="settings-general" aria-label="General preferences">
      <div className="settings-general-list">
        <div className="settings-general-row">
          <span className="settings-general-label">Font size</span>
          <div className="settings-font-size-control">
            <button
              type="button"
              className="settings-font-size-btn"
              aria-label="Decrease font size"
              disabled={!canDecreaseRootFontSize}
              onClick={decreaseRootFontSize}
            >
              <i className="bi bi-dash-lg" aria-hidden="true" />
            </button>
            <span className="settings-font-size-value" aria-live="polite">
              {rootFontSize % 1 === 0 ? `${rootFontSize}px` : `${rootFontSize.toFixed(1)}px`}
            </span>
            <button
              type="button"
              className="settings-font-size-btn"
              aria-label="Increase font size"
              disabled={!canIncreaseRootFontSize}
              onClick={increaseRootFontSize}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="settings-general-row">
          <span className="settings-general-label">Menu style</span>
          <div className="settings-segment" role="radiogroup" aria-label="Navigation menu style">
            {MENU_STYLE_OPTIONS.map((option) => {
              const selected = menuStyle === option.id;

              return (
                <label
                  key={option.id}
                  className={`settings-segment-option${selected ? " settings-segment-option-active" : ""}`}
                  title={option.description}
                >
                  <input
                    type="radio"
                    name="menuStyle"
                    value={option.id}
                    checked={selected}
                    onChange={() => setMenuStyle(option.id)}
                    className="settings-segment-input"
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
        </div>

        <div className="settings-general-row">
          <span className="settings-general-label">Quick access menu</span>
          <button
            type="button"
            role="switch"
            aria-checked={quickAccessVisible}
            aria-label="Toggle dashboard quick access menu"
            className={`settings-switch${quickAccessVisible ? " settings-switch-on" : ""}`}
            onClick={() => setQuickAccessVisible(!quickAccessVisible)}
          >
            <span className="settings-switch-thumb" aria-hidden="true" />
          </button>
        </div>

        <div className="settings-general-row">
          <span className="settings-general-label">Dashboard search</span>
          <button
            type="button"
            role="switch"
            aria-checked={dashboardSearchVisible}
            aria-label="Toggle dashboard search module"
            className={`settings-switch${dashboardSearchVisible ? " settings-switch-on" : ""}`}
            onClick={() => setDashboardSearchVisible(!dashboardSearchVisible)}
          >
            <span className="settings-switch-thumb" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

export function SettingsPanel({ activeTab, onActiveTabChange }) {
  const { quickAccessVisible } = useQuickAccessVisibility();

  useEffect(() => {
    if (!quickAccessVisible && activeTab === "quick-access") {
      onActiveTabChange("general");
    }
  }, [quickAccessVisible, activeTab, onActiveTabChange]);

  const renderTab = () => {
    if (activeTab === "quick-access") return <QuickAccessTab />;
    if (activeTab === "profile") return <ProfileTab />;
    if (activeTab === "password") return <PasswordTab />;
    return <GeneralTab />;
  };

  return (
    <>
      <nav className="settings-tabs" aria-label="Settings sections">
        {SETTINGS_TABS.map((tab) => {
          const disabled = tab.id === "quick-access" && !quickAccessVisible;

          return (
            <button
              key={tab.id}
              type="button"
              className={`settings-tab${activeTab === tab.id ? " settings-tab-active" : ""}${disabled ? " settings-tab-disabled" : ""}`}
              aria-current={activeTab === tab.id ? "page" : undefined}
              aria-disabled={disabled || undefined}
              disabled={disabled}
              title={
                disabled
                  ? "Enable the dashboard quick access menu in General to configure items."
                  : undefined
              }
              onClick={() => onActiveTabChange(tab.id)}
            >
              <i className={`bi ${tab.icon}`} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="page-modal-body settings-body">
        <div className="settings-tab-panel">{renderTab()}</div>
      </div>
    </>
  );
}

export function SettingsRouteRedirect() {
  const { openSettings } = useSettingsModal();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    openSettings(searchParams.get("tab") || "general");

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/dashboard", { replace: true });
  }, [openSettings, navigate, searchParams]);

  return null;
}

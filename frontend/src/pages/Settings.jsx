import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardBackLink from "../components/DashboardBackLink";
import { MENU_STYLE_OPTIONS } from "../config/menuStyle";
import { useQuickAccess } from "../hooks/useQuickAccess";
import { useUserProfile } from "../hooks/useUserProfile";
import { useMenuStyle } from "../templates/MenuStyleContext";
import { useRootFontSize } from "../templates/RootFontSizeContext";
import {
  ROOT_FONT_SIZE_MAX,
  ROOT_FONT_SIZE_MIN,
  ROOT_FONT_SIZE_STEP,
} from "../config/rootFontSize";

const SETTINGS_TABS = [
  { id: "general", label: "General", icon: "bi-sliders" },
  { id: "profile", label: "Profile", icon: "bi-person-circle" },
  { id: "quick-access", label: "Quick Access", icon: "bi-grid" },
];

const VALID_TABS = new Set(SETTINGS_TABS.map((tab) => tab.id));

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
    passwordSaving,
    error,
    success,
    setError,
    setSuccess,
    saveProfile,
    changePassword,
  } = useUserProfile();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [previewPic, setPreviewPic] = useState("");
  const [pendingPic, setPendingPic] = useState("");
  const [removeProfilePic, setRemoveProfilePic] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    setSuccess(null);
    await saveProfile({
      name,
      email,
      phone,
      profilePic: pendingPic,
      removeProfilePic,
    });
  };

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

  const avatarInitial = (name || profile.user_id || "?").charAt(0).toUpperCase();

  return (
    <section className="settings-section" aria-labelledby="profile-heading">
      <div className="settings-section-header">
        <div>
          <h2 id="profile-heading" className="settings-section-title">
            User Profile
          </h2>
          <p className="settings-section-desc">
            Update your display name, contact details, profile picture, and password.
          </p>
        </div>
      </div>

      {error && <p className="settings-error">{error}</p>}
      {success && <p className="settings-success">{success}</p>}
      {(saving || passwordSaving) && <p className="settings-note">Saving…</p>}

      {loading ? (
        <p className="settings-empty">Loading profile…</p>
      ) : (
        <>
          <form className="settings-profile-form" onSubmit={handleSaveProfile} autoComplete="off">
            <div className="settings-profile-avatar-row">
              <div className="settings-profile-avatar-wrap">
                {previewPic ? (
                  <img
                    src={previewPic}
                    alt=""
                    className="settings-profile-avatar-image"
                  />
                ) : (
                  <span className="settings-profile-avatar-fallback" aria-hidden="true">
                    {avatarInitial}
                  </span>
                )}
              </div>
              <div className="settings-profile-avatar-actions">
                <label className="settings-profile-upload-btn">
                  Change photo
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="settings-profile-file-input"
                    disabled={saving}
                    onChange={handlePicChange}
                  />
                </label>
                {(previewPic || profile.profile_pic) && (
                  <button
                    type="button"
                    className="settings-reset-btn"
                    disabled={saving}
                    onClick={handleRemovePic}
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>

            <div className="settings-profile-grid">
              <label className="settings-profile-field">
                <span className="settings-profile-label">User ID</span>
                <input
                  type="text"
                  className="settings-profile-input"
                  value={profile.user_id}
                  disabled
                />
              </label>

              <label className="settings-profile-field">
                <span className="settings-profile-label">Name</span>
                <input
                  type="text"
                  className="settings-profile-input"
                  value={name}
                  disabled={saving}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>

              <label className="settings-profile-field">
                <span className="settings-profile-label">Email</span>
                <input
                  type="email"
                  className="settings-profile-input"
                  value={email}
                  disabled={saving}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="off"
                />
              </label>

              <label className="settings-profile-field">
                <span className="settings-profile-label">Phone</span>
                <input
                  type="tel"
                  className="settings-profile-input"
                  value={phone}
                  disabled={saving}
                  onChange={(event) => setPhone(event.target.value)}
                  autoComplete="off"
                />
              </label>
            </div>

            <button type="submit" className="settings-add-btn" disabled={saving}>
              Save profile
            </button>
          </form>

          <form className="settings-profile-form settings-profile-password" onSubmit={handleChangePassword} autoComplete="off">
            <h3 className="settings-profile-subtitle">Change password</h3>
            <div className="settings-profile-grid">
              <label className="settings-profile-field">
                <span className="settings-profile-label">Current password</span>
                <input
                  type="password"
                  className="settings-profile-input"
                  value={currentPassword}
                  disabled={passwordSaving}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="off"
                />
              </label>

              <label className="settings-profile-field">
                <span className="settings-profile-label">New password</span>
                <input
                  type="password"
                  className="settings-profile-input"
                  value={newPassword}
                  disabled={passwordSaving}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="off"
                />
              </label>

              <label className="settings-profile-field">
                <span className="settings-profile-label">Confirm new password</span>
                <input
                  type="password"
                  className="settings-profile-input"
                  value={confirmPassword}
                  disabled={passwordSaving}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="off"
                />
              </label>
            </div>

            <button type="submit" className="settings-add-btn" disabled={passwordSaving}>
              Update password
            </button>
          </form>
        </>
      )}
    </section>
  );
}

function GeneralTab() {
  const { menuStyle, setMenuStyle } = useMenuStyle();
  const {
    rootFontSize,
    increaseRootFontSize,
    decreaseRootFontSize,
    canIncreaseRootFontSize,
    canDecreaseRootFontSize,
  } = useRootFontSize();

  return (
    <section className="settings-section" aria-labelledby="general-heading">
      <div className="settings-section-header">
        <div>
          <h2 id="general-heading" className="settings-section-title">
            General
          </h2>
          <p className="settings-section-desc">
            Application preferences for this browser. Changes apply immediately.
          </p>
        </div>
      </div>

      <div className="settings-preference-block">
        <h3 className="settings-preference-title">Interface font size</h3>
        <p className="settings-preference-desc">
          Adjust the base text size across the app in {ROOT_FONT_SIZE_STEP}px steps (
          {ROOT_FONT_SIZE_MIN}px–{ROOT_FONT_SIZE_MAX}px).
        </p>

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

      <div className="settings-preference-block">
        <h3 className="settings-preference-title">Navigation menu style</h3>
        <p className="settings-preference-desc">
          Choose how the sidebar navigation is displayed.
        </p>

        <div className="settings-style-options" role="radiogroup" aria-label="Navigation menu style">
          {MENU_STYLE_OPTIONS.map((option) => {
            const selected = menuStyle === option.id;

            return (
              <label
                key={option.id}
                className={`settings-style-option${selected ? " settings-style-option-active" : ""}`}
              >
                <input
                  type="radio"
                  name="menuStyle"
                  value={option.id}
                  checked={selected}
                  onChange={() => setMenuStyle(option.id)}
                  className="settings-style-option-input"
                />
                <span className="settings-style-option-copy">
                  <span className="settings-style-option-label">{option.label}</span>
                  <span className="settings-style-option-desc">{option.description}</span>
                </span>
                {selected && (
                  <span className="settings-style-option-check" aria-hidden="true">
                    <i className="bi bi-check-lg" />
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = VALID_TABS.has(tabParam) ? tabParam : "general";

  const setActiveTab = (tabId) => {
    setSearchParams(tabId === "general" ? {} : { tab: tabId }, { replace: true });
  };

  const renderTab = () => {
    if (activeTab === "quick-access") return <QuickAccessTab />;
    if (activeTab === "profile") return <ProfileTab />;
    return <GeneralTab />;
  };

  return (
    <div className="page-card">
      <div className="page-card-header">
        <div>
          <h1 className="page-card-title">
            <span className="page-card-title-icon" aria-hidden="true">
              <i className="bi bi-gear" />
            </span>
            Settings
          </h1>
          <p className="page-card-subtitle">Personalize your workspace</p>
        </div>
        <DashboardBackLink />
      </div>

      <nav className="settings-tabs" aria-label="Settings sections">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`settings-tab${activeTab === tab.id ? " settings-tab-active" : ""}`}
            aria-current={activeTab === tab.id ? "page" : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={`bi ${tab.icon}`} aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="page-card-body settings-body">
        {renderTab()}
      </div>
    </div>
  );
};

export default Settings;

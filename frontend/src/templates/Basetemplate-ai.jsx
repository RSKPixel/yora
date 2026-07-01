import React, { useContext, useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthContext from "./AuthContext";
import { AppMenuProvider, useAppMenu } from "./AppMenuContext";
import { MenuStyleProvider, useMenuStyle } from "./MenuStyleContext";
import { RootFontSizeProvider } from "./RootFontSizeContext";
import AppShellNavModern from "../components/sidebar/AppShellNavModern";
import AppShellNavTree from "../components/sidebar/AppShellNavTree";
import SidebarMenuSearch from "../components/sidebar/SidebarMenuSearch";
import { findSectionLabelForPath, isPathActive } from "../components/sidebar/sidebarNav";
import { MENU_STYLE_LINUX_TREE } from "../config/menuStyle";
import { readSidebarPinned, writeSidebarPinned } from "../config/sidebarPin";
import AppIcon from "../components/AppIcon";
import SpotlightSearch from "../components/SpotlightSearch";
import { SpotlightProvider, useSpotlight } from "./SpotlightContext";

function getUserInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const BasetemplateAi = ({ children }) => {
  const { user, isAuthenticated, logout, company } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sidebarPinned, setSidebarPinned] = useState(readSidebarPinned);
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarPinned);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const toggleSidebarPin = () => {
    setSidebarPinned((pinned) => {
      const next = !pinned;
      writeSidebarPinned(next);
      if (next) {
        setSidebarOpen(true);
      }
      return next;
    });
  };

  return (
    <SpotlightProvider>
      <AppMenuProvider>
        <MenuStyleProvider>
          <RootFontSizeProvider>
          <BasetemplateShell
            user={user}
            company={company}
            isAuthenticated={isAuthenticated}
            sidebarOpen={sidebarOpen}
            sidebarPinned={sidebarPinned}
            setSidebarOpen={setSidebarOpen}
            onToggleSidebarPin={toggleSidebarPin}
            onLogout={handleLogout}
          >
            {children}
          </BasetemplateShell>
          </RootFontSizeProvider>
        </MenuStyleProvider>
      </AppMenuProvider>
    </SpotlightProvider>
  );
};

const BasetemplateShell = ({
  children,
  user,
  company,
  isAuthenticated,
  sidebarOpen,
  sidebarPinned,
  setSidebarOpen,
  onToggleSidebarPin,
  onLogout,
}) => {
  const { overlayOpen, closeOverlay } = useSpotlight();
  const { menu, loading: menuLoading } = useAppMenu();
  const { menuStyle } = useMenuStyle();
  const location = useLocation();
  const userInitials = useMemo(() => getUserInitials(user?.name), [user?.name]);
  const isDashboard = location.pathname === "/dashboard";
  const isTreeMenu = menuStyle === MENU_STYLE_LINUX_TREE;
  const isSidebarVisible = sidebarPinned || sidebarOpen;
  const [expandedSection, setExpandedSection] = useState(null);

  useEffect(() => {
    const activeSection = menu.sections.find((section) =>
      section.items.some((item) => isPathActive(location.pathname, item.path))
    );

    setExpandedSection(activeSection?.label ?? null);
  }, [location.pathname, menu.sections]);

  const expandSectionForPath = useCallback(
    (path) => {
      const sectionLabel = findSectionLabelForPath(menu, path);
      if (sectionLabel) {
        setExpandedSection(sectionLabel);
      }
    },
    [menu]
  );

  const openSidebar = () => {
    if (!sidebarPinned) {
      setSidebarOpen(true);
    }
  };

  const closeSidebar = () => {
    if (!sidebarPinned) {
      setSidebarOpen(false);
    }
  };

  const sidebarZoneRef = useRef(null);
  const sidebarSearchRef = useRef(null);
  const prevSidebarVisibleRef = useRef(null);

  useEffect(() => {
    if (prevSidebarVisibleRef.current === null) {
      prevSidebarVisibleRef.current = isSidebarVisible;
      return;
    }

    if (isSidebarVisible && !prevSidebarVisibleRef.current) {
      requestAnimationFrame(() => {
        sidebarSearchRef.current?.focus();
      });
    }

    prevSidebarVisibleRef.current = isSidebarVisible;
  }, [isSidebarVisible]);

  const handleSidebarZoneLeave = (event) => {
    if (sidebarPinned || !sidebarOpen) return;

    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && sidebarZoneRef.current?.contains(nextTarget)) {
      return;
    }

    setSidebarOpen(false);
  };

  return (
    <div className="app-shell flex flex-col h-screen w-full overflow-hidden">
      <div className="app-shell-bg pointer-events-none" aria-hidden="true">
        <div className="app-shell-orb app-shell-orb-1" />
        <div className="app-shell-orb app-shell-orb-2" />
        <div className="app-shell-orb app-shell-orb-3" />
      </div>

      <header className="app-shell-header">
        <div className="app-shell-header-inner">
          <div className="app-shell-header-start">
            <Link to="/dashboard" className="app-shell-brand">
              <span className="app-shell-brand-mark">
                <AppIcon size={44} className="h-11 w-11" />
              </span>
              <span className="app-shell-brand-copy">
                <span className="app-shell-brand-name">YORA ERP</span>
                <span className="app-shell-brand-tag">Resource Management System</span>
              </span>
            </Link>
          </div>

          {isAuthenticated ? (
            <div className="app-shell-header-center">
              <div className="app-shell-header-company" title={company?.company_name || "Your business"}>
                <span className="app-shell-header-company-icon" aria-hidden="true">
                  <i className="bi bi-building"></i>
                </span>
                <span className="app-shell-header-company-name">
                  {company?.company_name || "Your business"}
                </span>
              </div>
            </div>
          ) : (
            <div className="app-shell-header-center" aria-hidden="true" />
          )}

          {isAuthenticated && user ? (
            <div className="app-shell-header-end">
              <div className="app-shell-user-menu">
                <button
                  type="button"
                  className="app-shell-user-trigger"
                  title={user.name}
                  aria-label={`${user.name} account menu`}
                  aria-haspopup="menu"
                >
                  <span className="app-shell-user-avatar" aria-hidden="true">
                    {user.profilePic ? (
                      <img
                        src={user.profilePic}
                        alt=""
                        className="app-shell-user-avatar-image"
                      />
                    ) : (
                      userInitials
                    )}
                  </span>
                </button>

                <div className="app-shell-user-dropdown" role="menu">
                  <div className="app-shell-user-dropdown-header">
                    <p className="app-shell-user-dropdown-name">{user.name}</p>
                  </div>
                  <Link to="/clientprofile" className="app-shell-user-dropdown-item" role="menuitem">
                    <i className="bi bi-gear" aria-hidden="true"></i>
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="app-shell-user-dropdown-item app-shell-user-dropdown-item-danger"
                    role="menuitem"
                  >
                    <i className="bi bi-box-arrow-right" aria-hidden="true"></i>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="app-shell-header-end" aria-hidden="true" />
          )}
        </div>
      </header>

      <div className="relative z-10 flex flex-1 min-h-0">
        {isAuthenticated && (
          <>
            <div
              ref={sidebarZoneRef}
              className={`app-shell-sidebar-zone${
                sidebarPinned ? " app-shell-sidebar-zone-pinned" : " app-shell-sidebar-zone-unpinned"
              }${isSidebarVisible ? " app-shell-sidebar-zone-open" : ""}`}
              onMouseLeave={handleSidebarZoneLeave}
            >
              <div
                className={`app-shell-sidebar-wrap${
                  isSidebarVisible ? " app-shell-sidebar-wrap-open" : " app-shell-sidebar-wrap-closed"
                }`}
              >
                <aside
                  id="app-shell-sidebar"
                  className={`app-shell-sidebar flex h-full flex-col border-r border-sky-900/40${
                    isTreeMenu ? " app-shell-sidebar-tree" : ""
                  }`}
                >
                  <div className="app-shell-sidebar-toolbar">
                    <SidebarMenuSearch
                      ref={sidebarSearchRef}
                      menu={menu}
                      onNavigate={closeSidebar}
                      onSelectPath={expandSectionForPath}
                    />
                    <button
                      type="button"
                      className={`app-shell-sidebar-pin${
                        sidebarPinned ? " app-shell-sidebar-pin-active" : ""
                      }`}
                      onClick={onToggleSidebarPin}
                      title={sidebarPinned ? "Unpin menu" : "Pin menu open"}
                      aria-label={sidebarPinned ? "Unpin menu" : "Pin menu open"}
                      aria-pressed={sidebarPinned}
                    >
                      <i className={`bi ${sidebarPinned ? "bi-pin-fill" : "bi-pin"}`} aria-hidden="true"></i>
                    </button>
                  </div>
                  <nav className="min-h-0 flex-1 overflow-y-auto p-3">
                    {isTreeMenu ? (
                      <AppShellNavTree
                        menu={menu}
                        menuLoading={menuLoading}
                        onNavigate={closeSidebar}
                        expandedSection={expandedSection}
                        onExpandedSectionChange={setExpandedSection}
                      />
                    ) : (
                      <AppShellNavModern
                        menu={menu}
                        menuLoading={menuLoading}
                        onNavigate={closeSidebar}
                        expandedSection={expandedSection}
                        onExpandedSectionChange={setExpandedSection}
                      />
                    )}
                  </nav>
                </aside>
              </div>
              {!sidebarPinned && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen((open) => !open)}
                  onMouseEnter={() => {
                    if (!isSidebarVisible) {
                      openSidebar();
                    }
                  }}
                  className={`app-shell-sidebar-toggle${
                    isSidebarVisible ? " app-shell-sidebar-toggle-open" : " app-shell-sidebar-toggle-closed"
                  }`}
                  title={isSidebarVisible ? "Hide navigation" : "Show navigation"}
                  aria-expanded={isSidebarVisible}
                  aria-controls="app-shell-sidebar"
                >
                  {isSidebarVisible ? "<<" : ">>"}
                </button>
              )}
            </div>
          </>
        )}

        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6">
          <div
            className={`app-shell-content mx-auto w-full${isDashboard ? "" : " max-w-7xl"}`}
          >
            {children}
          </div>
        </main>
      </div>

      {isAuthenticated && (
        <SpotlightSearch variant="overlay" open={overlayOpen} onClose={closeOverlay} />
      )}
    </div>
  );
};

export default BasetemplateAi;

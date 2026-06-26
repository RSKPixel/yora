import React, { useContext, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import AuthContext from "./AuthContext";
import { appMenu, topLevelMenu } from "../config/appMenu";
import AppIcon from "../components/AppIcon";
import SpotlightSearch from "../components/SpotlightSearch";
import { SpotlightProvider, useSpotlight } from "./SpotlightContext";

const menu = appMenu;
const topLevel = topLevelMenu;

const navLinkClass = ({ isActive }) =>
  `app-shell-nav-item${isActive ? " app-shell-nav-item-active" : ""}`;

function getUserInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const BasetemplateAi = ({ children }) => {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <SpotlightProvider>
      <BasetemplateShell
        user={user}
        isAuthenticated={isAuthenticated}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onLogout={handleLogout}
      >
        {children}
      </BasetemplateShell>
    </SpotlightProvider>
  );
};

const BasetemplateShell = ({
  children,
  user,
  isAuthenticated,
  sidebarOpen,
  setSidebarOpen,
  onLogout,
}) => {
  const { overlayOpen, closeOverlay } = useSpotlight();
  const userInitials = useMemo(() => getUserInitials(user?.name), [user?.name]);

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
                <AppIcon size={36} className="h-9 w-9" />
              </span>
              <span className="app-shell-brand-copy">
                <span className="app-shell-brand-name">YORA ERP</span>
                <span className="app-shell-brand-tag">Resource Management System</span>
              </span>
            </Link>
          </div>

          <div className="app-shell-header-center" aria-hidden="true" />

          {isAuthenticated && user ? (
            <div className="app-shell-header-end">
              <div className="app-shell-user" title={user.name}>
                <span className="app-shell-user-avatar" aria-hidden="true">
                  {userInitials}
                </span>
                <span className="app-shell-user-name">{user.name}</span>
              </div>

              <div className="app-shell-header-actions">
                <Link to="/clientprofile" className="app-shell-header-icon-btn" title="Profile">
                  <i className="bi bi-gear"></i>
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  className="app-shell-header-icon-btn app-shell-header-icon-btn-danger"
                  title="Logout"
                >
                  <i className="bi bi-box-arrow-right"></i>
                </button>
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
              className={`app-shell-sidebar-wrap${sidebarOpen ? " app-shell-sidebar-wrap-open" : " app-shell-sidebar-wrap-closed"}`}
            >
              <aside
                id="app-shell-sidebar"
                className="app-shell-sidebar h-full w-64 border-r border-sky-900/40"
              >
                <nav className="h-full overflow-y-auto p-3 space-y-4">
                  <ul className="app-shell-nav-top space-y-0.5">
                    {Object.entries(topLevel).map(([name, { path, icon: itemIcon }]) => (
                      <li key={name}>
                        <NavLink
                          to={path}
                          className={navLinkClass}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <i className={`bi ${itemIcon} text-sm shrink-0`}></i>
                          <span className="truncate normal-case tracking-normal font-medium">
                            {name}
                          </span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>

                  {Object.entries(menu).map(([section, { icon, items }]) => (
                    <div
                      key={section}
                      className="rounded-xl border border-sky-900/50 bg-neutral-900/80 overflow-hidden backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-2 border-b border-sky-900/50 bg-sky-950/80 px-3 py-2">
                        <i className={`bi ${icon} text-sky-400 text-xs`}></i>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                          {section}
                        </span>
                      </div>
                      <ul className="p-1.5 space-y-0.5">
                        {Object.entries(items).map(([name, { path, icon: itemIcon }]) => (
                          <li key={name}>
                            <NavLink
                              to={path}
                              className={navLinkClass}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <i className={`bi ${itemIcon} text-sm shrink-0`}></i>
                              <span className="truncate normal-case tracking-normal font-medium">
                                {name}
                              </span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </nav>
              </aside>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className={`app-shell-sidebar-toggle${sidebarOpen ? " app-shell-sidebar-toggle-open" : " app-shell-sidebar-toggle-closed"}`}
              title={sidebarOpen ? "Hide navigation" : "Show navigation"}
              aria-expanded={sidebarOpen}
              aria-controls="app-shell-sidebar"
            >
              {sidebarOpen ? "<<" : ">>"}
            </button>
          </>
        )}

        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6">
          <div className="app-shell-content mx-auto w-full max-w-7xl">
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

import React, { useContext, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import AuthContext from "./AuthContext";

const menu = {
  Home: {
    icon: "bi-house",
    items: {
      Dashboard: { path: "/dashboard", icon: "bi-speedometer2" },
    },
  },
  Masters: {
    icon: "bi-database",
    items: {
      Inventory: { path: "/masters/inventory", icon: "bi-box" },
      Ledger: { path: "/masters/ledger", icon: "bi-journal-text" },
    },
  },
  Transactions: {
    icon: "bi-arrow-left-right",
    items: {
      "Purchase Order": { path: "/transactions/purchase-order", icon: "bi-clipboard-check" },
      Purchase: { path: "/transactions/purchase", icon: "bi-cart-plus" },
      Sales: { path: "/transactions/sales", icon: "bi-receipt" },
      "Credit Note": { path: "/transactions/creditnote", icon: "bi-file-earmark-minus" },
    },
  },
  Reports: {
    icon: "bi-bar-chart",
    items: {
      "Stock Position": { path: "/reports/stockposition", icon: "bi-boxes" },
      "Purchase Order Report": { path: "/reports/purchaseorder", icon: "bi-file-earmark-bar-graph" },
    },
  },
};

const navLinkClass = ({ isActive }) =>
  `app-shell-nav-item${isActive ? " app-shell-nav-item-active" : ""}`;

const BasetemplateAi = ({ children }) => {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell flex flex-col h-screen w-full overflow-hidden">
      <div className="app-shell-bg pointer-events-none" aria-hidden="true">
        <div className="app-shell-orb app-shell-orb-1" />
        <div className="app-shell-orb app-shell-orb-2" />
        <div className="app-shell-orb app-shell-orb-3" />
      </div>

      <header className="relative z-20 shrink-0 border-b border-sky-900/60 bg-sky-950/95 backdrop-blur-sm px-4 py-2.5">
        <div className="flex flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-900/60 border border-sky-700/50 transition-colors group-hover:border-sky-500/50">
              <i className="bi bi-box-seam text-lg text-sky-400"></i>
            </div>
            <div>
              <span className="block text-base font-bold tracking-wide text-white/95 leading-tight">
                YORA ERP
              </span>
              <span className="block text-[10px] text-white/40 normal-case tracking-normal">
                Your ERP Solution
              </span>
            </div>
          </Link>

          {isAuthenticated && user && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-50/95 px-3 py-1.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-400 border border-slate-200">
                  <i className="bi bi-person text-sm"></i>
                </span>
                <span className="text-sm font-medium text-slate-800 normal-case tracking-normal pr-1">
                  {user.name}
                </span>
              </div>
              <Link
                to="/clientprofile"
                className="app-shell-header-btn"
                title="Profile"
              >
                <i className="bi bi-gear"></i>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="app-shell-header-btn app-shell-header-btn-danger"
                title="Logout"
              >
                <i className="bi bi-box-arrow-right"></i>
              </button>
            </div>
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
                            <NavLink to={path} className={navLinkClass}>
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
    </div>
  );
};

export default BasetemplateAi;

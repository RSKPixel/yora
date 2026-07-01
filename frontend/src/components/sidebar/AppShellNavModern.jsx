import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { isPathActive, sidebarNavLinkClass } from "./sidebarNav";

const AppShellNavModern = ({
  menu,
  menuLoading,
  onNavigate,
  expandedSection,
  onExpandedSectionChange,
}) => {
  const location = useLocation();

  const toggleSection = (label) => {
    onExpandedSectionChange((current) => (current === label ? null : label));
  };

  return (
    <>
      {menu.topLevel.length > 0 && (
        <ul className="app-shell-nav-top space-y-0.5">
          {menu.topLevel.map(({ label, path, icon: itemIcon }) => (
            <li key={path}>
              <NavLink to={path} className={sidebarNavLinkClass} onClick={onNavigate}>
                <i className={`bi ${itemIcon} text-sm shrink-0`}></i>
                <span className="truncate normal-case tracking-normal font-medium">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}

      {menuLoading ? (
        <p className="px-2 text-xs text-slate-400">Loading navigation…</p>
      ) : (
        <div className="app-shell-modern-sections space-y-4">
          {menu.sections.map(({ label: section, icon, items }) => {
            const expanded = expandedSection === section;
            const sectionActive = items.some((item) =>
              isPathActive(location.pathname, item.path)
            );

            return (
              <div key={section} className="app-shell-modern-section">
                <button
                  type="button"
                  className={`app-shell-modern-section-header${
                    expanded ? " app-shell-modern-section-header-open" : ""
                  }${sectionActive ? " app-shell-modern-section-header-active" : ""}`}
                  onClick={() => toggleSection(section)}
                  aria-expanded={expanded}
                >
                  <i
                    className={`bi ${
                      expanded ? "bi-chevron-down" : "bi-chevron-right"
                    } app-shell-modern-section-chevron`}
                    aria-hidden="true"
                  ></i>
                  <i className={`bi ${icon} text-sky-400 text-xs shrink-0`} aria-hidden="true"></i>
                  <span className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    {section}
                  </span>
                </button>

                {expanded && (
                  <ul className="p-1.5 space-y-0.5">
                    {items.map(({ label, path, icon: itemIcon }) => (
                      <li key={path}>
                        <NavLink to={path} className={sidebarNavLinkClass} onClick={onNavigate}>
                          <i className={`bi ${itemIcon} text-sm shrink-0`}></i>
                          <span className="truncate normal-case tracking-normal font-medium">
                            {label}
                          </span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default AppShellNavModern;

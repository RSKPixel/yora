import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { isPathActive, sidebarTreeChildLinkClass, sidebarTreeLinkClass } from "./sidebarNav";

const AppShellNavTree = ({
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

  if (menuLoading) {
    return <p className="px-2 text-xs text-slate-400">Loading navigation…</p>;
  }

  return (
    <div className="app-shell-tree-root">
      {menu.topLevel.length > 0 && (
        <ul className="app-shell-tree-top">
          {menu.topLevel.map(({ label, path, icon }) => (
            <li key={path}>
              <NavLink to={path} className={sidebarTreeLinkClass} onClick={onNavigate}>
                <span className="app-shell-tree-link-icon" aria-hidden="true">
                  <i className={`bi ${icon}`}></i>
                </span>
                <span className="truncate">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}

      <ul className="app-shell-tree-groups">
        {menu.sections.map((section) => {
          const expanded = expandedSection === section.label;
          const sectionActive = section.items.some((item) =>
            isPathActive(location.pathname, item.path)
          );

          return (
            <li key={section.label} className="app-shell-tree-group">
              <button
                type="button"
                className={`app-shell-tree-group-header${
                  expanded ? " app-shell-tree-group-header-open" : ""
                }${sectionActive ? " app-shell-tree-group-header-active" : ""}`}
                onClick={() => toggleSection(section.label)}
                aria-expanded={expanded}
              >
                <i
                  className={`bi ${expanded ? "bi-chevron-down" : "bi-chevron-right"} app-shell-tree-chevron`}
                  aria-hidden="true"
                ></i>
                <span className="app-shell-tree-group-badge" aria-hidden="true">
                  <i className={`bi ${section.icon}`}></i>
                </span>
                <span className="truncate">{section.label}</span>
              </button>

              {expanded && (
                <ul className="app-shell-tree-group-children">
                  {section.items.map(({ label, path, icon }) => (
                    <li key={path}>
                      <NavLink
                        to={path}
                        className={sidebarTreeChildLinkClass}
                        onClick={onNavigate}
                      >
                        <i className={`bi ${icon} app-shell-tree-child-icon`} aria-hidden="true"></i>
                        <span className="truncate">{label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default AppShellNavTree;

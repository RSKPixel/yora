import React from "react";
import { NavLink } from "react-router-dom";
import { sidebarNavLinkClass } from "./sidebarNav";

const AppShellNavModern = ({ menu, menuLoading, onNavigate }) => {
  return (
    <>
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

      {menuLoading ? (
        <p className="px-2 text-xs text-slate-400">Loading navigation…</p>
      ) : (
        menu.sections.map(({ label: section, icon, items }) => (
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
              {items.map(({ label, path, icon: itemIcon }) => (
                <li key={path}>
                  <NavLink to={path} className={sidebarNavLinkClass} onClick={onNavigate}>
                    <i className={`bi ${itemIcon} text-sm shrink-0`}></i>
                    <span className="truncate normal-case tracking-normal font-medium">{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </>
  );
};

export default AppShellNavModern;

export const sidebarNavLinkClass = ({ isActive }) =>
  `app-shell-nav-item${isActive ? " app-shell-nav-item-active" : ""}`;

export const sidebarTreeLinkClass = ({ isActive }) =>
  `app-shell-tree-link app-shell-nav-item app-shell-tree-nav-item${
    isActive ? " app-shell-tree-nav-item-active" : ""
  }`;

export const sidebarTreeChildLinkClass = ({ isActive }) =>
  `app-shell-tree-link app-shell-nav-item app-shell-tree-child-link${
    isActive ? " app-shell-tree-nav-item-active" : ""
  }`;

export function isPathActive(pathname, itemPath) {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function findSectionLabelForPath(menu, path) {
  const section = (menu?.sections ?? []).find((entry) =>
    (entry.items ?? []).some((item) => item.path === path || isPathActive(path, item.path))
  );

  return section?.label ?? null;
}

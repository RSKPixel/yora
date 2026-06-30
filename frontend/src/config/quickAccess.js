import { flattenMenuItems } from "./appMenu";

export const DEFAULT_QUICK_ACCESS_PATHS = [
  "/transactions/purchase-order",
  "/transactions/purchase",
  "/transactions/sales",
  "/reports/stockposition",
];

export function resolveQuickAccessItems(paths, menuItems = flattenMenuItems()) {
  const byPath = new Map(menuItems.map((item) => [item.path, item]));
  return paths.map((path) => byPath.get(path)).filter(Boolean);
}

export function getAvailableQuickAccessItems(paths, menuItems = flattenMenuItems()) {
  const used = new Set(paths);
  return menuItems.filter((item) => item.path !== "/dashboard" && !used.has(item.path));
}

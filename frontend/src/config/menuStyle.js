export const MENU_STYLE_MODERN = "modern";
export const MENU_STYLE_LINUX_TREE = "linux_tree";
export const MENU_STYLE_STORAGE_KEY = "yora_menu_style";

export const MENU_STYLE_OPTIONS = [
  {
    id: MENU_STYLE_MODERN,
    label: "Modern",
    description: "Card-based sections with icons — the current sidebar design.",
  },
  {
    id: MENU_STYLE_LINUX_TREE,
    label: "Tree",
    description: "Collapsible groups with nested items and a subtle guide rail.",
  },
];

export function normalizeMenuStyle(value) {
  return value === MENU_STYLE_LINUX_TREE ? MENU_STYLE_LINUX_TREE : MENU_STYLE_MODERN;
}

export function readStoredMenuStyle() {
  if (typeof window === "undefined") return MENU_STYLE_MODERN;
  return normalizeMenuStyle(window.localStorage.getItem(MENU_STYLE_STORAGE_KEY));
}

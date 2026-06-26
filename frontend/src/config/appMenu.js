export const topLevelMenu = {
  Dashboard: { path: "/dashboard", icon: "bi-speedometer2" },
};

export const appMenu = {
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

function buildAbbreviation(label) {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return "";
  return words.map((word) => word[0]).join("").toLowerCase();
}

function getSearchWords(label, section, path) {
  const pathText = path.replace(/\//g, " ").replace(/-/g, " ");
  return `${label} ${section} ${pathText}`
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function tokenMatchesItem(token, item) {
  if (item.abbreviation) {
    if (token === item.abbreviation) return true;
    if (token.length >= 2 && item.abbreviation.startsWith(token)) return true;
  }

  const labelWords = item.label.toLowerCase().split(/\s+/).filter(Boolean);
  if (labelWords.some((word) => word === token)) return true;
  if (token.length >= 3 && labelWords.some((word) => word.startsWith(token))) return true;

  return item.searchWords.some((word) => word === token);
}

export function flattenMenuItems(menu = appMenu, topLevel = topLevelMenu) {
  const topItems = Object.entries(topLevel).map(([label, { path, icon }]) => {
    const abbreviation = buildAbbreviation(label);
    return {
      label,
      path,
      icon,
      section: "Main",
      sectionIcon: icon,
      abbreviation,
      searchWords: getSearchWords(label, "Main", path),
    };
  });

  const sectionItems = Object.entries(menu).flatMap(([section, { icon: sectionIcon, items }]) =>
    Object.entries(items).map(([label, { path, icon }]) => {
      const abbreviation = buildAbbreviation(label);
      return {
        label,
        path,
        icon,
        section,
        sectionIcon,
        abbreviation,
        searchWords: getSearchWords(label, section, path),
      };
    })
  );

  return [...topItems, ...sectionItems];
}

export function searchMenuItems(items, query) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return items;

  return items.filter((item) => tokens.every((token) => tokenMatchesItem(token, item)));
}

export function getSpotlightShortcutLabel() {
  if (typeof navigator === "undefined") return "Ctrl+K";
  return /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘K" : "Ctrl+K";
}

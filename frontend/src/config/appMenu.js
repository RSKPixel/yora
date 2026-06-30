export const DEFAULT_APP_MENU = {
  topLevel: [
    { label: "Dashboard", path: "/dashboard", icon: "bi-speedometer2" },
  ],
  sections: [
    {
      label: "Masters",
      icon: "bi-database",
      items: [
        { label: "Cost Center", path: "/masters/cost-center", icon: "bi-building" },
        { label: "Mould Master", path: "/masters/mould-master", icon: "bi-box-seam" },
        { label: "Machinery Master", path: "/masters/machinery-master", icon: "bi-gear-wide-connected" },
      ],
    },
    {
      label: "Transactions",
      icon: "bi-arrow-left-right",
      items: [
        { label: "Purchase Order", path: "/transactions/purchase-order", icon: "bi-clipboard-check" },
        { label: "Purchase", path: "/transactions/purchase", icon: "bi-cart-plus" },
        { label: "Sales", path: "/transactions/sales", icon: "bi-receipt" },
        { label: "Service Record", path: "/transactions/service-record", icon: "bi-wrench-adjustable" },
        { label: "Credit Note", path: "/transactions/creditnote", icon: "bi-file-earmark-minus" },
      ],
    },
    {
      label: "Stock Movement",
      icon: "bi-arrow-repeat",
      items: [
        { label: "Stock Journal", path: "/stock-movement/stock-journal", icon: "bi-journal-text" },
        { label: "Blowing", path: "/stock-movement/blowing", icon: "bi-wind" },
      ],
    },
    {
      label: "Reports",
      icon: "bi-bar-chart",
      items: [
        { label: "Stock Report", path: "/reports/stockposition", icon: "bi-boxes" },
        { label: "Stock Summary", path: "/reports/stocksummary", icon: "bi-pie-chart" },
        { label: "Purchase Order Report", path: "/reports/purchaseorder", icon: "bi-file-earmark-bar-graph" },
      ],
    },
  ],
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

export function flattenMenuItems(menu = DEFAULT_APP_MENU) {
  const topItems = (menu.topLevel ?? []).map(({ label, path, icon }) => {
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

  const sectionItems = (menu.sections ?? []).flatMap(({ label: section, icon: sectionIcon, items }) =>
    (items ?? []).map(({ label, path, icon }) => {
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

export function flattenSubMenuItems(menu = DEFAULT_APP_MENU) {
  return (menu.sections ?? []).flatMap(({ label: section, icon: sectionIcon, items }) =>
    (items ?? []).map(({ label, path, icon }) => {
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

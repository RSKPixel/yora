import { MENU_STYLE_MODERN, normalizeMenuStyle } from "./menuStyle";
import {
  ROOT_FONT_SIZE_DEFAULT,
  ROOT_FONT_SIZE_MAX,
  ROOT_FONT_SIZE_MIN,
  ROOT_FONT_SIZE_STEP,
  normalizeRootFontSize,
} from "./rootFontSize";

export const DASHBOARD_QUICK_ACCESS_VISIBLE_DEFAULT = true;
export const DASHBOARD_SEARCH_VISIBLE_DEFAULT = true;

export function defaultUserPreferences() {
  return {
    menu_style: MENU_STYLE_MODERN,
    root_font_size: ROOT_FONT_SIZE_DEFAULT,
    dashboard_quick_access_visible: DASHBOARD_QUICK_ACCESS_VISIBLE_DEFAULT,
    dashboard_search_visible: DASHBOARD_SEARCH_VISIBLE_DEFAULT,
  };
}

export function normalizeUserPreferences(data) {
  const defaults = defaultUserPreferences();

  const toBool = (value, fallback) => {
    if (value === true || value === false) return value;
    if (value === 1 || value === "1") return true;
    if (value === 0 || value === "0") return false;
    return fallback;
  };

  return {
    menu_style: normalizeMenuStyle(data?.menu_style ?? defaults.menu_style),
    root_font_size: normalizeRootFontSize(data?.root_font_size ?? defaults.root_font_size),
    dashboard_quick_access_visible: toBool(
      data?.dashboard_quick_access_visible,
      defaults.dashboard_quick_access_visible
    ),
    dashboard_search_visible: toBool(
      data?.dashboard_search_visible,
      defaults.dashboard_search_visible
    ),
  };
}

export function parseBooleanFormValue(value) {
  if (value === true || value === "true" || value === "1" || value === 1) {
    return true;
  }
  if (value === false || value === "false" || value === "0" || value === 0) {
    return false;
  }
  return null;
}

export {
  ROOT_FONT_SIZE_MIN,
  ROOT_FONT_SIZE_MAX,
  ROOT_FONT_SIZE_STEP,
  ROOT_FONT_SIZE_DEFAULT,
};
